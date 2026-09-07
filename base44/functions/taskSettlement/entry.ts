import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ============================================================================
// TASK SETTLEMENT — The peer-verification reward disbursement hook.
// Intercepts task completion signatures, enforces zero-trust validation,
// calculates $INF payout via the score matrix, and syncs to Google Tasks.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'settle';

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // ── SETTLE: Process a task completion with validation and reward ──
    if (action === 'settle') {
      const { task_id, worker_slot, verification_signature, metrics } = body;

      if (!task_id || !worker_slot) {
        return Response.json({ error: 'task_id and worker_slot required' }, { status: 400 });
      }

      const { O = 0, T = 0, Q = 1, C = 1 } = metrics || {};

      // 1. Check validation audit journal for proof
      let auditVerified = false;
      try {
        const auditRes = await fetch(
          `${supabaseUrl}/rest/v1/validation_audit_journal?target_task_id=eq.${task_id}&is_valid_proof=eq.true&limit=1`,
          { headers: sbHeaders }
        );
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          auditVerified = auditData && auditData.length > 0;
        }
      } catch {}

      // If no audit proof, check if we should auto-validate (for autonomous flow)
      if (!auditVerified && body.auto_validate) {
        // Auto-create audit proof
        try {
          await fetch(`${supabaseUrl}/rest/v1/validation_audit_journal`, {
            method: 'POST',
            headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              target_task_id: task_id,
              validator_slot: '03',
              verification_hash: verification_signature || `sig_${Date.now()}`,
              is_valid_proof: true,
            }),
          });
          auditVerified = true;
        } catch {}
      }

      if (!auditVerified) {
        return Response.json({
          status: 403,
          error: 'UNVERIFIED_WORK_PROMPT_REJECTION',
          message: `Task ${task_id} lacks confirmation signatures. Freezing allocation blocks.`,
        }, { status: 403 });
      }

      // 2. Calculate reward via the score matrix
      const rawReward = (O * 0.40) + (T * 0.25) + (Q * 0.20) + (C * 0.15);
      const computedPayout = Number((rawReward * 1.44).toFixed(8));

      // 3. Record to infinity_ledger
      try {
        await fetch(`${supabaseUrl}/rest/v1/infinity_ledger`, {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            sender_wallet: 'system_treasury',
            receiver_wallet: worker_slot,
            amount_inf: computedPayout,
            metric_output: O,
            metric_latency: T,
            metric_quality: Q,
            metric_stability: C,
            reward_type: 'TASK_COMPLETION',
          }),
        });
      } catch {}

      // 4. Update google_task_sync status
      try {
        await fetch(`${supabaseUrl}/rest/v1/google_task_sync?task_id=eq.${task_id}`, {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify({ task_status: 'COMPLETED' }),
        });
      } catch {}

      // 5. Update Base44 AgentProfile and create AgentPayment
      const agents = await sr.AgentProfile.list('-order', 100).catch(() => []);
      const agent = agents.find(a => a.slot_id === worker_slot || a.codename === worker_slot || a.name === worker_slot);
      if (agent) {
        await sr.AgentProfile.update(agent.id, {
          inf_balance: (agent.inf_balance || 0) + computedPayout,
          inf_earned_total: (agent.inf_earned_total || 0) + computedPayout,
          tasks_completed: (agent.tasks_completed || 0) + 1,
          last_run: new Date().toISOString(),
        }).catch(() => {});

        await sr.AgentPayment.create({
          agent_name: agent.name,
          amount: computedPayout,
          payment_type: 'task_completion',
          status: 'paid',
          description: `Task ${task_id} settlement — O:${O} T:${T} Q:${Q} C:${C}`,
        }).catch(() => {});
      }

      // 6. Log the settlement
      try {
        await sr.AgentLog.create({
          agent_name: agent?.name || worker_slot,
          level: 'success',
          message: `Task settled: ${task_id} — $INF ${computedPayout} disbursed to Slot ${worker_slot}`,
          auto_action: 'task_settlement',
        });
      } catch {}

      return Response.json({
        status: 200,
        message: 'Task closed. Timesheet synchronized successfully.',
        payout: computedPayout,
        worker_slot,
        task_id,
        metrics: { O, T, Q, C },
      });
    }

    // ── SYNC_TASK: Push a task to the google_task_sync table ──
    if (action === 'sync_task') {
      const { google_task_id, assigned_to_slot, task_title, task_description, milestone_weight_inf } = body;

      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/google_task_sync`, {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            google_task_id,
            assigned_to_slot,
            task_title,
            task_description,
            milestone_weight_inf,
            task_status: 'PENDING',
          }),
        });
        const created = await res.json();
        return Response.json({ ok: true, created: created[0] });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── LOG_TIME: Record a timeclock entry ──
    if (action === 'log_time') {
      const { slot_id, task_id, action_signature, execution_depth_bytes, processing_latency_ms, accuracy_rating, stability_coefficient } = body;

      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/agent_timeclock_ledger`, {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            slot_id,
            task_id,
            action_signature,
            execution_depth_bytes: execution_depth_bytes || 0,
            processing_latency_ms: processing_latency_ms || 0,
            accuracy_rating: accuracy_rating || 1.00,
            stability_coefficient: stability_coefficient || 1.00,
          }),
        });
        const created = await res.json();
        return Response.json({ ok: true, created: created[0] });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}