import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ============================================================================
// DEEP TASK VALIDATOR — Validates completed AgentSchedule tasks using the
// DEEP (Deterministic Engineering Engine Pipeline) system. Every task gets
// scored 0-1, logged, and checked off. Tasks that score below 1.00 are
// sent back for repair. Managed by: VALIDATOR agent.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'validate_pending';

    // ── VALIDATE_PENDING: Find completed but unvalidated tasks and validate them ──
    if (action === 'validate_pending') {
      // Find tasks that are completed but haven't been validated (no DeepRun linked)
      const completed = await sr.AgentSchedule.filter({ status: 'completed' }, '-updated_date', 20).catch(() => []);
      if (completed.length === 0) return Response.json({ ok: true, validated: 0, message: 'No completed tasks to validate' });

      let validated = 0;
      let passed = 0;
      let failed = 0;
      const results = [];

      for (const task of completed.slice(0, 10)) {
        // Check if already has a DeepRun
        const existingRun = await sr.DeepRun.filter({ spec_id: `task.${task.id}` }, '-created_date', 1).catch(() => []);
        if (existingRun[0]) continue;

        // Validate using LLM
        const validation = await validateTaskWithLLM(task);

        // Create DeepRun entry
        const runId = `RUN-${Date.now()}-${task.id.slice(-6)}`;
        try {
          await sr.DeepRun.create({
            run_id: runId,
            spec_id: `task.${task.id}`,
            spec_version: '1.0.0',
            status: validation.score >= 1.0 ? 'passed' : validation.score >= 0.7 ? 'repairable' : 'failed',
            lifecycle_stage: 'validate',
            states_executed: [{
              state_id: 'validate',
              status: validation.score >= 1.0 ? 'passed' : 'failed',
              score: validation.score,
              output: validation.reasoning,
            }],
            aggregate_score: validation.score,
            is_approved: validation.score === 1.0,
            severity: validation.score >= 1.0 ? 'PASS' : validation.score >= 0.7 ? 'REPAIRABLE' : 'CRITICAL',
            failed_states: validation.score < 1.0 ? ['validate'] : [],
            errors: validation.score < 1.0 ? [validation.reasoning] : [],
            triggered_by: 'agent',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
        } catch {}

        // Update task based on validation
        if (validation.score >= 1.0) {
          await sr.AgentSchedule.update(task.id, { progress: 100, result: `${task.result || 'Completed'} — VALIDATED (score: ${validation.score})` }).catch(() => {});
          passed++;
        } else if (validation.score >= 0.7) {
          // Send back for repair
          await sr.AgentSchedule.update(task.id, { status: 'scheduled', progress: 50, result: `REPAIRABLE (score: ${validation.score}) — ${validation.reasoning}` }).catch(() => {});
          failed++;
        } else {
          // Critical failure — mark as failed
          await sr.AgentSchedule.update(task.id, { status: 'failed', result: `FAILED (score: ${validation.score}) — ${validation.reasoning}` }).catch(() => {});
          failed++;
        }

        // Log validation
        try {
          await sr.AgentLog.create({
            agent_name: 'VALIDATOR',
            level: validation.score >= 1.0 ? 'success' : 'error',
            message: `Validated task "${task.task_title}" — score: ${validation.score}, ${validation.score >= 1.0 ? 'PASSED' : 'NEEDS REPAIR'}`,
            auto_action: 'deep_validate',
          });
        } catch {}

        results.push({ task_id: task.id, title: task.task_title, score: validation.score, status: validation.score >= 1.0 ? 'passed' : 'failed' });
        validated++;
      }

      return Response.json({
        ok: true,
        action: 'validate_pending',
        validated,
        passed,
        failed,
        results,
        managed_by: 'VALIDATOR',
      });
    }

    // ── VALIDATE_ONE: Validate a specific task ──
    if (action === 'validate_one') {
      const { task_id } = body;
      if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 });

      const task = await sr.AgentSchedule.get(task_id);
      const validation = await validateTaskWithLLM(task);

      return Response.json({
        ok: true,
        action: 'validate_one',
        task_id,
        title: task.task_title,
        score: validation.score,
        reasoning: validation.reasoning,
        is_approved: validation.score === 1.0,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: Validate a task using LLM ──
async function validateTaskWithLLM(task) {
  const prompt = `You are the VALIDATOR agent for Vision Cortex — an autonomous AI business operating system.
Your job is to validate whether a task was completed to 100% perfection.

TASK DETAILS:
- Title: ${task.task_title}
- Description: ${task.task_description || 'No description'}
- Category: ${task.task_category}
- Agent: ${task.agent_name}
- Result: ${task.result || 'No result recorded'}
- Progress: ${task.progress || 0}%
- Duration: ${task.duration_minutes || 0} minutes

VALIDATION CRITERIA:
1. Was the task actually completed? (not just marked as done)
2. Does the result match the task requirements?
3. Was the task done thoroughly and correctly?
4. Are there any remaining gaps or issues?
5. Does this contribute to getting the system to 100%?

SCORING:
- 1.00 = Perfect completion, fully validated, no gaps
- 0.70-0.99 = Mostly done but has repairable gaps
- Below 0.70 = Critical failure, needs major rework

Return JSON only:
{
  "score": 0.0,
  "reasoning": "Why this score was given",
  "gaps": ["list of remaining issues"],
  "recommendation": "approve | repair | reject"
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (groqRes.ok) {
      const data = await groqRes.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return {
        score: Math.round((parsed.score || 0) * 100) / 100,
        reasoning: parsed.reasoning || 'No reasoning provided',
        gaps: parsed.gaps || [],
        recommendation: parsed.recommendation || 'repair',
      };
    }
  } catch {}

  // Fallback: simple heuristic validation
  const hasResult = task.result && task.result.length > 20;
  const isComplete = task.progress === 100;
  const score = hasResult && isComplete ? 1.0 : hasResult ? 0.7 : 0.3;
  return {
    score,
    reasoning: hasResult && isComplete ? 'Task has a result and is marked complete' : hasResult ? 'Task has a result but progress is not 100%' : 'No meaningful result recorded',
    gaps: isComplete ? [] : ['Progress not at 100%'],
    recommendation: score >= 1.0 ? 'approve' : 'repair',
  };
}