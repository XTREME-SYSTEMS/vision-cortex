import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// simulateStrategy — the Simulation Engine.
// Turns a strategy + line-item assumptions into a horizon forecast
// (monthly buckets), computes metrics (revenue/cost/profit/break-even/ROI),
// and — given a reverse target — computes the required changes to hit it.
// See playbook ch.19.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { idea_id, strategy_name, horizon_days = 365, assumptions = [], reverse_target, simulation_id } = body;
    const core = base44.asServiceRole.integrations.Core;

    if (!strategy_name) return Response.json({ error: "strategy_name required" }, { status: 400 });

    let idea = null;
    if (idea_id) idea = await base44.entities.Idea.get(idea_id).catch(() => null);

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
    const profile = profiles && profiles[0];

    const res = await core.InvokeLLM({
      prompt: `You are the Simulation Engine for Vision Cortex. Forecast this strategy as a line-item financial model.
STRATEGY: ${strategy_name}
HORIZON (days): ${horizon_days}
IDEA: ${idea ? JSON.stringify({ title: idea.title, industry: idea.industry, est_monthly_profit_usd: idea.est_monthly_profit_usd, launch_cost_usd: idea.launch_cost_usd, time_to_launch_days: idea.time_to_launch_days, probability_of_success: idea.probability_of_success }) : "n/a"}
USER GOAL: ${profile ? JSON.stringify(profile.goal || {}) : "n/a"}
ASSUMPTIONS (line items): ${JSON.stringify(assumptions)}
${reverse_target ? `REVERSE TARGET: ${JSON.stringify(reverse_target)} — compute the required changes to assumptions to hit this target and whether it is feasible.` : ""}

Return JSON:
{
  "forecast": [ { "day": <int>, "revenue": <num>, "cost": <num>, "profit": <num>, "cumulative": <num> } ],  // monthly buckets at day 30,60,...,horizon
  "metrics": { "total_revenue": <num>, "total_cost": <num>, "total_profit": <num>, "break_even_day": <num>, "roi_pct": <num> },
  "assumptions_used": [ { "name": <str>, "value": <num>, "unit": <str>, "impact": <str> } ],
  "reverse_required_changes": [ <str> ],   // only if reverse_target given
  "reverse_feasible": <bool>
}
Be realistic and conservative. Every assumption is a line item with downstream financial impact.`,
      response_json_schema: {
        type: "object",
        properties: {
          forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                revenue: { type: "number" },
                cost: { type: "number" },
                profit: { type: "number" },
                cumulative: { type: "number" },
              },
            },
          },
          metrics: {
            type: "object",
            properties: {
              total_revenue: { type: "number" },
              total_cost: { type: "number" },
              total_profit: { type: "number" },
              break_even_day: { type: "number" },
              roi_pct: { type: "number" },
            },
          },
          assumptions_used: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" },
                unit: { type: "string" },
                impact: { type: "string" },
              },
            },
          },
          reverse_required_changes: { type: "array", items: { type: "string" } },
          reverse_feasible: { type: "boolean" },
        },
        required: ["forecast", "metrics"],
      },
    });

    const sim = {
      idea_id: idea_id || null,
      strategy_name,
      horizon_days,
      assumptions: res?.assumptions_used || assumptions,
      forecast: res?.forecast || [],
      metrics: res?.metrics || {},
      reverse_target: reverse_target || null,
      reverse_required_changes: res?.reverse_required_changes || [],
      reverse_feasible: res?.reverse_feasible ?? null,
      status: reverse_target ? "reversed" : "forecasted",
    };

    let record;
    if (simulation_id) {
      record = await base44.entities.Simulation.update(simulation_id, sim);
    } else {
      record = await base44.entities.Simulation.create(sim);
    }
    return Response.json({ simulation: record });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}