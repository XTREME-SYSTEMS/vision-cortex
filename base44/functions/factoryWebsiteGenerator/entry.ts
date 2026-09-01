import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { industry, sub_industry, business_name, brand_pack, competitor_research, target_audience } = project;

    if (!brand_pack) {
      return Response.json({ error: 'Brand pack not yet created. Select a logo first.' }, { status: 400 });
    }

    // ── Generate website architecture (pages, sections, theme tokens, PWA config) ──
    const websitePrompt = `You are a senior web architect and UX designer.
Business: ${business_name}
Industry: ${industry} / ${sub_industry}
Brand voice: ${brand_pack.voice || 'professional and approachable'}
Primary color: ${brand_pack.primary_color || '#0A0A0A'}
Accent color: ${brand_pack.accent_color || '#3B82F6'}
Target audience: ${target_audience || 'general'}
Competitor gaps to exploit: ${(competitor_research?.competitors || []).map(c => c.gap).join(', ') || 'better UX and content'}

Design a complete website architecture optimized for conversions and SEO. Return:

1. **Pages** — 5-8 pages (home, about, services, contact, blog, etc.). Each page needs a slug and a list of sections (hero, features, testimonials, CTA, FAQ, etc.).

2. **Theme tokens** — light mode AND dark mode color palettes using the brand colors. Provide exact hex values for: background, foreground, primary, primary-foreground, accent, accent-foreground, muted, muted-foreground, border, card.

3. **PWA config** — name, short_name, display mode, theme_color, background_color.

4. **Responsive strategy** — mobile-first breakpoints and key mobile considerations.

Return JSON:
{
  "pages": [{ "name": "Home", "slug": "/", "sections": ["hero", "features", ...] }],
  "theme_tokens": {
    "light": { "background": "#...", "foreground": "#...", ... },
    "dark": { "background": "#...", "foreground": "#...", ... }
  },
  "pwa": { "name": "...", "short_name": "...", "display": "standalone", "theme_color": "#...", "background_color": "#..." },
  "responsive_notes": "..."
}`;

    const websiteResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: websitePrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          pages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                sections: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          theme_tokens: {
            type: 'object',
            properties: {
              light: { type: 'object' },
              dark: { type: 'object' }
            }
          },
          pwa: { type: 'object' },
          responsive_notes: { type: 'string' }
        },
        required: ['pages', 'theme_tokens', 'pwa']
      }
    });

    const websiteConfig = {
      ...websiteResult,
      responsive: true,
      has_dark_mode: true
    };

    // ── Update project ──
    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      website_config: websiteConfig,
      stage: 'website_built'
    });

    return Response.json({
      project_id,
      website_config: websiteConfig
    });
  } catch (error) {
    console.error('factoryWebsiteGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}