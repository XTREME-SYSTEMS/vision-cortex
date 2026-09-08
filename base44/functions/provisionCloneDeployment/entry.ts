import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// ============================================================================
// provisionCloneDeployment — multi-target provisioning
// ============================================================================
// Provisions the cloned system to:
//   - Supabase (database + auth)
//   - Vercel (frontend deployment + URL)
//   - Google Drive (file organization)
//   - Git (repository creation + push)
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { template_id, job_id, targets = {} } = body;
    if (!template_id && !job_id) return Response.json({ error: 'template_id or job_id required' }, { status: 400 });

    const template = template_id
      ? await base44.asServiceRole.entities.CloneTemplate.get(template_id)
      : null;
    const job = job_id
      ? await base44.asServiceRole.entities.CloneJob.get(job_id)
      : null;

    const name = template?.name || job?.site_name || `clone-${Date.now()}`;
    const results = { supabase: null, vercel: null, drive: null, git: null };
    const logs = [];

    // Update job status
    if (job_id) {
      await base44.asServiceRole.entities.CloneJob.update(job_id, {
        status: 'provisioning',
        provision_status: 'provisioning',
      });
    }

    // ----------------------------------------------------------------
    // SUPABASE
    // ----------------------------------------------------------------
    if (targets.supabase) {
      logs.push('Provisioning Supabase database...');
      try {
        const supaRes = await base44.asServiceRole.functions.invoke('provisionSupabase', {
          project_name: name,
          template_id,
        });
        const d = supaRes.data || supaRes;
        results.supabase = {
          enabled: true,
          url: d.url || d.database_url || '',
          key: d.key || d.anon_key || '',
          status: d.error ? 'failed' : 'provisioned',
          error: d.error || null,
        };
        logs.push(`Supabase: ${results.supabase.status}`);
      } catch (e) {
        results.supabase = { enabled: true, status: 'failed', error: e.message };
        logs.push(`Supabase failed: ${e.message}`);
      }
    }

    // ----------------------------------------------------------------
    // VERCEL
    // ----------------------------------------------------------------
    if (targets.vercel) {
      logs.push('Provisioning Vercel deployment...');
      try {
        const vercelRes = await base44.asServiceRole.functions.invoke('provisionVercel', {
          project_name: name,
          template_id,
        });
        const d = vercelRes.data || vercelRes;
        results.vercel = {
          enabled: true,
          url: d.url || d.deployment_url || '',
          project_id: d.project_id || d.id || '',
          status: d.error ? 'failed' : 'provisioned',
          error: d.error || null,
        };
        logs.push(`Vercel: ${results.vercel.status} — ${results.vercel.url || 'pending'}`);
      } catch (e) {
        results.vercel = { enabled: true, status: 'failed', error: e.message };
        logs.push(`Vercel failed: ${e.message}`);
      }
    }

    // ----------------------------------------------------------------
    // GOOGLE DRIVE
    // ----------------------------------------------------------------
    if (targets.drive) {
      logs.push('Organizing files in Google Drive...');
      try {
        const driveRes = await base44.asServiceRole.functions.invoke('driveOrganizer', {
          folder_name: name,
          template_id,
        });
        const d = driveRes.data || driveRes;
        results.drive = {
          enabled: true,
          folder_id: d.folder_id || d.id || '',
          status: d.error ? 'failed' : 'provisioned',
          error: d.error || null,
        };
        logs.push(`Drive: ${results.drive.status}`);
      } catch (e) {
        results.drive = { enabled: true, status: 'failed', error: e.message };
        logs.push(`Drive failed: ${e.message}`);
      }
    }

    // ----------------------------------------------------------------
    // GIT — create repository via GitHub API
    // ----------------------------------------------------------------
    if (targets.git) {
      logs.push('Creating Git repository...');
      try {
        const githubToken = secrets.get('GITHUB_TOKEN') || '';
        if (!githubToken) {
          results.git = { enabled: true, status: 'failed', error: 'GITHUB_TOKEN secret not set' };
          logs.push('Git failed: GITHUB_TOKEN not set');
        } else {
          const repoName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').substring(0, 50);
          const createRes = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({
              name: repoName,
              description: `Cloned from ${template?.source_url || job?.target_url || 'unknown'} via Vision Cortex DEEP Clone Factory`,
              private: true,
              auto_init: true,
            }),
          });
          if (createRes.ok) {
            const repo = await createRes.json();
            results.git = {
              enabled: true,
              repo_url: repo.html_url,
              clone_url: repo.clone_url,
              status: 'provisioned',
            };
            logs.push(`Git: provisioned — ${repo.html_url}`);
          } else {
            const errData = await createRes.json().catch(() => ({}));
            results.git = { enabled: true, status: 'failed', error: errData.message || `HTTP ${createRes.status}` };
            logs.push(`Git failed: ${results.git.error}`);
          }
        }
      } catch (e) {
        results.git = { enabled: true, status: 'failed', error: e.message };
        logs.push(`Git failed: ${e.message}`);
      }
    }

    // Update job + template
    const allProvisioned = Object.values(results).filter(r => r).every(r => r.status === 'provisioned');
    if (job_id) {
      await base44.asServiceRole.entities.CloneJob.update(job_id, {
        provision_targets: results,
        provision_status: allProvisioned ? 'provisioned' : 'failed',
        status: allProvisioned ? 'completed' : 'provisioning',
        logs: [...(job?.logs || []), ...logs],
      });
    }
    if (template_id) {
      await base44.asServiceRole.entities.CloneTemplate.update(template_id, {
        provisioned: allProvisioned,
      });
    }

    return Response.json({
      status: allProvisioned ? 'success' : 'partial',
      results,
      logs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}