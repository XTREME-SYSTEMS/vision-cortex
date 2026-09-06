import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.com/graphql/v2';

async function railwayFetch(token, query, variables) {
  const res = await fetch(RAILWAY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error(`Railway API error: ${JSON.stringify(data.errors)}`);
  }
  return data.data;
}

function parseRepoUrl(url) {
  const match = String(url).match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (match) return `${match[1]}/${match[2].replace(/\.git$/, '')}`;
  return url;
}

// Provisions a Railway v2 container from a GitHub repo for a clone deployment.
// Falls back to simulation mode when no Railway management token is configured.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectName, githubRepoUrl, branch, environmentVariables, projectId: existingProjectId } = body;

    if (!projectName || !githubRepoUrl) {
      return Response.json({ error: 'projectName and githubRepoUrl are required' }, { status: 400 });
    }

    const token = secrets.get('RAILWAY_TOKEN') || secrets.get('RAILWAY_MANAGEMENT_TOKEN');

    // Fallback to simulation mode if token is missing
    if (!token) {
      return Response.json({
        serviceId: `srv_sim_${Math.random().toString(36).substring(7)}`,
        deploymentId: `dep_sim_${Math.random().toString(36).substring(7)}`,
        liveUrl: `https://${projectName}-simulated.up.railway.app`,
        status: 'INITIALIZED',
        simulated: true,
        message: 'No Railway management token set — running in simulation mode'
      });
    }

    const repo = parseRepoUrl(githubRepoUrl);

    // 1. Create project (or reuse existing)
    let projectId = existingProjectId;
    if (!projectId) {
      const pc = await railwayFetch(token, `
        mutation projectCreate($input: ProjectCreateInput!) {
          projectCreate(input: $input) { id name }
        }
      `, { input: { name: projectName } });
      projectId = pc.projectCreate.id;
    }

    // 2. Resolve the default environment
    const proj = await railwayFetch(token, `
      query project($id: String!) {
        project(id: $id) {
          environments { edges { node { id name } } }
        }
      }
    `, { id: projectId });

    const envEdges = proj.project.environments.edges;
    if (!envEdges || envEdges.length === 0) {
      throw new Error('No environments found in project');
    }
    const environmentId = envEdges[0].node.id;

    // 3. Create service from GitHub repo
    const svc = await railwayFetch(token, `
      mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name }
      }
    `, {
      input: {
        projectId,
        name: `${projectName}-backend-engine`,
        source: { repo },
        branch: branch || 'main'
      }
    });
    const serviceId = svc.serviceCreate.id;

    // 4. Inject environment variables
    const vars = environmentVariables || {};
    if (Object.keys(vars).length > 0) {
      await railwayFetch(token, `
        mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
          variableCollectionUpsert(input: $input)
        }
      `, {
        input: {
          projectId,
          environmentId,
          serviceId,
          variables: vars,
          replace: false
        }
      });
    }

    // 5. Trigger deployment (non-fatal: project+service are provisioned even if deploy fails)
    let deploymentId = 'DEPLOY_INIT';
    let status = 'ACTIVE';
    let warning = null;
    try {
      const deploy = await railwayFetch(token, `
        mutation serviceInstanceDeployV2($serviceId: String!, $environmentId: String!) {
          serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
        }
      `, { serviceId, environmentId });
      deploymentId = deploy.serviceInstanceDeployV2 || 'DEPLOY_INIT';
    } catch (deployErr) {
      status = 'INITIALIZED';
      deploymentId = 'DEPLOY_FAILED';
      warning = deployErr.message;
    }

    return Response.json({
      serviceId,
      deploymentId,
      liveUrl: `https://${projectName}.up.railway.app`,
      projectId,
      environmentId,
      status,
      simulated: false,
      warning
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}