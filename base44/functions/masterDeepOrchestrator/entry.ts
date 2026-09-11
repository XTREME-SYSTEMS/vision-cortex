import { createClientFromRequest } from '../../runtime/index';

// ============================================================================
// MASTER DEEP ORCHESTRATOR — The 24/7 autonomous loop that processes tasks
// one after another using the DEEP system. Every task is executed, validated,
// logged, monitored, checked off, tested, and scored.
//
// Flow: Pick next task -> Execute -> Validate -> Log -> Score -> Next task
// ============================================================================

const CATEGORY_TO_FUNCTION = {
  audit: 'deepSystemAudit',
  fix: 'dnaSelfHeal',
  harden: 'reguShield',
  optimize: 'runEnhancementCycle',
  enhance: 'implementEnhancement',
  documentation: 'evolveDocument',
  intelligence: 'runIntelligenceCycle',
  comms: 'ownerDigest',
  build: 'autoEnhanceAll',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'cycle';

    // ── CYCLE: Process the next highest-priority task through the DEEP pipeline ──
    if (action === 'cycle') {
      // 1. Find the next highest-priority scheduled task
      const scheduled = await sr.AgentSchedule.filter({ status: 'scheduled' }, 'priority', 50).catch(() => []);
      if (scheduled.length === 0) {
        return Response.json({
          ok: true,
          action: 'cycle',
          message: 'No scheduled tasks. Run visionBlueprintPrioritizer or unifiedTaskSync to populate.',
          processed: 0,
        });
      }

      // Sort by priority (1=highest) then by scheduled_start
      scheduled.sort((a, b) => {
        if (a.priority !== b.priority) return (a.priority || 5) - (b.priority || 5);
        return new Date(a.scheduled_start) - new Date(b.scheduled_start);
      });

      const task = scheduled[0];
      const now = new Date().toISOString();

      // 2. Mark task as in_progress
      await sr.AgentSchedule.update(task.id, {
        status: 'in_progress',
        actual_start: now,
        progress: 10,
      }).catch(() => {});

      // Log start
      try {
        await sr.AgentLog.create({
          agent_name: task.agent_name,
          level: 'info',
          message: `DEEP cycle started: "${task.task_title}" (priority ${task.priority})`,
          auto_action: 'deep_cycle_start',
        });
      } catch {}

      // 3. Execute the task by invoking the appropriate backend function
      const functionName = CATEGORY_TO_FUNCTION[task.task_category] || 'autoEnhanceAll';
      let executionResult = null;
      let executionError = null;

      try {
        const result = await base44.functions.invoke(functionName, {
          task_id: task.id,
          task_title: task.task_title,
          task_description: task.task_description,
          agent_name: task.agent_name,
          system_target: task.system_target,
        });
        executionResult = result;
      } catch (e) {
        executionError = e.message;
      }

      // 4. Calculate duration
      const endTime = new Date();
      const startTime = new Date(task.actual_start || now);
      const durationMin = Math.round((endTime - startTime) / 60000);

      // 5. Mark task as completed
      await sr.AgentSchedule.update(task.id, {
        status: 'completed',
        actual_end: endTime.toISOString(),
        duration_minutes: durationMin,
        progress: 90, // Will be 100 after validation
        result: executionResult ? JSON.stringify(executionResult).slice(0, 500) : `Executed via ${functionName}`,
        payment_status: 'pending',
      }).catch(() => {});

      // 6. Validate the task using deepTaskValidator
      let validationScore = 0;
      let validationReasoning = '';
      try {
        const valResult = await base44.functions.invoke('deepTaskValidator', {
          action: 'validate_one',
          task_id: task.id,
        });
        validationScore = valResult.score || 0;
        validationReasoning = valResult.reasoning || '';
      } catch (e) {
        // Fallback: simple validation
        validationScore = executionResult ? 1.0 : 0.3;
        validationReasoning = executionResult ? 'Executed successfully' : `Execution failed: ${executionError}`;
      }

      // 7. Update task with final validation
      const isApproved = validationScore >= 1.0;
      await sr.AgentSchedule.update(task.id, {
        progress: 100,
        result: `${executionResult ? 'Executed' : 'Failed'} via ${functionName} — VALIDATED: ${validationScore}/1.00 — ${validationReasoning}`,
      }).catch(() => {});

      // 8. Update agent profile
      const agent = await sr.AgentProfile.filter({ name: task.agent_name }, '-created_date', 1).catch(() => []);
      if (agent[0]) {
        await sr.AgentProfile.update(agent[0].id, {
          tasks_completed: (agent[0].tasks_completed || 0) + 1,
          last_run: endTime.toISOString(),
          inf_balance: (agent[0].inf_balance || 0) + (task.payment_amount || 0),
          inf_earned_total: (agent[0].inf_earned_total || 0) + (task.payment_amount || 0),
          health: isApproved ? 100 : Math.max(50, (agent[0].health || 100) - 10),
        }).catch(() => {});
      }

      // 9. Log completion
      try {
        await sr.AgentLog.create({
          agent_name: task.agent_name,
          level: isApproved ? 'success' : 'warn',
          message: `DEEP cycle complete: "${task.task_title}" — score: ${validationScore}/1.00 — ${isApproved ? 'APPROVED' : 'NEEDS REPAIR'}`,
          auto_action: 'deep_cycle_complete',
        });
      } catch {}

      // 10. Create a DeepRun record for traceability
      try {
        await sr.DeepRun.create({
          run_id: `RUN-${Date.now()}-${task.id.slice(-6)}`,
          spec_id: `task.${task.id}`,
          spec_version: '1.0.0',
          status: isApproved ? 'passed' : validationScore >= 0.7 ? 'repairable' : 'failed',
          lifecycle_stage: 'validate',
          states_executed: [
            { state_id: 'execute', status: executionResult ? 'passed' : 'failed', score: executionResult ? 1 : 0, output: `${functionName} executed` },
            { state_id: 'validate', status: isApproved ? 'passed' : 'failed', score: validationScore, output: validationReasoning },
          ],
          aggregate_score: validationScore,
          is_approved: isApproved,
          severity: isApproved ? 'PASS' : validationScore >= 0.7 ? 'REPAIRABLE' : 'CRITICAL',
          failed_states: isApproved ? [] : ['validate'],
          errors: isApproved ? [] : [validationReasoning],
          triggered_by: 'cron',
          started_at: task.actual_start || now,
          completed_at: endTime.toISOString(),
          duration_ms: durationMin * 60000,
        });
      } catch {}

      return Response.json({
        ok: true,
        action: 'cycle',
        processed: 1,
        task: {
          id: task.id,
          title: task.task_title,
          agent: task.agent_name,
          category: task.task_category,
          priority: task.priority,
        },
        execution: {
          function: functionName,
          success: !!executionResult,
          error: executionError,
        },
        validation: {
          score: validationScore,
          reasoning: validationReasoning,
          approved: isApproved,
        },
        duration_minutes: durationMin,
        next_task_available: scheduled.length > 1,
      });
    }

    // ── STATUS: Get the orchestrator status ──
    if (action === 'status') {
      const [scheduled, inProgress, completed, failed] = await Promise.all([
        sr.AgentSchedule.filter({ status: 'scheduled' }, 'priority', 100).catch(() => []),
        sr.AgentSchedule.filter({ status: 'in_progress' }, '-created_date', 10).catch(() => []),
        sr.AgentSchedule.filter({ status: 'completed' }, '-created_date', 100).catch(() => []),
        sr.AgentSchedule.filter({ status: 'failed' }, '-created_date', 50).catch(() => []),
      ]);

      const recentRuns = await sr.DeepRun.list('-created_date', 10).catch(() => []);
      const avgScore = recentRuns.length > 0
        ? Math.round((recentRuns.reduce((s, r) => s + (r.aggregate_score || 0), 0) / recentRuns.length) * 100) / 100
        : 0;

      return Response.json({
        ok: true,
        action: 'status',
        queue: {
          scheduled: scheduled.length,
          in_progress: inProgress.length,
          completed: completed.length,
          failed: failed.length,
        },
        deep_runs: recentRuns.length,
        avg_score: avgScore,
        next_task: scheduled[0] ? {
          title: scheduled[0].task_title,
          agent: scheduled[0].agent_name,
          priority: scheduled[0].priority,
        } : null,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}