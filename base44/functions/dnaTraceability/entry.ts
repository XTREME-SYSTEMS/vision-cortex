import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// dnaTraceability — detects orphaned records and auto-creates actions for
// unresolved gaps (rule 9: every gap requires a disposition). Returns a report
// of broken traceability chains so the Command Center can surface them.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const caps = await sr.SystemDNA_Capability.list('-benchmark_position', 500);
    const reqs = await sr.SystemDNA_Requirement.list('-priority', 500);
    const gaps = await sr.SystemDNA_Gap.list('-severity', 500);
    const actions = await sr.SystemDNA_Action.list('-priority', 200);

    const report = {
      capabilities_without_requirements: 0,
      requirements_without_acceptance_criteria: 0,
      gaps_without_actions: 0,
      actions_without_source: 0,
      actions_created: 0,
    };

    // 1. Capabilities without any linked requirement
    for (const cap of caps) {
      const hasReq = reqs.some((r) => r.capability_id === cap.dna_id) || (cap.requirement_ids && cap.requirement_ids.length > 0);
      if (!hasReq) report.capabilities_without_requirements++;
    }

    // 2. Requirements without acceptance criteria (rule 6 violation)
    for (const r of reqs) {
      if (!r.acceptance_criteria || !r.has_acceptance_criteria) {
        report.requirements_without_acceptance_criteria++;
      }
    }

    // 3. Gaps without an action — auto-create one (rule 9: every gap requires a disposition)
    const gapsWithAction = new Set(actions.map((a) => a.source_id).filter(Boolean));
    const orphanGaps = gaps.filter((g) => g.status === 'open' && !gapsWithAction.has(g.dna_id));
    let counter = actions.length + 1;
    const newActions = [];
    for (const g of orphanGaps.slice(0, 25)) { // cap per run to avoid flooding
      const dnaId = `ACT-${String(counter).padStart(6, '0')}`;
      counter++;
      newActions.push({
        dna_id: dnaId,
        system_id: g.system_id,
        objective: `Resolve gap: ${g.target_state?.slice(0, 100) || 'unspecified'}`,
        source: 'gap',
        source_id: g.dna_id,
        scope: g.impact || '',
        acceptance_criteria: `Close gap ${g.dna_id}: ${g.measurable_difference || 'meet target state'}`,
        priority: g.severity,
        status: 'queued',
        kanban_column: 'backlog',
        kanban_order: 0,
      });
    }
    let created = [];
    if (newActions.length > 0) {
      created = await sr.SystemDNA_Action.bulkCreate(newActions);
      report.actions_created = created.length;
    }
    report.gaps_without_actions = orphanGaps.length;

    // 4. Actions without a source_id
    report.actions_without_source = actions.filter((a) => !a.source_id).length;

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}