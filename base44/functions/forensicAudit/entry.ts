import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// forensicAudit — cross-references the user's simulation results and life plan
// against their vision statement, highlighting exactly where choices drift from
// the strategy and suggesting specific course corrections. Returns a structured
// drift report with an alignment score.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    const body = await req.json().catch(() => ({}));

    // Gather the user's vision, life plan, and recent simulations
    const [profiles, plans, sims] = await Promise.all([
      base44.entities.UserProfile.list('-created_date', 5).catch(() => []),
      base44.entities.LifePlan.list('-created_date', 5).catch(() => []),
      base44.entities.Simulation.list('-created_date', 10).catch(() => []),
    ]);

    const profile = profiles[0];
    const plan = plans[0];
    const vision = body.vision || profile?.vision_statement || profile?.seed_sentence || '';
    const strategy = plan?.strategy || {};
    const milestones = plan?.milestones || [];
    const decisionPoints = plan?.decision_points || [];

    if (!vision && !plan && sims.length === 0) {
      return Response.json({ error: 'No vision, life plan, or simulations found. Complete the Destiny Flow first.' }, { status: 404 });
    }

    const simSummaries = sims.slice(0, 5).map((s) => ({
      name: s.strategy_name,
      profit: s.metrics?.total_profit,
      roi: s.metrics?.roi_pct,
      break_even: s.metrics?.break_even_day,
      status: s.status,
    }));

    const prompt = `You are a forensic auditor for the Vision Cortex Destiny Engine. Cross-reference the user's vision statement against their simulation results and life plan strategy. Your job is to find exactly where their choices DRIFT from the stated vision and strategy, and prescribe specific course corrections.

USER VISION: ${vision}

LIFE PLAN STRATEGY:
- Title: ${strategy.title || 'N/A'}
- One-liner: ${strategy.one_liner || 'N/A'}
- Archetype: ${strategy.archetype || 'N/A'}
- Capital required: $${strategy.capital_required_usd || 'N/A'}
- Time to profit: ${strategy.time_to_profit_days || 'N/A'} days
- Target final net worth: $${plan?.target_final_net_worth || 'N/A'}

MILESTONES (${milestones.length}):
${milestones.map((m) => `- ${m.date}: ${m.label} (target $${m.target_net_worth || 0})`).join('\n') || 'None'}

DECISIONS MADE (${decisionPoints.length}):
${decisionPoints.map((d) => `- ${d.date}: ${d.prompt} → chose "${d.chosen}" (options: ${(d.options || []).join(', ')})`).join('\n') || 'None'}

SIMULATION RESULTS (${simSummaries.length}):
${JSON.stringify(simSummaries, null, 2)}

Analyze alignment on a 0–100 scale. Identify each drift point (where a choice or simulation outcome diverges from the vision/strategy), with severity. Then prescribe specific, actionable course corrections with priority and timeline.

Return JSON with this exact structure.`;

    const res = await core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          alignment_score: { type: 'number', description: '0–100 alignment between choices and vision' },
          summary: { type: 'string', description: 'One-paragraph forensic summary' },
          drift_points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string', description: 'e.g. "Capital allocation", "Risk posture", "Timeline"' },
                vision: { type: 'string', description: 'What the vision/strategy calls for' },
                actual: { type: 'string', description: 'What the choices/simulations actually show' },
                gap: { type: 'string', description: 'The specific drift' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              },
              required: ['area', 'gap', 'severity'],
            },
          },
          course_corrections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', description: 'Specific corrective action' },
                priority: { type: 'string', enum: ['immediate', 'short-term', 'long-term'] },
                timeline: { type: 'string', description: 'e.g. "within 30 days"' },
                addresses: { type: 'string', description: 'Which drift point this fixes' },
              },
              required: ['action', 'priority'],
            },
          },
        },
        required: ['alignment_score', 'summary', 'drift_points', 'course_corrections'],
      },
    });

    await base44.entities.AgentLog.create({
      agent_name: 'Forensic Auditor',
      level: 'info',
      category: 'forensic_audit',
      message: `Forensic audit run — alignment ${res.alignment_score}/100, ${res.drift_points?.length || 0} drift points, ${res.course_corrections?.length || 0} corrections.`,
    });

    return Response.json({ report: res, vision, plan_id: plan?.id || null });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}