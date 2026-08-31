import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// trackReality — the calibration engine. Compares what actually happened to what
// the simulation predicted, computes a running calibration score (Brier-style mean
// squared error of the normalized net-worth predictions), flags off-track plans,
// and optionally recalibrates the forward projection by re-running simulateLife
// with the actuals anchored. This is what closes the loop: simulate → live →
// measure → recalibrate, so the system gets more accurate the longer you use it.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const planId = body.life_plan_id;
    if (!planId) return Response.json({ error: 'life_plan_id required' }, { status: 400 });

    const plan = await base44.entities.LifePlan.get(planId).catch(() => null);
    if (!plan) return Response.json({ error: 'Life plan not found' }, { status: 404 });

    // New reality entry: { date, actual_net_worth, note }
    const entry = body.actual ? {
      date: body.actual.date || new Date().toISOString().slice(0, 10),
      actual_net_worth: Number(body.actual.actual_net_worth) || 0,
      note: body.actual.note || '',
    } : null;

    let realityLog = Array.isArray(plan.reality_log) ? [...plan.reality_log] : [];
    if (entry) {
      // Find the nearest milestone to compute expected + variance.
      const expected = (plan.milestones || [])
        .filter((m) => m.date && m.date <= entry.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.target_net_worth || 0;
      entry.expected_net_worth = expected;
      entry.variance = entry.actual_net_worth - expected;
      realityLog.push(entry);
    }

    // Calibration score: mean squared error of normalized predictions across all
    // logged entries. Lower = better calibrated. 0 = perfect. We normalize by the
    // max absolute expected value to keep it scale-free.
    let calibrationScore = plan.calibration_score ?? null;
    if (realityLog.length) {
      const maxAbs = Math.max(...realityLog.map((r) => Math.abs(r.expected_net_worth || 1)), 1);
      const mse = realityLog.reduce((sum, r) => {
        const err = (r.actual_net_worth - (r.expected_net_worth || 0)) / maxAbs;
        return sum + err * err;
      }, 0) / realityLog.length;
      calibrationScore = Math.round((1 - Math.min(mse, 1)) * 100); // 0-100, higher = better
    }

    // Off-track detection: if the latest variance is more than 40% below expected.
    const latest = realityLog[realityLog.length - 1];
    let status = plan.status || 'active';
    if (latest && latest.expected_net_worth && latest.variance / Math.abs(latest.expected_net_worth) < -0.4) {
      status = 'off_track';
    }

    const update = { reality_log: realityLog, calibration_score: calibrationScore, status };
    await base44.entities.LifePlan.update(planId, update);

    // Optional recalibration: re-run the forward projection anchored to actuals.
    let recalibrated = null;
    if (body.recalibrate && realityLog.length) {
      const simRes = await base44.functions.invoke('simulateLife', {
        vision: plan.vision,
        strategy: plan.strategy,
        persona: { relationship_status: undefined },
        horizon: plan.horizon,
        actuals: realityLog.map((r) => ({ date: r.date, actual_net_worth: r.actual_net_worth, note: r.note })),
      });
      recalibrated = simRes?.data || simRes;
    }

    return Response.json({
      plan_id: planId,
      entry,
      reality_log: realityLog,
      calibration_score: calibrationScore,
      status,
      recalibrated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}