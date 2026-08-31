import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// runMarketer — the Marketer agent.
// Two modes:
//   1) Generate a 30-day autonomous distribution campaign for an
//      approved/launched brand (platform-native posts).
//   2) Ingest a revenue signal and write a Doctrine capturing the
//      winning pattern — the revenue-to-doctrine feedback loop.
// See playbook ch.21 / ch.36.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { build_id, idea_id, revenue_signal } = body;
    const core = base44.asServiceRole.integrations.Core;

    let idea = null;
    if (idea_id) idea = await base44.entities.Idea.get(idea_id).catch(() => null);
    else if (build_id) {
      const bq = await base44.entities.BuildQueue.get(build_id).catch(() => null);
      if (bq?.idea_id) idea = await base44.entities.Idea.get(bq.idea_id).catch(() => null);
      if (bq && !idea) idea = { id: null, title: bq.title, industry: bq.industry, branding: {}, target_users: '' };
    }
    if (!idea) return Response.json({ error: "Idea/build not found" }, { status: 404 });

    // ── Mode 2: revenue → doctrine feedback loop ──────────────
    if (revenue_signal) {
      const doctrine = await base44.entities.Doctrine.create({
        topic: `Marketer signal — ${idea.branding?.brand_name || idea.title}`,
        insight: revenue_signal.insight ||
          `Revenue event of $${revenue_signal.amount} logged. Winning pattern: ${revenue_signal.pattern || 'content-led acquisition'}. Compounding into doctrine.`,
        category: 'tactic',
        source: 'marketer',
        confidence: revenue_signal.confidence ?? 0.7,
        weight: 1,
        validated: false,
        validation_count: 0,
      });
      await base44.entities.AgentLog.create({
        agent_name: 'Marketer',
        level: 'success',
        category: 'revenue_loop',
        message: `Revenue signal $${revenue_signal.amount} → doctrine logged for ${idea.branding?.brand_name || idea.title}.`,
      });
      return Response.json({ doctrine, status: 'doctrine_logged' });
    }

    // ── Mode 1: generate campaign ─────────────────────────────
    const res = await core.InvokeLLM({
      prompt: `You are the Marketer agent for Vision Cortex. Turn this approved brand into a 30-day autonomous distribution campaign.
BRAND: ${JSON.stringify({ name: idea.branding?.brand_name || idea.title, tagline: idea.branding?.tagline, voice: idea.branding?.voice, viral_hooks: idea.branding?.viral_hooks || [] })}
INDUSTRY: ${idea.industry}
TARGET USERS: ${idea.target_users || 'general'}

Return JSON: { "campaign": [ { "day": <int 1-30>, "platform": <X|LinkedIn|TikTok|Instagram|Reddit>, "hook": <str>, "post": <str>, "goal": <str> } ] }
Each post must be platform-native, concrete, and designed to compound reach. Vary platforms across the 30 days.`,
      response_json_schema: {
        type: "object",
        properties: {
          campaign: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                platform: { type: "string" },
                hook: { type: "string" },
                post: { type: "string" },
                goal: { type: "string" },
              },
            },
          },
        },
        required: ["campaign"],
      },
    });

    return Response.json({
      campaign: res?.campaign || [],
      idea: { id: idea.id, title: idea.title, brand: idea.branding?.brand_name || idea.title },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}