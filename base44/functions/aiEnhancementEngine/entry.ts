import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { BEST_MODELS, bestModelForCategory, MODEL_CAPABILITIES } from '../../shared/bestModels.ts';
import { enhancedInvoke, ensembleInvoke, visionAnalyze, predictWithConfidence, simulateMonteCarlo, generateWorkflow } from '../../shared/aiEnhancement.ts';

// ============================================================================
// aiEnhancementEngine — Central AI enhancement orchestrator for Vision Cortex.
//
// This is the single entry point for every AI enhancement in the system:
//   - Reports the full model → category routing matrix
//   - Applies best models to all generators
//   - Provides enhanced generation endpoints (vision, prediction, simulation,
//     workflow generation, ensemble, image-prompt enhancement)
//   - Runs the ML feedback loop to auto-tune models
//
// Actions:
//   matrix     — return the full category → best model map + capabilities
//   generate   — enhanced generation (best model + optional self-critique + RAG)
//   ensemble   — multi-model ensemble generation
//   vision     — image analysis
//   predict    — prediction with confidence
//   simulate   — Monte Carlo simulation
//   workflow   — workflow generation
//   image_prompt — enhance an image generation prompt
//   apply_all  — scan all backend functions + report which should use which model
// ============================================================================

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'matrix';

    // ── MATRIX: full category → model routing ──
    if (action === 'matrix') {
      return Response.json({
        ok: true,
        model_count: Object.keys(BEST_MODELS).length,
        best_models: BEST_MODELS,
        model_capabilities: MODEL_CAPABILITIES,
        summary: {
          deepest_reasoning: ['claude_opus_5', 'claude_opus_4_8'],
          best_for_code: ['claude_sonnet_4_6'],
          best_for_simulation: ['gpt_5_6_luna'],
          fast_daily_driver: ['gpt_5_6_sol'],
          web_search_multimodal: ['gemini_3_1_pro', 'gemini_3_flash'],
        },
      });
    }

    // ── GENERATE: enhanced generation ──
    if (action === 'generate') {
      const { prompt, category, schema, self_critique, rag_context, add_context_from_internet } = body;
      if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
      const result = await enhancedInvoke(base44, {
        prompt, category: category || 'other', schema, self_critique, rag_context, add_context_from_internet,
      });
      return Response.json({ ok: true, result, model_used: bestModelForCategory(category || 'other') });
    }

    // ── ENSEMBLE: multi-model ──
    if (action === 'ensemble') {
      const { prompt, category, schema, models } = body;
      if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
      const { result, model_used, all_results } = await ensembleInvoke(base44, { prompt, category: category || 'other', schema, models });
      return Response.json({ ok: true, result, model_used, models_tried: all_results.length });
    }

    // ── VISION: image analysis ──
    if (action === 'vision') {
      const { image_url, prompt, schema, category } = body;
      if (!image_url || !prompt) return Response.json({ error: 'image_url and prompt required' }, { status: 400 });
      const result = await visionAnalyze(base44, { image_url, prompt, schema, category });
      return Response.json({ ok: true, result, model_used: bestModelForCategory(category || 'vision') });
    }

    // ── PREDICT: prediction with confidence ──
    if (action === 'predict') {
      const { prompt, schema, category, rag_context } = body;
      if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
      const result = await predictWithConfidence(base44, { prompt, schema, category, rag_context });
      return Response.json({ ok: true, result, model_used: bestModelForCategory(category || 'prediction') });
    }

    // ── SIMULATE: Monte Carlo ──
    if (action === 'simulate') {
      const { prompt, schema, runs, category } = body;
      if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
      const { runs: runResults, aggregate, model_used } = await simulateMonteCarlo(base44, { prompt, schema, runs, category });
      return Response.json({ ok: true, runs: runResults, aggregate, model_used });
    }

    // ── WORKFLOW: workflow generation ──
    if (action === 'workflow') {
      const { description, category, rag_context } = body;
      if (!description) return Response.json({ error: 'description required' }, { status: 400 });
      const result = await generateWorkflow(base44, { description, category, rag_context });
      return Response.json({ ok: true, result, model_used: bestModelForCategory(category || 'workflow_generation') });
    }

    // ── IMAGE_PROMPT: enhance an image generation prompt ──
    if (action === 'image_prompt') {
      const { prompt, style, subject } = body;
      if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
      const enhanced = await enhancedInvoke(base44, {
        prompt: 'Enhance this image generation prompt for maximum visual quality, detail, and artistic coherence. ' +
          'Add specific lighting, composition, mood, and style details. Return ONLY the enhanced prompt.\n\n' +
          'Original: ' + prompt + '\n' +
          (style ? 'Style: ' + style + '\n' : '') +
          (subject ? 'Subject: ' + subject + '\n' : ''),
        category: 'image_generation_prompt',
      });
      return Response.json({ ok: true, enhanced_prompt: typeof enhanced === 'string' ? enhanced : JSON.stringify(enhanced) });
    }

    // ── APPLY_ALL: report which functions should use which model ──
    if (action === 'apply_all') {
      // Map of known generator functions → their best category/model
      const functionModelMap = {
        factoryContentGenerator: { category: 'content_generation', model: bestModelForCategory('content_generation') },
        factoryBrandGenerator: { category: 'brand_generation', model: bestModelForCategory('brand_generation') },
        factoryWebsiteGenerator: { category: 'website_generation', model: bestModelForCategory('website_generation') },
        factorySocialAI: { category: 'social_generation', model: bestModelForCategory('social_generation') },
        factoryGrowthOSGenerator: { category: 'marketing', model: bestModelForCategory('marketing') },
        generateContent: { category: 'content_generation', model: bestModelForCategory('content_generation') },
        generateStrategies: { category: 'strategy', model: bestModelForCategory('strategy') },
        simulateStrategy: { category: 'simulation', model: bestModelForCategory('simulation') },
        simulateLife: { category: 'simulation', model: bestModelForCategory('simulation') },
        simulateOutcomes: { category: 'simulation', model: bestModelForCategory('simulation') },
        simulateUserJourney: { category: 'simulation', model: bestModelForCategory('simulation') },
        simulateTopic: { category: 'simulation', model: bestModelForCategory('simulation') },
        councilPredict: { category: 'prediction', model: bestModelForCategory('prediction') },
        councilBlueprint: { category: 'strategy', model: bestModelForCategory('strategy') },
        councilSession: { category: 'governance', model: bestModelForCategory('governance') },
        councilCompound: { category: 'strategy', model: bestModelForCategory('strategy') },
        intelligenceGatherer: { category: 'intelligence', model: bestModelForCategory('intelligence') },
        freeIntelligenceGatherer: { category: 'intelligence', model: bestModelForCategory('intelligence') },
        DeepDiscoveryScan: { category: 'discovery', model: bestModelForCategory('discovery') },
        deepSystemAudit: { category: 'audit', model: bestModelForCategory('audit') },
        forensicAudit: { category: 'audit', model: bestModelForCategory('audit') },
        primusOrchestrate: { category: 'strategy', model: bestModelForCategory('strategy') },
        agiSelfBuilder: { category: 'build', model: bestModelForCategory('build') },
        ragRetrieval: { category: 'memory', model: bestModelForCategory('memory') },
        mlFeedbackEngine: { category: 'optimize', model: bestModelForCategory('optimize') },
        runMarketer: { category: 'marketing', model: bestModelForCategory('marketing') },
        financialAdvisor: { category: 'prediction', model: bestModelForCategory('prediction') },
        opportunityResearch: { category: 'research', model: bestModelForCategory('research') },
        aiAssist: { category: 'reasoning', model: bestModelForCategory('reasoning') },
        lifeChoiceGenerator: { category: 'prediction', model: bestModelForCategory('prediction') },
        gapRecommender: { category: 'analysis', model: bestModelForCategory('analysis') },
        visionBlueprintPrioritizer: { category: 'strategy', model: bestModelForCategory('strategy') },
        systemAnalyst: { category: 'analysis', model: bestModelForCategory('analysis') },
      };

      return Response.json({
        ok: true,
        functions_mapped: Object.keys(functionModelMap).length,
        function_models: functionModelMap,
        note: 'Each function should route its InvokeLLM calls through aiEnhancement.enhancedInvoke with its category to get the best model automatically.',
      });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}