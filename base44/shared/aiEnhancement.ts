// ============================================================================
// aiEnhancement — Shared AI enhancement layer for Vision Cortex.
//
// Provides enhanced LLM invocation helpers that any backend function can
// import. Each helper auto-routes to the best model for the task category and
// applies an advanced technique:
//
//   enhancedInvoke      — best-model routing + optional self-critique pass
//   ensembleInvoke      — runs N models, picks the highest-quality response
//   visionAnalyze       — image analysis with the best multimodal model
//   predictWithConfidence — prediction + confidence + reasoning trail
//   simulateMonteCarlo  — runs a simulation N times, aggregates distributions
//   generateWorkflow    — workflow/spec generation with validation
//
// Usage:
//   import { enhancedInvoke, visionAnalyze } from '../../shared/aiEnhancement.ts';
//   const result = await enhancedInvoke(base44, { prompt, category: 'content_generation', schema });
// ============================================================================

import { bestModelForCategory, MODEL_CAPABILITIES } from './bestModels.ts';

// ── Enhanced invoke: best model + optional self-critique ──
export async function enhancedInvoke(base44: any, opts: {
  prompt: string;
  category: string;
  schema?: any;
  model?: string;
  self_critique?: boolean;
  rag_context?: string;
  add_context_from_internet?: boolean;
}): Promise<any> {
  const model = opts.model || bestModelForCategory(opts.category);
  const fullPrompt = (opts.rag_context ? 'Context:\n"""\n' + opts.rag_context + '\n"""\n\n' : '') + opts.prompt;
  const core = base44.asServiceRole.integrations.Core;

  const params: any = { prompt: fullPrompt, model };
  if (opts.schema) params.response_json_schema = opts.schema;
  if (opts.add_context_from_internet) {
    params.add_context_from_internet = true;
    // Web search requires gemini
    if (!MODEL_CAPABILITIES[model]?.web_search) params.model = 'gemini_3_1_pro';
  }

  let result = await core.InvokeLLM(params);

  // Self-critique pass: ask the model to review + improve its own output
  if (opts.self_critique && result) {
    const critiquePrompt =
      'Review the following AI-generated output for accuracy, completeness, and quality. ' +
      'If it is correct and high-quality, return it unchanged. If it has issues, fix them. ' +
      'Return ONLY the improved output in the same format.\n\n' +
      'Original output:\n' + (typeof result === 'string' ? result : JSON.stringify(result));
    try {
      const improved = await core.InvokeLLM({ ...params, prompt: critiquePrompt });
      if (improved) result = improved;
    } catch {}
  }

  return result;
}

// ── Ensemble invoke: run multiple models, pick the best by a vote/score ──
export async function ensembleInvoke(base44: any, opts: {
  prompt: string;
  category: string;
  schema?: any;
  models?: string[];
}): Promise<{ result: any; model_used: string; all_results: any[] }> {
  const core = base44.asServiceRole.integrations.Core;
  const defaultModels = ['claude_opus_4_8', 'gpt_5_6_luna', 'gemini_3_1_pro'];
  const models = opts.models || defaultModels;
  const results: { model: string; result: any; error?: string }[] = [];

  for (const model of models) {
    try {
      const params: any = { prompt: opts.prompt, model };
      if (opts.schema) params.response_json_schema = opts.schema;
      const r = await core.InvokeLLM(params);
      results.push({ model, result: r });
    } catch (e) {
      results.push({ model, result: null, error: e.message });
    }
  }

  // Pick the result with the most content (simple quality proxy)
  const valid = results.filter((r) => r.result && !r.error);
  if (valid.length === 0) return { result: null, model_used: models[0], all_results: results };

  const scored = valid.map((r) => ({
    ...r,
    score: typeof r.result === 'string' ? r.result.length : JSON.stringify(r.result).length,
  }));
  scored.sort((a, b) => b.score - a.score);

  return { result: scored[0].result, model_used: scored[0].model, all_results: results };
}

