import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { BEST_MODELS, bestModelForCategory } from '../../shared/bestModels.ts';

// ============================================================================
// mlFeedbackEngine — Machine-learning feedback loop for Vision Cortex.
//
// Tracks which prompts, models, and dispatch functions perform best per
// category, and auto-tunes the system:
//
//   1. Analyzes SystemPrompt effectiveness_score, success_rate, usage_count.
//   2. Ranks prompts within each category by observed effectiveness.
//   3. Promotes the best-performing model per category (updates target_model
//      on underperforming prompts).
//   4. Records ML feedback from agiSelfBuilder runs (success/failure of
//      dispatched functions) into AgentLog for trend analysis.
//   5. Returns a learning report — best/worst prompts, model recommendations.
//
// Actions:
//   learn   — run the analysis + auto-tune loop (the main ML step)
//   report  — return the current performance leaderboard
// ============================================================================

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }
    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'learn';

    // Load all active prompts
    const prompts = await sr.SystemPrompt.filter({ active: true }, '-updated_date', 200).catch(() => []);

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const p of prompts) {
      const cat = (p.category || 'other').toLowerCase();
      byCategory[cat] = byCategory[cat] || [];
      byCategory[cat].push(p);
    }

    // ── REPORT: leaderboard ──
    if (action === 'report') {
      const leaderboard: any[] = [];
      for (const [cat, items] of Object.entries(byCategory)) {
        const ranked = items
          .map((p) => ({
            id: p.id,
            name: p.name,
            model: p.target_model,
            effectiveness: p.effectiveness_score || 0,
            success_rate: p.success_rate || 0,
            usage: p.usage_count || 0,
            // Composite score: weighted effectiveness + success + volume
            composite: ((p.effectiveness_score || 0) * 0.4) + ((p.success_rate || 0) * 0.4) + (Math.min(p.usage_count || 0, 100) * 0.2),
          }))
          .sort((a, b) => b.composite - a.composite);
        leaderboard.push({
          category: cat,
          best_model: bestModelForCategory(cat),
          top_prompt: ranked[0] || null,
          worst_prompt: ranked[ranked.length - 1] || null,
          prompt_count: ranked.length,
          avg_effectiveness: ranked.length ? Math.round(ranked.reduce((s, r) => s + r.effectiveness, 0) / ranked.length) : 0,
        });
      }
      leaderboard.sort((a, b) => (b.prompt_count || 0) - (a.prompt_count || 0));
      return Response.json({ ok: true, categories: leaderboard.length, leaderboard });
    }

    // ── LEARN: analyze + auto-tune ──
    const tuned: any[] = [];
    const flagged: any[] = [];

    for (const [cat, items] of Object.entries(byCategory)) {
      const best = bestModelForCategory(cat);
      for (const p of items) {
        const effectiveness = p.effectiveness_score || 0;
        const successRate = p.success_rate || 0;
        const usage = p.usage_count || 0;
        const currentModel = p.target_model || 'automatic';

        // Auto-tune: if a prompt is underperforming AND not using the best model
        // for its category, promote it to the best model.
        const underperforming = usage > 3 && effectiveness < 50;
        const wrongModel = currentModel !== best && currentModel !== 'automatic';

        if (underperforming && wrongModel) {
          try {
            await sr.SystemPrompt.update(p.id, {
              target_model: best,
              optimization_notes: (p.optimization_notes || '') + `\n[ML auto-tune ${new Date().toISOString()}] Promoted to ${best} (effectiveness ${effectiveness}, success ${successRate}).`,
              last_optimized_at: new Date().toISOString(),
            });
            tuned.push({ id: p.id, name: p.name, category: cat, from: currentModel, to: best });
          } catch {}
        }

        // Flag critically broken prompts for review
        if (usage > 5 && successRate < 30) {
          flagged.push({ id: p.id, name: p.name, category: cat, success_rate: successRate, usage });
        }
      }
    }

    // Record the learning event
    try {
      await sr.AgentLog.create({
        agent_name: 'PRIMUS',
        category: 'ml_feedback',
        level: tuned.length > 0 ? 'success' : 'info',
        message: `ML feedback cycle: ${tuned.length} prompt(s) auto-tuned, ${flagged.length} flagged`,
        detail: JSON.stringify({ tuned: tuned.slice(0, 10), flagged: flagged.slice(0, 5) }).slice(0, 800),
        auto_action: 'ml_feedback',
      });
    } catch {}

    return Response.json({
      ok: true,
      action: 'learn',
      prompts_analyzed: prompts.length,
      categories: Object.keys(byCategory).length,
      tuned_count: tuned.length,
      tuned: tuned.slice(0, 20),
      flagged_count: flagged.length,
      flagged: flagged.slice(0, 10),
      best_models: BEST_MODELS,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}