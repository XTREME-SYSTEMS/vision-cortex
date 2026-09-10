// ============================================================================
// deep-cycle — the credit-free autonomous loop. Runs entirely on Vercel +
// Supabase + Groq. Zero Base44 credits consumed.
//
// Flow: pick next scheduled task from Supabase → run Groq → validate with
// Groq → write log + run record to Supabase → mark task done → update loop state.
//
// Triggered by Vercel cron every 5 minutes.
// ============================================================================

import { getSupabase } from '../lib/supabase.js';
import { groq, tryParseJSON } from '../lib/groq.js';

const CATEGORY_PROMPTS = {
  audit: 'Audit the following system/task. Identify the top issues, score each dimension 0-100, and produce a concrete perfection plan. Return JSON: { summary, issues: [{dimension, score, issue, fix}], overall_score, perfection_plan }',
  fix: 'Generate a concrete, actionable fix for the following gap. Return JSON: { fix_summary, implementation_steps: [], estimated_effort, priority }',
  harden: 'Add security hardening recommendations for the following system. Return JSON: { hardening_summary, recommendations: [], risk_reduction }',
  optimize: 'Optimize the following system for performance and cost. Return JSON: { optimization_summary, changes: [], expected_improvement }',
  enhance: 'Propose an enhancement for the following system. Return JSON: { enhancement_summary, implementation_plan: [], expected_impact }',
  build: 'Design a build plan for the following. Return JSON: { build_summary, steps: [], tech_stack: [], estimated_time }',
  intelligence: 'Analyze the following for strategic intelligence. Return JSON: { summary, signals: [], recommendations: [], confidence }',
  manage: 'Process the following management task. Return JSON: { summary, actions: [], status }',
};

export default async function handler(req, res) {
  const cronToken = req.headers['x-cron-token'] || '';
  const expectedKey = process.env.VISION_CORTEX_WEBHOOK_KEY;
  if (!expectedKey || cronToken !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = getSupabase();
  const now = new Date().toISOString();

  try {
    // 1. Pick the next highest-priority scheduled task
    const { data: scheduled, error: pickErr } = await sb
      .from('agent_schedule')
      .select('*')
      .eq('status', 'scheduled')
      .order('priority', { ascending: true })
      .order('scheduled_start', { ascending: true })
      .limit(1);

    if (pickErr) throw pickErr;
    if (!scheduled || scheduled.length === 0) {
      return res.status(200).json({ ok: true, processed: 0, message: 'No scheduled tasks' });
    }

    const task = scheduled[0];

    // 2. Mark in_progress
    await sb.from('agent_schedule').update({
      status: 'in_progress',
      actual_start: now,
      progress: 10,
    }).eq('id', task.id);

    await sb.from('agent_logs').insert({
      agent_name: task.agent_name,
      level: 'info',
      category: task.task_category,
      message: `DEEP cycle started: "${task.task_title}" (priority ${task.priority})`,
      auto_action: 'deep_cycle_start',
    });

    // 3. Execute via Groq
    const promptTemplate = CATEGORY_PROMPTS[task.task_category] || CATEGORY_PROMPTS.manage;
    const fullPrompt = `${promptTemplate}\n\nTASK: ${task.task_title}\nDESCRIPTION: ${task.task_description || '(none)'}\nSYSTEM TARGET: ${task.system_target || '(none)'}`;

    let executionResult = null;
    let executionError = null;
    let score = 0;
    let reasoning = '';

    try {
      const raw = await groq(fullPrompt, { maxTokens: 1200 });
      executionResult = tryParseJSON(raw);
      if (!executionResult) executionResult = { raw_output: raw };
      score = typeof executionResult.overall_score === 'number'
        ? executionResult.overall_score / 100
        : 0.8;
      reasoning = executionResult.summary || executionResult.fix_summary || 'Executed via Groq';
    } catch (e) {
      executionError = e.message;
      score = 0.3;
      reasoning = `Execution failed: ${e.message}`;
    }

    // 4. Validate via Groq (lightweight second pass)
    try {
      const valRaw = await groq(
        `Validate this autonomous task result. Score 0.0-1.0 on whether the task was completed satisfactorily. Return JSON: { score, reasoning, approved }\n\nTASK: ${task.task_title}\nRESULT: ${JSON.stringify(executionResult).slice(0, 800)}`,
        { maxTokens: 400, system: 'You are a strict validator. Output only JSON.' }
      );
      const val = tryParseJSON(valRaw);
      if (val) {
        score = typeof val.score === 'number' ? val.score : score;
        reasoning = val.reasoning || reasoning;
      }
    } catch {}

    const isApproved = score >= 0.7;
    const endTime = new Date();
    const durationMin = Math.round((endTime - new Date(now)) / 60000);

    // 5. Mark completed
    await sb.from('agent_schedule').update({
      status: 'completed',
      actual_end: endTime.toISOString(),
      duration_minutes: durationMin,
      progress: 100,
      result: `${executionResult ? 'Executed' : 'Failed'} via Groq — score: ${score.toFixed(2)} — ${reasoning}`.slice(0, 500),
      payment_status: 'pending',
    }).eq('id', task.id);

    // 6. Write DeepRun record
    await sb.from('deep_runs').insert({
      run_id: `RUN-${Date.now()}-${String(task.id).slice(-6)}`,
      task_id: task.id,
      status: isApproved ? 'passed' : score >= 0.5 ? 'repairable' : 'failed',
      lifecycle_stage: 'validate',
      states_executed: [
        { state_id: 'execute', status: executionResult ? 'passed' : 'failed', score: executionResult ? 1 : 0 },
        { state_id: 'validate', status: isApproved ? 'passed' : 'failed', score },
      ],
      aggregate_score: score,
      is_approved: isApproved,
      severity: isApproved ? 'PASS' : score >= 0.5 ? 'REPAIRABLE' : 'CRITICAL',
      failed_states: isApproved ? [] : ['validate'],
      errors: isApproved ? [] : [reasoning],
      triggered_by: 'vercel-cron',
      started_at: now,
      completed_at: endTime.toISOString(),
      duration_ms: durationMin * 60000,
    });

    // 7. Log completion
    await sb.from('agent_logs').insert({
      agent_name: task.agent_name,
      level: isApproved ? 'success' : 'warn',
      category: task.task_category,
      message: `DEEP cycle complete: "${task.task_title}" — score: ${score.toFixed(2)}/1.00 — ${isApproved ? 'APPROVED' : 'NEEDS REPAIR'}`,
      auto_action: 'deep_cycle_complete',
    });

    // 8. Update loop state
    const { data: state } = await sb.from('loop_state').select('*').eq('id', 1).single();
    const totalCycles = (state?.total_cycles || 0) + 1;
    const totalApproved = (state?.total_approved || 0) + (isApproved ? 1 : 0);
    const avgScore = Math.round(((state?.avg_score || 0) * (totalCycles - 1) + score) / totalCycles * 100) / 100;
    await sb.from('loop_state').update({
      last_cycle_at: now,
      last_task_title: task.task_title,
      last_score: score,
      last_status: isApproved ? 'approved' : 'needs_repair',
      total_cycles: totalCycles,
      total_approved: totalApproved,
      avg_score: avgScore,
    }).eq('id', 1);

    return res.status(200).json({
      ok: true,
      processed: 1,
      task: { id: task.id, title: task.task_title, agent: task.agent_name, category: task.task_category },
      execution: { success: !!executionResult, error: executionError },
      validation: { score, reasoning, approved: isApproved },
      duration_minutes: durationMin,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}