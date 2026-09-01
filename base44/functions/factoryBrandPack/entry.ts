import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id, logo_index, accent_color_override } = body;

    if (!project_id) return Response.json({ error: 'project_id is required' }, { status: 400 });
    if (logo_index === undefined) return Response.json({ error: 'logo_index is required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const selectedLogo = project.logos?.[logo_index];
    if (!selectedLogo) return Response.json({ error: 'Logo not found at index' }, { status: 400 });

    // ── Generate brand pack inspired by the selected logo ──
    const brandPrompt = `You are a brand identity designer.
Business: ${project.business_name || project.sub_industry}
Industry: ${project.industry} / ${project.sub_industry}
Logo style: ${selectedLogo.style}
Logo prompt: ${selectedLogo.prompt}
Target audience: ${project.target_audience || 'general'}

Based on the selected logo's style and the business context, create a complete brand pack:

1. **Color palette** — primary, accent, background, text colors as hex values. The palette should feel cohesive with the logo's style. ${accent_color_override ? `The user wants the accent color to be ${accent_color_override} — build the palette around that.` : ''}

2. **Typography** — heading font and body font (use Google Fonts names). Match the logo's personality.

3. **Brand voice** — 2-3 sentences describing the tone, personality, and communication style.

4. **Tagline** — one memorable line.

5. **Brand story** — 3-4 sentence origin/purpose narrative.

Return JSON:
{
  "primary_color": "#hex",
  "accent_color": "#hex",
  "background_color": "#hex",
  "text_color": "#hex",
  "font_heading": "Font Name",
  "font_body": "Font Name",
  "voice": "...",
  "tagline": "...",
  "brand_story": "..."
}`;

    const brandResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: brandPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          primary_color: { type: 'string' },
          accent_color: { type: 'string' },
          background_color: { type: 'string' },
          text_color: { type: 'string' },
          font_heading: { type: 'string' },
          font_body: { type: 'string' },
          voice: { type: 'string' },
          tagline: { type: 'string' },
          brand_story: { type: 'string' }
        },
        required: ['primary_color', 'accent_color', 'background_color', 'text_color', 'font_heading', 'font_body', 'voice', 'tagline', 'brand_story']
      }
    });

    const brandPack = {
      ...brandResult,
      logo_url: selectedLogo.url
    };

    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      selected_logo_index: logo_index,
      brand_pack: brandPack
    });

    return Response.json({
      project_id,
      brand_pack: brandPack
    });
  } catch (error) {
    console.error('factoryBrandPack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}