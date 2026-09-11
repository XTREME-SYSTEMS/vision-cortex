import { createClientFromRequest } from '../../runtime/index';

// ============================================================================
// PREFLIGHT SENSORY — Reads from all Supabase tables to provide the live
// monitoring data for the PreflightSensory dashboard panel.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    };

    // Fetch from all Supabase tables in parallel
    const [agentsRes, timeclockRes, tasksRes, roadmapRes, ledgerRes, validationRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/agent_profiles?order=slot_id.asc`, { headers: sbHeaders }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/agent_timeclock_ledger?order=check_in_at.desc&limit=10`, { headers: sbHeaders }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/google_task_sync?order=synchronized_at.desc&limit=20`, { headers: sbHeaders }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/enterprise_longterm_roadmap?order=phase_id.asc`, { headers: sbHeaders }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/infinity_ledger?order=created_at.desc&limit=10`, { headers: sbHeaders }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/validation_audit_journal?order=audited_at.desc&limit=10`, { headers: sbHeaders }).catch(() => null),
    ]);

    const agents = agentsRes?.ok ? await agentsRes.json() : [];
    const timeclock = timeclockRes?.ok ? await timeclockRes.json() : [];
    const tasks = tasksRes?.ok ? await tasksRes.json() : [];
    const roadmap = roadmapRes?.ok ? await roadmapRes.json() : [];
    const ledger = ledgerRes?.ok ? await ledgerRes.json() : [];
    const validations = validationRes?.ok ? await validationRes.json() : [];

    // Calculate system integrity score
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.task_status === 'COMPLETED').length;
    const verifiedTasks = validations.filter(v => v.is_valid_proof).length;
    const integrityScore = totalTasks > 0
      ? Math.max(0.68, Math.min(0.99, (completedTasks / totalTasks) * 0.6 + (verifiedTasks / Math.max(1, totalTasks)) * 0.4))
      : 0.68;

    // Calculate total INF disbursed
    const totalInf = ledger.reduce((sum, l) => sum + (parseFloat(l.amount_inf) || 0), 0);

    return Response.json({
      ok: true,
      agents,
      timeclock,
      tasks,
      roadmap,
      ledger,
      validations,
      integrity_score: integrityScore,
      total_inf_disbursed: totalInf,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      verified_tasks: verifiedTasks,
      ecosystem_state: integrityScore > 0.90 ? 'NOMINAL' : integrityScore > 0.75 ? 'ELEVATED' : 'WATCH',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}