import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// dnaSelfHeal — takes a gap_id, generates a concrete fix via LLM, creates a
// SystemDNA_Action AND a SystemEnhancement record (so the existing auto-enhance
// pipeline picks it up and implements it). Bridges SystemDNA_Gap → live fix.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const gapId = body.gap_id;
    if (!gapId) return Response.json({ error: 'gap_id required' }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const gaps = await sr.SystemDNA_Gap.filter({ dna_id: gapId }, '-created_date', 5);
    const gap = gaps[0];
    if (!gap) return Response.json({ error: 'Gap not found' }, { status: 404 });

    // Load the linked capability for context
    let capability = null;
    if (gap.capability_id) {
      const caps = await sr.SystemDNA_Capability.filter({ dna_id: gap.capability_id }, '-created_date', 5);
      capability = caps[0];
    }

    // Generate a concrete fix via LLM
    const core = base44.asServiceRole.integrations.Core;
    const prompt = `You are the System DNA self-healing engine. A gap has been detected in an autonomous system. Generate a concrete, actionable fix.

SYSTEM: ${gap.system_id}
GAP: ${gap.target_state}
CURRENT STATE: ${gap.current_state}
MEASURABLE DIFFERENCE: ${gap.measurable_difference}
SEVERITY: ${gap.severity}
${capability ? `CAPABILITY: ${capability.module} / ${capability.capability}
BENCHMARK: ${capability.benchmark_state}
CURRENT: ${capability.current_state}` : ''}

Generate a JSON response with:
- fix_summary: one sentence describing the fix
- implementation_steps: array of concrete steps
- estimated_effort: "small" | "medium" | "large"
- priority: the severity P0-P3`;

    const llmRes = await core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          fix_summary: { type: 'string' },
          implementation_steps: { type: 'array', items: { type: 'string' } },
          estimated_effort: { type: 'string', enum: ['small', 'medium', 'large'] },
          priority: { type: 'string' },
        },
        required: ['fix_summary', 'implementation_steps', 'estimated_effort'],
      },
    });

    // Create a SystemDNA_Action
    const existingActions = await sr.SystemDNA_Action.filter({ source_id: gapId }, '-created_date', 5);
    let action;
    if (existingActions[0]) {
      action = await sr.SystemDNA_Action.update(existingActions[0].id, {
        status: 'in_progress',
        kanban_column: 'in_progress',
        started_at: new Date().toISOString(),
      });
    } else {
      const count = await sr.SystemDNA_Action.list('-created_date', 1);
      const num = (count.length || 0) + 1;
      action = await sr.SystemDNA_Action.create({
        dna_id: `ACT-${String(num).padStart(6, '0')}`,
        system_id: gap.system_id,
        objective: `Self-heal: ${gap.target_state?.slice(0, 100) || 'resolve gap'}`,
        source: 'gap',
        source_id: gapId,
        scope: gap.impact || '',
        acceptance_criteria: `Close gap ${gapId}: ${gap.measurable_difference || 'meet target state'}`,
        priority: gap.severity,
        status: 'in_progress',
        kanban_column: 'in_progress',
        started_at: new Date().toISOString(),
      });
    }

    // Create a SystemEnhancement so the existing auto-enhance pipeline implements it
    const enhancement = await sr.SystemEnhancement.create({
      title: `Self-Heal: ${gap.target_state?.slice(0, 80) || 'gap fix'}`,
      description: `${gap.measurable_difference || ''}\n\nFix: ${llmRes.fix_summary}\n\nSteps: ${llmRes.implementation_steps?.join('; ')}`,
      category: gap.is_blocking ? 'hardening' : 'feature',
      status: 'pending',
      priority: gap.severity === 'P0' ? 1 : gap.severity === 'P1' ? 2 : 3,
      source: 'system_dna',
      implementation_plan: llmRes.implementation_steps?.join('\n') || '',
    });

    // Update the gap status
    await sr.SystemDNA_Gap.update(gap.id, {
      status: 'in_progress',
      action_id: action.dna_id,
      proposed_solution: llmRes.fix_summary,
    });

    return Response.json({
      gap_id: gapId,
      action_id: action.dna_id,
      enhancement_id: enhancement.id,
      fix: llmRes,
      status: 'healing_initiated',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}