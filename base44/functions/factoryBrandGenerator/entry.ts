import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id, regenerate } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { industry, sub_industry, business_name, competitor_research } = project;

    // ── Generate 10 logo prompts ──
    const logoPromptStrategy = `You are a world-class brand designer.
Business: ${business_name || 'a ' + sub_industry + ' business'}
Industry: ${industry}
Sub-industry: ${sub_industry}
Competitor gaps: ${(competitor_research?.competitors || []).map(c => c.gap).join(', ') || 'differentiation'}

Generate 10 DISTINCT logo design prompts for an AI image generator. Each must be:
- A different visual style (minimalist, geometric, lettermark, mascot, emblem, wordmark, abstract, gradient, 3D, hand-drawn)
- On a transparent or pure white background
- Professional, scalable, modern
- Specific enough for high-quality generation (describe shapes, colors, composition)

Return JSON: { "logos": [{ "prompt": "...", "style": "minimalist" }, ...] }`;

    const logoResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: logoPromptStrategy,
      response_json_schema: {
        type: 'object',
        properties: {
          logos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                style: { type: 'string' }
              }
            }
          }
        },
        required: ['logos']
      }
    });

    // ── Generate all 10 logo images ──
    const logoPromises = logoResult.logos.map(async (logo, i) => {
      try {
        const imgResult = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `${logo.prompt}. Transparent background, clean, professional logo, high resolution, vector-style.`
        });
        return {
          url: imgResult.url,
          prompt: logo.prompt,
          style: logo.style
        };
      } catch (e) {
        return null;
      }
    });

    const logos = (await Promise.all(logoPromises)).filter(l => l !== null);

    // ── Update project ──
    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      logos,
      selected_logo_index: -1,
      stage: 'branded'
    });

    return Response.json({
      project_id,
      logos
    });
  } catch (error) {
    console.error('factoryBrandGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}