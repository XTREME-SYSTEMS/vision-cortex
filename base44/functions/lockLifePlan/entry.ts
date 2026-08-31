import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// lockLifePlan — turns a loved simulation into an actionable, dated Life Plan.
// Creates a real Idea from the chosen strategy (so the build/launch pipeline can
// act on it), computes actual calendar dates for each simulated period, and
// persists a LifePlan with milestones, decision points (with the user's choices),
// life events, and the target final net worth. This is the bridge from "I love
// this simulation" to "I'm going to live it."

const HORIZON_CFG = {
  '1m': { unit: 'week' }, '3m': { unit: 'month' }, '6m': { unit: 'month' },
  '1y': { unit: 'month' }, '2y': { unit: 'quarter' }, '3y': { unit: 'quarter' },
  '5y': { unit: 'year' }, '10y': { unit: 'year' }, '15y': { unit: 'year' }, '20y': { unit: 'year' },
};

function addPeriod(startISO, unit, i) {
  const d = new Date(startISO);
  if (unit === 'week') d.setDate(d.getDate() + 7 * i);
  else if (unit === 'month') d.setMonth(d.getMonth() + i);
  else if (unit === 'quarter') d.setMonth(d.getMonth() + 3 * i);
  else if (unit === 'year') d.setFullYear(d.getFullYear() + i);
  return d.toISOString().slice(0, 10);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { vision, strategy, persona_id, horizon, simulation, choices } = body;
    if (!strategy?.title) return Response.json({ error: 'strategy required' }, { status: 400 });

    const sim = simulation || {};
    const cfg = HORIZON_CFG[horizon] || { unit: 'month' };
    const startISO = new Date().toISOString();
    const startDate = startISO.slice(0, 10);

    // Build dated milestones from the simulation timeline.
    const timeline = sim.timeline || [];
    const milestones = timeline.map((p, i) => ({
      date: addPeriod(startISO, cfg.unit, i + 1),
      label: p.label,
      target_net_worth: Math.round(p.net_worth || 0),
      target_p10: Math.round(p.net_worth_p10 ?? 0),
      target_p90: Math.round(p.net_worth_p90 ?? 0),
      event: p.event || '',
      decision_id: null,
    }));

    // Decision points with the user's chosen option (or the AI's recommendation).
    const userChoices = Array.isArray(choices) ? choices : [];
    const decisionPoints = (sim.decision_points || []).map((dp) => {
      const uc = userChoices.find((c) => c.id === dp.id);
      return {
        id: dp.id,
        date: addPeriod(startISO, cfg.unit, (timeline.findIndex((t) => t.label === dp.period_label) + 1) || 1),
        prompt: dp.prompt,
        chosen: uc?.choice || dp.ai_choice,
        options: dp.options || [],
        rationale: dp.rationale || '',
      };
    });

    // Target final net worth = the base scenario.
    const outcomes = sim.outcomes || [];
    const base = outcomes.find((o) => /base/i.test(o.scenario)) || outcomes[0] || {};
    const endDate = milestones.length ? milestones[milestones.length - 1].date : startDate;

    // Create a real Idea from the strategy so the build pipeline can act on it.
    const idea = await base44.entities.Idea.create({
      title: strategy.title,
      one_liner: strategy.one_liner,
      industry: strategy.archetype,
      problem: vision,
      solution: strategy.one_liner,
      launch_cost_usd: strategy.capital_required_usd,
      time_to_launch_days: strategy.time_to_profit_days,
      stage: 'strategized',
      discovered_by: 'destiny-life-sim',
    });

    const plan = await base44.entities.LifePlan.create({
      user_id: user.id,
      vision: String(vision || '').slice(0, 800),
      strategy: {
        title: strategy.title,
        one_liner: strategy.one_liner,
        archetype: strategy.archetype,
        capital_required_usd: strategy.capital_required_usd,
        time_to_profit_days: strategy.time_to_profit_days,
      },
      persona_id: persona_id || null,
      idea_id: idea.id,
      horizon,
      start_date: startDate,
      end_date: endDate,
      milestones,
      decision_points: decisionPoints,
      life_events: sim.life_events || [],
      target_final_net_worth: Math.round(base.final_net_worth || 0),
      calendar_synced: false,
      calendar_event_ids: [],
      reality_log: [],
      calibration_score: null,
      coach_enabled: true,
      status: 'active',
    });

    return Response.json({ life_plan_id: plan.id, idea_id: idea.id, plan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}