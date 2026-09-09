// ============================================================================
// bestModels — Category → best LLM model routing map for Vision Cortex.
// Used by agiSelfBuilder, ragRetrieval, mlFeedbackEngine, and any function
// that needs the optimal model for a given task category.
//
// Models available on Base44 Core InvokeLLM:
//   automatic, gpt_5_mini, gemini_3_flash, gpt_5_4, gpt_5_6_sol, gpt_5_6_luna,
//   gemini_3_1_pro, claude_sonnet_4_6, claude_opus_4_6, claude_opus_4_7,
//   claude_opus_4_8, claude_opus_5, claude-sonnet-5
// ============================================================================

export const BEST_MODELS: Record<string, string> = {
  // Deep reasoning / analysis → deepest models
  audit: 'claude_opus_4_8',
  reflection: 'claude_opus_4_8',
  prediction: 'claude_opus_4_8',
  strategy: 'claude_opus_5',
  governance: 'claude_opus_5',
  build: 'claude_opus_4_8',

  // Code / precise implementation → sonnet (best code fidelity)
  heal: 'claude_sonnet_4_6',
  harden: 'claude_sonnet_4_6',
  coding: 'claude_sonnet_4_6',
  clone: 'claude_sonnet_4_6',

  // Advanced reasoning / optimization
  optimize: 'gpt_5_6_luna',
  simulation: 'gpt_5_6_luna',

  // Fast daily-driver
  manage: 'gpt_5_6_sol',
  communication: 'gpt_5_6_sol',
  memory: 'gpt_5_6_sol',
  provision: 'gpt_5_6_sol',
  scraping: 'gpt_5_6_sol',

  // Long context + web search
  intelligence: 'gemini_3_1_pro',
  discovery: 'gemini_3_1_pro',

  // Fallback
  other: 'gpt_5_6_sol',
};

export function bestModelForCategory(category: string): string {
  if (!category) return BEST_MODELS.other;
  return BEST_MODELS[category.toLowerCase()] || BEST_MODELS.other;
}

// Map a blueprint layer to a category (for agiSelfBuilder spec generation)
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