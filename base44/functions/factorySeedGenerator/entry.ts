import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { industry, sub_industry, project_id, regenerate } = body;

    if (!industry || !sub_industry) {
      return Response.json({ error: 'industry and sub_industry are required' }, { status: 400 });
    }

    // ── Generate name, domain, location, and target audience candidates ──
    const seedPrompt = `You are a brand strategist and lead-generation expert.
Industry: ${industry}
Sub-industry / niche: ${sub_industry}

Generate the following for a new business in this space:

1. **10 business name candidates** — memorable, brandable, available-looking. Mix modern one-word names, compound names, and descriptive names. Avoid names that sound like existing major brands.

2. **10 domain URL candidates** — .com preferred, then .co, .io, .ai for tech. Short, clean, no hyphens. Match the name candidates where possible.

3. **10 target locations** — cities or regions where this sub-industry has high demand and moderate competition. Rank by opportunity score (demand vs competition). Include a mix of major metros and underserved mid-size cities.

4. **1 detailed ideal customer profile (ICP)** for lead generation — demographics, psychographics, pain points, buying triggers, where they hang out online, and what content they engage with. Be specific and actionable.

Return JSON with this exact schema:
{
  "name_options": ["name1", "name2", ...],
  "domain_options": ["domain1.com", "domain2.com", ...],
  "target_locations": ["City, ST", "City, ST", ...],
  "target_audience": "Detailed ICP paragraph..."
}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: seedPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          name_options: { type: 'array', items: { type: 'string' } },
          domain_options: { type: 'array', items: { type: 'string' } },
          target_locations: { type: 'array', items: { type: 'string' } },
          target_audience: { type: 'string' }
        },
        required: ['name_options', 'domain_options', 'target_locations', 'target_audience']
      }
    });

    const seed = llmResponse;

    // ── Persist to FactoryProject ──
    let project;
    if (project_id && !regenerate) {
      project = await base44.asServiceRole.entities.FactoryProject.update(project_id, {
        name_options: seed.name_options,
        domain_options: seed.domain_options,
        target_locations: seed.target_locations,
        target_audience: seed.target_audience,
        stage: 'seeded'
      });
    } else {
      project = await base44.asServiceRole.entities.FactoryProject.create({
        industry,
        sub_industry,
        name_options: seed.name_options,
        domain_options: seed.domain_options,
        target_locations: seed.target_locations,
        target_audience: seed.target_audience,
        stage: 'seeded'
      });
    }

    return Response.json({
      project_id: project.id,
      industry,
      sub_industry,
      name_options: seed.name_options,
      domain_options: seed.domain_options,
      target_locations: seed.target_locations,
      target_audience: seed.target_audience
    });
  } catch (error) {
    console.error('factorySeedGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}