import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { secrets } from 'base44:runtime';

// ============================================================================
// masterLoopOrchestrator — The Master Autonomous Loop (Slot 00)
// ============================================================================
// This is the HEARTBEAT of Vision Cortex. It runs every 60 seconds via cron
// and processes all cross-repository queues in a deterministic order:
//
//   1. BUILD QUEUE     → application_build_pipeline (PENDING → ACTIVE)
//   2. DATA ACQUISITION → data_acquisition_ledger (UNPARSED → ENRICHED)
//   3. COMMS DISPATCH  → comms_dispatch_queue (QUEUED → DISPATCHED)
//   4. PLATFORM HEALTH  → base44_platform_registry (check all slots)
//   5. REWARD CYCLE     → Calculate $INF for completed work
//
// Each phase is independent — a failure in one doesn't block the others.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: cron token OR admin
    const cronToken = req.headers.get('x-cron-token') || '';
    const expectedKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    let authorized = false;
    if (cronToken && expectedKey && cronToken === expectedKey) {
      authorized = true;
    } else {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = secrets.get('SUPABASE_URL');
    const supabaseKey = secrets.get('SUPABASE_SERVICE_ROLE_KEY');
    const sr = base44.asServiceRole.entities;

    const cycleStart = Date.now();
    const cycleId = `CYCLE-${Date.now()}`;
    const report = {
      cycle_id: cycleId,
      started_at: new Date().toISOString(),
      phases: [],
      builds_processed: 0,
      leads_processed: 0,
      comms_dispatched: 0,
      slots_verified: 0,
      rewards_calculated: 0,
      errors: [],
    };

    const supabaseHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // ── PHASE 1: BUILD QUEUE ──────────────────────────────────────────────
    try {
      const buildsRes = await fetch(
        `${supabaseUrl}/rest/v1/application_build_pipeline?compilation_status=eq.PENDING&limit=3&order=created_at.asc`,
        { headers: supabaseHeaders }
      );
      if (buildsRes.ok) {
        const builds = await buildsRes.json();
        for (const build of (builds || [])) {
          try {
            // Dispatch to builder system (XTREME_BUILDER_URL)
            const builderUrl = secrets.get('XTREME_BUILDER_URL');
            if (builderUrl) {
              await fetch(`${builderUrl}/api/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  task_id: build.task_id,
                  target_url_domain: build.target_url_domain,
                  blueprint: build.blueprint_specification,
                }),
              }).catch(() => {}); // Graceful — builder may be offline
            }

            // Mark as COMPILING in Supabase
            await fetch(
              `${supabaseUrl}/rest/v1/application_build_pipeline?task_id=eq.${build.task_id}`,
              {
                method: 'PATCH',
                headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ compilation_status: 'PROVISIONING' }),
              }
            );
            report.builds_processed++;
          } catch (e) {
            report.errors.push(`Build ${build.task_id}: ${e.message}`);
          }
        }
      }
      report.phases.push({ name: 'build_queue', status: 'ok', processed: report.builds_processed });
    } catch (e) {
      report.phases.push({ name: 'build_queue', status: 'error', error: e.message });
      report.errors.push(`Phase build_queue: ${e.message}`);
    }

    // ── PHASE 2: DATA ACQUISITION ────────────────────────────────────────
    try {
      const leadsRes = await fetch(
        `${supabaseUrl}/rest/v1/data_acquisition_ledger?processing_state=eq.UNPARSED&limit=5&order=created_at.asc`,
        { headers: supabaseHeaders }
      );
      if (leadsRes.ok) {
        const leads = await leadsRes.json();
        for (const lead of (leads || [])) {
          try {
            // Enrich the lead — calculate data integrity score
            const payload = lead.raw_payload || {};
            const hasAddress = !!(payload.address || payload.normalized_address);
            const hasValue = !!(payload.estimated_value || lead.estimated_market_value);
            const hasContact = !!(payload.email || payload.phone || payload.owner_name);
            const integrityScore = ((hasAddress ? 0.4 : 0) + (hasValue ? 0.35 : 0) + (hasContact ? 0.25 : 0));

            const newState = integrityScore >= 0.6 ? 'ENRICHED' : 'PARSED';

            await fetch(
              `${supabaseUrl}/rest/v1/data_acquisition_ledger?lead_id=eq.${lead.lead_id}`,
              {
                method: 'PATCH',
                headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                  processing_state: newState,
                  data_integrity_score: integrityScore,
                }),
              }
            );
            report.leads_processed++;
          } catch (e) {
            report.errors.push(`Lead ${lead.lead_id}: ${e.message}`);
          }
        }
      }
      report.phases.push({ name: 'data_acquisition', status: 'ok', processed: report.leads_processed });
    } catch (e) {
      report.phases.push({ name: 'data_acquisition', status: 'error', error: e.message });
      report.errors.push(`Phase data_acquisition: ${e.message}`);
    }

    // ── PHASE 3: COMMS DISPATCH ──────────────────────────────────────────
    try {
      const commsRes = await fetch(
        `${supabaseUrl}/rest/v1/comms_dispatch_queue?delivery_status=eq.QUEUED&limit=5&order=updated_at.asc`,
        { headers: supabaseHeaders }
      );
      if (commsRes.ok) {
        const messages = await commsRes.json();
        for (const msg of (messages || [])) {
          try {
            // Dispatch via comms system (VISION_CORTEX_COMMS_API_KEY)
            const commsKey = secrets.get('VISION_CORTEX_COMMS_API_KEY');
            const commsUrl = secrets.get('VISION_CORTEX_BRAIN_URL');
            if (commsKey && commsUrl) {
              await fetch(`${commsUrl}/api/dispatch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': commsKey },
                body: JSON.stringify({
                  dispatch_id: msg.dispatch_id,
                  channel: msg.channel_type,
                  recipient: msg.recipient_destination,
                  body: msg.generated_copy_body,
                }),
              }).catch(() => {});
            }

            // Mark as DISPATCHED
            await fetch(
              `${supabaseUrl}/rest/v1/comms_dispatch_queue?dispatch_id=eq.${msg.dispatch_id}`,
              {
                method: 'PATCH',
                headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ delivery_status: 'DISPATCHED' }),
              }
            );
            report.comms_dispatched++;
          } catch (e) {
            report.errors.push(`Comms ${msg.dispatch_id}: ${e.message}`);
          }
        }
      }
      report.phases.push({ name: 'comms_dispatch', status: 'ok', processed: report.comms_dispatched });
    } catch (e) {
      report.phases.push({ name: 'comms_dispatch', status: 'error', error: e.message });
      report.errors.push(`Phase comms_dispatch: ${e.message}`);
    }

    // ── PHASE 4: PLATFORM HEALTH CHECK ────────────────────────────────────
    try {
      const registryRes = await fetch(
        `${supabaseUrl}/rest/v1/base44_platform_registry?order=slot_id.asc`,
        { headers: supabaseHeaders }
      );
      if (registryRes.ok) {
        const slots = await registryRes.json();
        report.slots_verified = (slots || []).length;
        for (const slot of (slots || [])) {
          if (slot.runtime_state !== 'NOMINAL') {
            report.errors.push(`Slot ${slot.slot_id} (${slot.system_domain}) is ${slot.runtime_state}`);
          }
        }
      }
      report.phases.push({ name: 'platform_health', status: 'ok', slots: report.slots_verified });
    } catch (e) {
      report.phases.push({ name: 'platform_health', status: 'error', error: e.message });
    }

    // ── PHASE 5: REWARD CYCLE ────────────────────────────────────────────
    try {
      // Find agents with recent completed work and calculate rewards
      const recentLogs = await sr.AgentLog.list('-created_date', 20);
      const agentActivity = {};
      for (const log of (recentLogs || [])) {
        if (log.agent_name && log.level === 'success') {
          if (!agentActivity[log.agent_name]) {
            agentActivity[log.agent_name] = { count: 0, timestamps: [] };
          }
          agentActivity[log.agent_name].count++;
          agentActivity[log.agent_name].timestamps.push(log.created_date);
        }
      }

      // Calculate rewards for active agents
      for (const [agentName, activity] of Object.entries(agentActivity)) {
        if (activity.count < 1) continue;
        // Simple metrics from activity
        const O = Math.min(activity.count / 10, 1); // Output normalized
        const T = 0.8; // Default timeliness
        const Q = 0.85; // Default quality
        const C = 0.75; // Default consistency

        const baseReward = (O * 0.40) + (T * 0.25) + (Q * 0.20) + (C * 0.15);
        const infReward = Number((baseReward * 1.44).toFixed(8));

        if (infReward > 0) {
          try {
            await sr.AgentPayment.create({
              agent_name: agentName,
              amount: infReward,
              payment_type: 'reward',
              memo: `Master loop auto-reward: ${activity.count} tasks completed`,
              validated: true,
              validator_notes: 'Auto-calculated by master loop orchestrator',
            });
            report.rewards_calculated++;
          } catch {}
        }
      }
      report.phases.push({ name: 'reward_cycle', status: 'ok', rewards: report.rewards_calculated });
    } catch (e) {
      report.phases.push({ name: 'reward_cycle', status: 'error', error: e.message });
    }

    // ── LOG THE CYCLE ────────────────────────────────────────────────────
    try {
      await sr.AgentLog.create({
        agent_name: 'MASTER_LOOP',
        category: 'master_loop_orchestrator',
        level: report.errors.length > 0 ? 'warn' : 'success',
        message: `Cycle ${cycleId}: ${report.builds_processed} builds, ${report.leads_processed} leads, ${report.comms_dispatched} comms, ${report.rewards_calculated} rewards`,
        detail: JSON.stringify(report.phases).slice(0, 1000),
        auto_action: 'master_loop_cycle',
        resolved: true,
      });
    } catch {}

    report.completed_at = new Date().toISOString();
    report.duration_ms = Date.now() - cycleStart;
    report.health = report.errors.length === 0 ? 'NOMINAL' : report.errors.length > 3 ? 'DEGRADED' : 'NOMINAL_WITH_WARNINGS';

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}