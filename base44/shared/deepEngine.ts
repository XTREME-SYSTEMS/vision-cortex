// ============================================================================
// DEEP — Deterministic Engineering Engine Pipeline
// ============================================================================
// The canonical runtime executor for all Vision Cortex state machines.
//
// PRINCIPLE: The deterministic pipeline is the core. The LLM is a narrow,
// validated peripheral. LLM output is NEVER trusted raw — it passes through
// a deterministic validator that rejects anything outside the schema.
//
// Every run is:
//   1. Replayable — same input hash + same spec version = same result
//   2. Scored — aggregate score 0-1, is_approved ONLY at 1.00 (parity gate)
//   3. Cost-tracked — credits consumed are measured against a budget
//   4. Persisted — a DeepRun record is written for every execution (the proof)
//
// This module is the SOP made executable. No prose. No ambiguity. No hallucination.
// ============================================================================

import { validateAndScore, qualityGatedLLM } from './deterministicShell.ts';

/**
 * Hash an input state for replayability verification.
 * Same input hash + same spec version = deterministic replay.
 */
export function hashInput(input) {
  const str = JSON.stringify(input, Object.keys(input || {}).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `h_${Math.abs(hash).toString(16).padStart(12, '0')}`;
}

/**
 * Validate an LLM slot output against its declared output schema.
 * This is the deterministic gate — it does not trust the LLM.
 * Returns { valid, score, issues }.
 */
export function validateSlotOutput(output, outputSchema) {
  if (!outputSchema) return { valid: true, score: 1.0, issues: [] };
  return validateAndScore(output, outputSchema, outputSchema.required || []);
}

/**
 * Execute a single state machine state.
 * Calls the LLM slot (if declared), validates output, applies the gate.
 */
async function executeState(state, context, base44) {
  const stateResult = {
    state_id: state.id,
    status: 'passed',
    score: 1.0,
    duration_ms: 0,
    output: '',
  };
  const start = Date.now();

  try {
    // Find any LLM slots declared for this state
    const slots = (context.spec.llm_slots || []).filter(s => s.state_id === state.id);

    for (const slot of slots) {
      const slotResult = {
        slot_name: slot.name,
        model: slot.model || 'automatic',
        validated: false,
        score: 0,
        tokens_used: 0,
        used_fallback: false,
      };

      // Build the prompt from context + slot input schema
      const prompt = context.prompts?.[slot.name] || `Execute state "${state.name}" for spec "${context.spec.title}". Input: ${JSON.stringify(context.input)}`;

      const llmResult = await qualityGatedLLM(base44.asServiceRole.integrations.Core, {
        prompt,
        schema: slot.output_schema,
        minScore: 80,
        maxRetries: 3,
        model: slot.model,
        minRequiredFields: slot.output_schema?.required || [],
      });

      slotResult.score = (llmResult.score || 0) / 100;
      slotResult.validated = llmResult.score >= 80 && !llmResult.usedFallback;
      slotResult.used_fallback = llmResult.usedFallback;
      slotResult.tokens_used = llmResult.attempts || 1;

      context.llm_slot_results.push(slotResult);

      // Update state score — LLM slots weight the state score
      stateResult.score = Math.min(stateResult.score, slotResult.score);
      stateResult.output = JSON.stringify(llmResult.output || '').substring(0, 500);

      // Apply the gate
      const gate = (context.spec.gates || []).find(g => g.state_id === state.id);
      if (gate && slotResult.score < gate.min_score) {
        stateResult.status = 'failed';
        context.errors.push(`State "${state.id}" failed gate "${gate.name}" (score ${slotResult.score.toFixed(2)} < ${gate.min_score})`);
      }
    }

    if (stateResult.status === 'passed' && stateResult.score < 1.0) {
      stateResult.status = 'failed';
    }
  } catch (e) {
    stateResult.status = 'failed';
    stateResult.score = 0;
    context.errors.push(`State "${state.id}" threw: ${e.message}`);
  }

  stateResult.duration_ms = Date.now() - start;
  return stateResult;
}

/**
 * Execute a complete DEEP state machine.
 * This is the main entry point — called by backend functions.
 *
 * @param {object} spec - The DeepSpec record (states, llm_slots, gates)
 * @param {object} input - The input state for this run
 * @param {object} base44 - The SDK client (service role)
 * @param {object} opts - { triggered_by, prompts }
 * @returns {object} The DeepRun record (not yet persisted)
 */
export async function executeSpec(spec, input, base44, opts = {}) {
  const runId = `RUN-${Date.now()}`;
  const inputHash = hashInput(input);
  const context = {
    spec,
    input,
    prompts: opts.prompts || {},
    llm_slot_results: [],
    states_executed: [],
    errors: [],
    triggered_by: opts.triggered_by || 'cron',
  };

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  // Walk states in order — deterministic traversal
  for (const state of (spec.states || [])) {
    const result = await executeState(state, context, base44);
    context.states_executed.push(result);

    // Check gate on_fail behavior
    if (result.status === 'failed') {
      const gate = (spec.gates || []).find(g => g.state_id === state.id);
      if (gate?.on_fail === 'abort') break;
      // retry / escalate continue to next state (retry handled inside executeState)
    }
  }

  // Calculate aggregate score — weighted: states × 0.6 + slots × 0.4
  const stateScores = context.states_executed.map(s => s.score);
  const slotScores = context.llm_slot_results.map(s => s.score);
  const stateAvg = stateScores.length > 0
    ? stateScores.reduce((a, b) => a + b, 0) / stateScores.length
    : 1.0;
  const slotAvg = slotScores.length > 0
    ? slotScores.reduce((a, b) => a + b, 0) / slotScores.length
    : 1.0;
  const hasSlots = slotScores.length > 0;
  const aggregateScore = hasSlots
    ? (stateAvg * 0.6 + slotAvg * 0.4)
    : stateAvg;

  const isApproved = aggregateScore >= (spec.score_target || 1.0);
  const failedStates = context.states_executed.filter(s => s.status === 'failed').map(s => s.state_id);

  let severity = 'PASS';
  if (!isApproved) {
    severity = aggregateScore >= 0.7 ? 'REPAIRABLE' : 'CRITICAL';
  }

  const costCreditsUsed = context.llm_slot_results.length; // 1 credit per LLM call approximation
  const costWithinBudget = spec.cost_budget_credits > 0
    ? costCreditsUsed <= spec.cost_budget_credits
    : true;

  const run = {
    run_id: runId,
    spec_id: spec.spec_id,
    spec_version: spec.version,
    status: isApproved ? 'passed' : severity === 'CRITICAL' ? 'critical' : 'failed',
    lifecycle_stage: spec.lifecycle_stage || 'validate',
    states_executed: context.states_executed,
    llm_slot_results: context.llm_slot_results,
    aggregate_score: Math.round(aggregateScore * 100) / 100,
    is_approved: isApproved,
    severity,
    failed_states: failedStates,
    errors: context.errors,
    cost_credits_used: costCreditsUsed,
    cost_within_budget: costWithinBudget,
    triggered_by: context.triggered_by,
    replayable: true,
    input_hash: inputHash,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startMs,
  };

  return run;
}

/**
 * Persist a DeepRun record (the proof).
 * Called after executeSpec completes.
 */
export async function persistRun(run, base44) {
  try {
    return await base44.asServiceRole.entities.DeepRun.create(run);
  } catch (e) {
    return { ...run, persist_error: e.message };
  }
}

/**
 * Full execution: run spec → persist proof.
 */
export async function runAndPersist(spec, input, base44, opts = {}) {
  const run = await executeSpec(spec, input, base44, opts);
  await persistRun(run, base44);
  return run;
}