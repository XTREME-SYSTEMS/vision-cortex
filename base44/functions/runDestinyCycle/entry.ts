import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// runDestinyCycle — the 24/7 autonomous loop.
// Picks the top opportunity, runs a single combined pass:
//   forecast (simulate) + brand + website + content (build pack)
// Persists a Simulation record and brands the Idea, leaving it
// approval-ready. One LLM call, full cycle. See playbook ch.21/24.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { idea_id, horizon_days = 365 } = body;
    const core = base44.asServiceRole.integrations.Core;

    let idea = null;
    if (idea_id) idea = await base44.entities.Idea.get(idea_id).catch(() => null);
    if (!idea) {
      const ideas = await base44.entities.Idea.list('rank', 20);
      idea = (ideas || []).find((i) => !i.stage || i.stage === 'discovered' || i.stage === 'validated') || (ideas || [])[0];
    }
    if (!idea) return Response.json({ error: "No ideas to cycle" }, { status: 404 });

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
    const profile = profiles && profiles[0];

    const res = await core.InvokeLLM({
      prompt: `You are the Destiny Engine running an autonomous cycle. For this opportunity, produce BOTH a financial forecast AND a complete launch pack, tuned to the user's destiny profile.
IDEA: ${JSON.stringify({ title: idea.title, industry: idea.industry, one_liner: idea.one_liner, problem: idea.problem, solution: idea.solution, target_users: idea.target_users, est_monthly_profit_usd: idea.est_monthly_profit_usd, launch_cost_usd: idea.launch_cost_usd, probability_of_success: idea.probability_of_success })}
PROFILE: ${profile ? JSON.stringify({ vision_statement: profile.vision_statement, brand_aesthetic: profile.brand_aesthetic, brand_voice: profile.brand_voice, target_audience: profile.target_audience, goal: profile.goal }) : "n/a"}
HORIZON (days): ${horizon_days}

Return JSON:
{
  "forecast": [ { "day": <int>, "revenue": <num>, "cost": <num>, "profit": <num>, "cumulative": <num> } ],
  "metrics": { "total_revenue": <num>, "total_cost": <num>, "total_profit": <num>, "break_even_day": <num>, "roi_pct": <num> },
  "brand": { "brand_name": <str>, "tagline": <str>, "voice": <str>, "palette": [<hex> x4], "domain_suggestions": [<str> x5], "logo_concept": <str> },
  "website": { "headline": <str>, "subhead": <str>, "cta": <str>, "sections": [ { "title": <str>, "body": <str> } ], "social_proof": <str> },
  "content": [ { "day": <int 1-30>, "platform": <str>, "post": <str> } ]
}
Be realistic and conservative on finance; specific and market-native on brand/website/content.`,
      response_json_schema: {
        type: "object",
        properties: {
          forecast: { type: "array", items: { type: "object", properties: { day: { type: "number" }, revenue: { type: "number" }, cost: { type: "number" }, profit: { type: "number" }, cumulative: { type: "number" } } } },
          metrics: { type: "object", properties: { total_revenue: { type: "number" }, total_cost: { type: "number" }, total_profit: { type: "number" }, break_even_day: { type: "number" }, roi_pct: { type: "number" } } },
          brand: { type: "object", properties: { brand_name: { type: "string" }, tagline: { type: "string" }, voice: { type: "string" }, palette: { type: "array", items: { type: "string" } }, domain_suggestions: { type: "array", items: { type: "string" } }, logo_concept: { type: "string" } } },
          website: { type: "object", properties: { headline: { type: "string" }, subhead: { type: "string" }, cta: { type: "string" }, sections: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } } } }, social_proof: { type: "string" } } },
          content: { type: "array", items: { type: "object", properties: { day: { type: "number" }, platform: { type: "string" }, post: { type: "string" } } } },
        },
        required: ["forecast", "metrics", "brand", "website", "content"],
      },
    });

    // persist simulation
    const simulation = await base44.entities.Simulation.create({
      idea_id: idea.id,
      strategy_name: `${res?.brand?.brand_name || idea.title} — autonomous cycle`,
      horizon_days,
      assumptions: [],
      forecast: res?.forecast || [],
      metrics: res?.metrics || {},
      status: 'forecasted',
    });

    // brand the idea
    await base44.entities.Idea.update(idea.id, {
      branding: { ...(idea.branding || {}), ...res?.brand },
      stage: 'branded',
    });

    await base44.entities.AgentLog.create({
      agent_name: 'Destiny Engine',
      level: 'success',
      category: 'autonomous_cycle',
      message: `Autonomous cycle complete for "${idea.title}" → branded "${res?.brand?.brand_name}". Simulation + build pack ready for approval.`,
    });

    return Response.json({
      idea: { id: idea.id, title: idea.title },
      simulation_id: simulation.id,
      brand: res?.brand,
      metrics: res?.metrics,
      website: res?.website,
      content_count: (res?.content || []).length,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}