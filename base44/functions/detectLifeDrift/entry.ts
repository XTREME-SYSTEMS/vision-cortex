import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// detectLifeDrift — the automated drift sentinel. Compares the user's real-time
// reality log against their simulation milestones, detects significant drift
// (financial or calibration), generates AI-powered course corrections, and
// creates dashboard notifications so the user is alerted the moment their life
// choices diverge from the optimal strategy. Designed to run on a daily schedule
// or on-demand from the dashboard.

const DRIFT_THRESHOLD_PCT = 0.20; // 20% deviation triggers a drift alert

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    // Load the user's most recent life plan
    const plans = await base44.entities.LifePlan.list('-created_date', 5).catch(() => []);
    if (!plans.length) return Response.json({ drifts: [], message: 'No life plans found.' });

    const plan = plans[0];
    const realityLog = plan.reality_log || [];
    const milestones = plan.milestones || [];
    const decisionPoints = plan.decision_points || [];

    if (!realityLog.length) {
      return Response.json({ drifts: [], message: 'No reality entries logged yet. Log your actual net worth to start drift detection.' });
    }

    // Load existing unread notifications to deduplicate
    const existing = await base44.entities.Notification.filter({ read: false }, '-created_date', 20).catch(() => []);
    const existingTitles = new Set(existing.map((n) => n.title));

    // --- Detect financial drift ---
    const latest = realityLog[realityLog.length - 1];
    const drifts = [];

    if (latest && latest.expected_net_worth) {
      const variancePct = latest.variance / Math.abs(latest.expected_net_worth);
      if (Math.abs(variancePct) > DRIFT_THRESHOLD_PCT) {
        drifts.push({
          type: 'financial',
          date: latest.date,
          actual: latest.actual_net_worth,
          expected: latest.expected_net_worth,
          variance: latest.variance,
          variance_pct: Math.round(variancePct * 100),
          note: latest.note,
          direction: variancePct < 0 ? 'below' : 'above',
        });
      }
    }

    // --- Detect calibration drift ---
    if (plan.calibration_score !== null && plan.calibration_score !== undefined && plan.calibration_score < 50) {
      drifts.push({
        type: 'calibration',
        calibration_score: plan.calibration_score,
        message: `Calibration score has dropped to ${plan.calibration_score}/100 — your predictions are diverging from reality.`,
      });
    }

    // --- Detect status drift ---
    if (plan.status === 'off_track') {
      drifts.push({
        type: 'status',
        status: 'off_track',
        message: 'Life plan is flagged as off-track.',
      });
    }

    if (!drifts.length) {
      return Response.json({
        drifts: [],
        message: 'No significant drift detected. You are on track.',
        calibration_score: plan.calibration_score,
        plan_id: plan.id,
      });
    }

    // --- Use LLM to generate optimal course corrections ---
    const prompt = `You are the Drift Sentinel for the Vision Cortex Destiny Engine. The user's real-time life choices have drifted from their optimal simulation strategy. Analyze the drift and generate specific, actionable course corrections. Be direct and kind — treat the life plan as a living, recalibratable document.

USER VISION: ${plan.vision || 'N/A'}

STRATEGY: ${plan.strategy?.title || 'N/A'} — ${plan.strategy?.one_liner || ''}

LATEST REALITY ENTRY:
- Date: ${latest?.date || 'N/A'}
- Actual net worth: $${latest?.actual_net_worth || 0}
- Expected net worth: $${latest?.expected_net_worth || 0}
- Variance: $${latest?.variance || 0} (${drifts.find(d => d.type === 'financial')?.variance_pct || 0}% ${drifts.find(d => d.type === 'financial')?.direction || ''} expected)

CALIBRATION SCORE: ${plan.calibration_score ?? 'N/A'}/100
PLAN STATUS: ${plan.status || 'active'}

MILESTONES:
${milestones.map((m) => `- ${m.date}: ${m.label} (target $${m.target_net_worth || 0})`).join('\n') || 'None'}

DECISIONS MADE:
${decisionPoints.map((d) => `- ${d.date}: ${d.prompt} → chose "${d.chosen}"`).join('\n') || 'None'}

DETECTED DRIFTS:
${JSON.stringify(drifts, null, 2)}

Generate a clear, direct alert and 1-3 specific course corrections. Identify the single highest-leverage adjustment. Return JSON with this exact structure.`;

    const res = await core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          alert_title: { type: 'string', description: 'Short, clear alert title (max 80 chars)' },
          alert_body: { type: 'string', description: '2-3 sentence explanation of the drift and its impact' },
          severity: { type: 'string', enum: ['info', 'warn', 'critical'] },
          course_corrections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', description: 'Specific corrective action' },
                priority: { type: 'string', enum: ['immediate', 'short-term', 'long-term'] },
                rationale: { type: 'string', description: 'Why this action will close the gap' },
              },
              required: ['action', 'priority'],
            },
          },
          optimal_adjustment: { type: 'string', description: 'The single highest-leverage adjustment to make right now' },
        },
        required: ['alert_title', 'alert_body', 'severity', 'course_corrections', 'optimal_adjustment'],
      },
    });

    // --- Create notification (deduplicate by title) ---
    const notifTitle = res.alert_title;
    let notification = null;
    if (!existingTitles.has(notifTitle)) {
      notification = await base44.entities.Notification.create({
        kind: res.severity === 'critical' ? 'drawdown' : 'loss',
        title: notifTitle,
        body: JSON.stringify({
          alert_body: res.alert_body,
          course_corrections: res.course_corrections,
          optimal_adjustment: res.optimal_adjustment,
          drifts,
        }),
        severity: res.severity,
        read: false,
      });
    }

    // --- Log to agent log ---
    await base44.entities.AgentLog.create({
      agent_name: 'Drift Sentinel',
      level: res.severity === 'critical' ? 'error' : 'warn',
      category: 'drift_detection',
      message: `Drift detected: ${notifTitle} (${drifts.length} drift point(s), calibration ${plan.calibration_score ?? 'N/A'}/100)`,
      detail: res.alert_body,
    });

    return Response.json({
      drifts,
      alert: res,
      notification_id: notification?.id || null,
      notification_created: !!notification,
      plan_id: plan.id,
      calibration_score: plan.calibration_score,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}