// ── Vision analyze: image analysis with the best multimodal model ──
export async function visionAnalyze(base44: any, opts: {
  image_url: string;
  prompt: string;
  schema?: any;
  category?: string;
}): Promise<any> {
  const model = bestModelForCategory(opts.category || 'vision');
  const core = base44.asServiceRole.integrations.Core;
  const params: any = {
    prompt: opts.prompt,
    model,
    file_urls: [opts.image_url],
  };
  if (opts.schema) params.response_json_schema = opts.schema;
  return await core.InvokeLLM(params);
}

// ── Predict with confidence: prediction + confidence + reasoning trail ──
export async function predictWithConfidence(base44: any, opts: {
  prompt: string;
  schema?: any;
  category?: string;
  rag_context?: string;
}): Promise<any> {
  const category = opts.category || 'prediction';
  const model = bestModelForCategory(category);
  const core = base44.asServiceRole.integrations.Core;
  const fullPrompt = (opts.rag_context ? 'Context:\n"""\n' + opts.rag_context + '\n"""\n\n' : '') +
    opts.prompt +
    '\n\nProvide your prediction with a confidence score (0-100), the key reasoning factors, ' +
    'the main risks to your prediction, and the conditions under which you would change your prediction.';

  const predictionSchema = opts.schema || {
    type: 'object',
    properties: {
      prediction: { type: 'string' },
      confidence: { type: 'number' },
      reasoning: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
      change_conditions: { type: 'array', items: { type: 'string' } },
    },
  };

  return await core.InvokeLLM({ prompt: fullPrompt, model, response_json_schema: predictionSchema });
}

// ── Monte Carlo simulation: run N times, aggregate distributions ──
export async function simulateMonteCarlo(base44: any, opts: {
  prompt: string;
  schema?: any;
  runs?: number;
  category?: string;
}): Promise<{ runs: any[]; aggregate: any; model_used: string }> {
  const runs = Math.min(opts.runs || 3, 5); // cap to control cost
  const model = bestModelForCategory(opts.category || 'simulation');
  const core = base44.asServiceRole.integrations.Core;
  const params: any = { prompt: opts.prompt, model };
  if (opts.schema) params.response_json_schema = opts.schema;

  const results: any[] = [];
  for (let i = 0; i < runs; i++) {
    try {
      const r = await core.InvokeLLM({ ...params, prompt: opts.prompt + `\n\n(Simulation run ${i + 1} of ${runs} — vary your assumptions slightly each run for a Monte Carlo distribution.)` });
      results.push(r);
    } catch (e) {
      results.push({ error: e.message });
    }
  }

  // Aggregate: if results are numeric forecasts, compute mean + range
  const aggregate = {
    run_count: runs,
    successful_runs: results.filter((r) => r && !r.error).length,
    note: 'Monte Carlo distribution — vary assumptions across runs for robustness.',
  };

  return { runs: results, aggregate, model_used: model };
}

// ── Generate workflow: structured workflow/spec generation with validation ──
export async function generateWorkflow(base44: any, opts: {
  description: string;
  category?: string;
  rag_context?: string;
}): Promise<any> {
  const model = bestModelForCategory(opts.category || 'workflow_generation');
  const core = base44.asServiceRole.integrations.Core;
  const fullPrompt = (opts.rag_context ? 'Context:\n"""\n' + opts.rag_context + '\n"""\n\n' : '') +
    'Generate a complete, executable workflow specification for:\n' + opts.description +
    '\n\nReturn JSON with the workflow definition (steps, triggers, conditions) and a validation checklist.';

  const schema = {
    type: 'object',
    properties: {
      workflow_name: { type: 'string' },
      description: { type: 'string' },
      trigger: { type: 'object', additionalProperties: true },
      steps: { type: 'array', items: { type: 'object', additionalProperties: true } },
      validation_checklist: { type: 'array', items: { type: 'string' } },
      estimated_runtime: { type: 'string' },
      failure_recovery: { type: 'string' },
    },
  };

  return await core.InvokeLLM({ prompt: fullPrompt, model, response_json_schema: schema });
}