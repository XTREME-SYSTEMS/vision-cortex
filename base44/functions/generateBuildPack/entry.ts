import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// generateBuildPack — the Build Approvals generator.
// Turns an approved opportunity into a complete launch pack:
//   brand (name, tagline, palette, domains, logo concept)
//   website (headline, subhead, sections, CTA, social proof, FAQ)
//   content (30-day social schedule)
//   hero image (AI-generated, brand-tuned)
// Persists the brand onto the Idea and returns the pack for approval.
// See playbook ch.20.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { idea_id, generate_hero = true } = body;
    if (!idea_id) return Response.json({ error: "idea_id required" }, { status: 400 });
    const core = base44.asServiceRole.integrations.Core;

    const idea = await base44.entities.Idea.get(idea_id).catch(() => null);
    if (!idea) return Response.json({ error: "Idea not found" }, { status: 404 });

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
    const profile = profiles && profiles[0];

    const pack = await core.InvokeLLM({
      prompt: `You are the Build Pack generator for Vision Cortex. Produce a complete launch pack for this opportunity, tuned to the user's destiny profile.
IDEA: ${JSON.stringify({ title: idea.title, industry: idea.industry, one_liner: idea.one_liner, problem: idea.problem, solution: idea.solution, target_users: idea.target_users, branding: idea.branding || {} })}
PROFILE: ${profile ? JSON.stringify({ vision_statement: profile.vision_statement, brand_aesthetic: profile.brand_aesthetic, brand_voice: profile.brand_voice, target_audience: profile.target_audience }) : "n/a"}

Return JSON:
{
  "brand": { "brand_name": <str>, "tagline": <str>, "voice": <str>, "palette": [<hex> x4], "domain_suggestions": [<str> x5], "logo_concept": <str> },
  "website": { "headline": <str>, "subhead": <str>, "cta": <str>, "sections": [ { "title": <str>, "body": <str> } ], "social_proof": <str>, "faq": [ { "q": <str>, "a": <str> } ] },
  "content": [ { "day": <int 1-30>, "platform": <str>, "post": <str> } ]
}
Use real, specific market language. The website must speak to the target user's pain. The 30-day content schedule must be platform-specific (X, LinkedIn, TikTok, Instagram) and concrete.`,
      response_json_schema: {
        type: "object",
        properties: {
          brand: {
            type: "object",
            properties: {
              brand_name: { type: "string" },
              tagline: { type: "string" },
              voice: { type: "string" },
              palette: { type: "array", items: { type: "string" } },
              domain_suggestions: { type: "array", items: { type: "string" } },
              logo_concept: { type: "string" },
            },
          },
          website: {
            type: "object",
            properties: {
              headline: { type: "string" },
              subhead: { type: "string" },
              cta: { type: "string" },
              sections: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } } } },
              social_proof: { type: "string" },
              faq: { type: "array", items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } } } },
            },
          },
          content: {
            type: "array",
            items: {
              type: "object",
              properties: { day: { type: "number" }, platform: { type: "string" }, post: { type: "string" } },
            },
          },
        },
        required: ["brand", "website", "content"],
      },
    });

    let hero_url = null;
    if (generate_hero && pack?.brand) {
      try {
        const img = await core.GenerateImage({
          prompt: `Modern minimalist hero illustration for a brand called "${pack.brand.brand_name}", ${idea.industry} industry, brand palette ${pack.brand.palette?.join(", ")}, clean professional, no text, no words`,
        });
        hero_url = img?.url || null;
      } catch { /* image optional */ }
    }

    await base44.entities.Idea.update(idea_id, {
      branding: { ...(idea.branding || {}), ...pack.brand },
      stage: "branded",
    });

    return Response.json({ brand: pack.brand, website: pack.website, content: pack.content, hero_url });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}