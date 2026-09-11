import { createClientFromRequest } from '../../runtime/index';

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
    const msg = e?.message || String(e);
    // If the LLM rejected the response schema, retry once without the strict schema
    if (msg.includes("400") && !body._retried) {
      try {
        const core = base44.asServiceRole.integrations.Core;
        const res = await core.InvokeLLM({
          prompt: `You are the Simulation Engine. Forecast this strategy as a line-item financial model. Return JSON only.
STRATEGY: ${body.strategy_name || "Untitled"}
HORIZON (days): ${body.horizon_days || 365}
ASSUMPTIONS: ${JSON.stringify(body.assumptions || [])}
Return: {"forecast":[{"day":30,"revenue":0,"cost":0,"profit":0,"cumulative":0}],"metrics":{"total_revenue":0,"total_cost":0,"total_profit":0,"break_even_day":0,"roi_pct":0}}`,
        });
        const parsed = typeof res === "string" ? JSON.parse(res) : res;
        const sim = {
          idea_id: body.idea_id || null,
          strategy_name: body.strategy_name || "Untitled",
          horizon_days: body.horizon_days || 365,
          assumptions: body.assumptions || [],
          forecast: parsed?.forecast || [],
          metrics: parsed?.metrics || {},
          reverse_target: body.reverse_target || null,
          reverse_required_changes: [],
          reverse_feasible: null,
          status: body.reverse_target ? "reversed" : "forecasted",
        };
        const record = await base44.entities.Simulation.create(sim);
        return Response.json({ simulation: record });
      } catch (e2) {
        return Response.json({ error: `Simulation failed: ${e2?.message || e2}` }, { status: 500 });
      }
    }
    return Response.json({ error: `Simulation failed: ${msg}` }, { status: 500 });
  }
}