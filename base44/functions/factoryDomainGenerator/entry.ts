import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id } = body;

    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const businessName = project.business_name;
    if (!businessName) return Response.json({ error: 'Select or create a business name first' }, { status: 400 });

    const prompt = `You are a domain naming expert. Given the business name "${businessName}" in the ${project.industry} / ${project.sub_industry} industry, generate 10 available-looking domain name options.
Return ONLY a JSON object: { "domain_options": ["domain1.com", "domain2.com", ...] }
Rules:
- Prefer .com, but include 1-2 .co or .ai if they fit the brand
- Keep it short, memorable, brandable
- No hyphens unless necessary
- Lowercase only`;

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          domain_options: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["domain_options"]
      }
    });

    const domainOptions = (llmRes as any).domain_options || [];

    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      domain_options: domainOptions
    });

    return Response.json({ domain_options: domainOptions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}