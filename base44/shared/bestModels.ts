// ============================================================================
// bestModels — Comprehensive category → best LLM model routing map.
// Covers every AI task type in Vision Cortex: generators, voice, vision,
// simulators, predictors, image generation, workflow generators, and more.
// ============================================================================

export const BEST_MODELS: Record<string, string> = {
  // ── Deep reasoning / analysis (deepest models) ──
  audit: 'claude_opus_4_8',
  reflection: 'claude_opus_4_8',
  prediction: 'claude_opus_4_8',
  forecasting: 'claude_opus_4_8',
  analysis: 'claude_opus_4_8',
  reasoning: 'claude_opus_4_8',
  strategy: 'claude_opus_5',
  governance: 'claude_opus_5',
  build: 'claude_opus_4_8',
  architecture: 'claude_opus_4_8',

  // ── Code / precise implementation (sonnet = best code fidelity) ──
  heal: 'claude_sonnet_4_6',
  harden: 'claude_sonnet_4_6',
  coding: 'claude_sonnet_4_6',
  code_generation: 'claude_sonnet_4_6',
  clone: 'claude_sonnet_4_6',
  website_generation: 'claude_sonnet_4_6',
  workflow_generation: 'claude_opus_4_8',

  // ── Advanced reasoning / optimization / simulation ──
  optimize: 'gpt_5_6_luna',
  optimization: 'gpt_5_6_luna',
  simulation: 'gpt_5_6_luna',
  simulate: 'gpt_5_6_luna',
  creative: 'gpt_5_6_luna',

  // ── Fast daily-driver (cost-efficient) ──
  manage: 'gpt_5_6_sol',
  communication: 'gpt_5_6_sol',
  memory: 'gpt_5_6_sol',
  provision: 'gpt_5_6_sol',
  scraping: 'gpt_5_6_sol',
  content_generation: 'gpt_5_6_sol',
  social_generation: 'gpt_5_6_sol',
  marketing: 'gpt_5_6_sol',
  summarization: 'gpt_5_6_sol',
  translation: 'gpt_5_6_sol',
  classification: 'gpt_5_6_sol',
  extraction: 'gpt_5_6_sol',
  email_generation: 'gpt_5_6_sol',
  template_generation: 'gpt_5_6_sol',

  // ── Long context + web search (Gemini) ──
  intelligence: 'gemini_3_1_pro',
  discovery: 'gemini_3_1_pro',
  research: 'gemini_3_1_pro',
  web_search: 'gemini_3_1_pro',

  // ── Vision / multimodal ──
  vision: 'gemini_3_1_pro',
  image_analysis: 'gemini_3_1_pro',
  image_generation_prompt: 'claude_opus_4_8',
  ocr: 'gemini_3_1_pro',

  // ── Brand / creative direction (deep taste) ──
  brand_generation: 'claude_opus_4_8',
  design: 'claude_opus_4_8',
  copywriting: 'gpt_5_6_luna',

  // ── Voice (scripting + persona — the realtime model is fixed) ──
  voice: 'claude_opus_4_8',
  voice_scripting: 'claude_opus_4_8',
  persona: 'claude_opus_4_8',
  conversation: 'gpt_5_6_sol',

  // ── Fallback ──
  other: 'gpt_5_6_sol',
};

export function bestModelForCategory(category: string): string {
  if (!category) return BEST_MODELS.other;
  const lower = category.toLowerCase();
  return BEST_MODELS[lower] || BEST_MODELS.other;
}

// Map a blueprint layer to a category
export const LAYER_TO_CATEGORY: Record<number, string> = {
  1: 'build',
  2: 'memory',
  3: 'build',
  4: 'manage',
  5: 'governance',
  6: 'strategy',
  7: 'coding',
};

export function categoryForLayer(layer: number): string {
  return LAYER_TO_CATEGORY[layer] || 'build';
}

// Model capability metadata — which models support which features
export const MODEL_CAPABILITIES: Record<string, { vision: boolean; web_search: boolean; long_context: boolean; code: boolean; reasoning_depth: number }> = {
  claude_opus_5: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 5 },
  claude_opus_4_8: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 5 },
  claude_opus_4_7: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 4 },
  claude_opus_4_6: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 4 },
  claude_sonnet_4_6: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 3 },
  'claude-sonnet-5': { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 3 },
  gpt_5_6_luna: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 4 },
  gpt_5_6_sol: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 3 },
  gpt_5_4: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 3 },
  gpt_5_mini: { vision: true, web_search: false, long_context: false, code: true, reasoning_depth: 2 },
  gemini_3_1_pro: { vision: true, web_search: true, long_context: true, code: true, reasoning_depth: 4 },
  gemini_3_flash: { vision: true, web_search: true, long_context: true, code: true, reasoning_depth: 2 },
  automatic: { vision: true, web_search: false, long_context: true, code: true, reasoning_depth: 3 },
};