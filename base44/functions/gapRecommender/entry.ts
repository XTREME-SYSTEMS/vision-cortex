import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ═══════════════════════════════════════════════════════════════
// gapRecommender — the AI engine behind the Gaps page.
// Modes:
//   "recommend"      — generate recommendation + implementation code for one gap
//   "recommend_all"  — generate recommendations for all gaps missing one
//   "apply"          — mark a gap as applied (code staged, ready for builder to deploy)
//   "validate"       — run auditDestinyEngine and store the validation result on the gap
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'recommend';
    const core = base44.asServiceRole.integrations.Core;

    // ── VALIDATE: run the audit and store the result on the gap ──
    if (mode === 'validate') {
      const gap = await base44.entities.Gap.get(body.gap_id);
      if (!gap) return Response.json({ error: 'Gap not found' }, { status: 404 });

      let score = 0;
      let passed = false;
      let notes = 'Audit ran successfully.';
      try {
        const auditRes = await base44.functions.invoke('auditDestinyEngine', {});
        score = auditRes?.report?.score ?? auditRes?.score ?? 0;
        passed = !!auditRes?.report?.passed;
        const failures = auditRes?.report?.failures || auditRes?.failures || [];
        notes = failures.length > 0 ? failures.join('; ') : (auditRes?.report?.verdict || 'Audit passed with no failures.');
      } catch (e) {
        notes = `Audit invocation error: ${e.message}`;
      }

      const updated = await base44.entities.Gap.update(body.gap_id, {
        status: 'validated',
        validation_result: { passed, score, notes },
      });

      return Response.json({ gap: updated, validation: { passed, score, notes } });
    }

    // ── APPLY: mark as applied, store timestamp ──
    if (mode === 'apply') {
      const gap = await base44.entities.Gap.get(body.gap_id);
      if (!gap) return Response.json({ error: 'Gap not found' }, { status: 404 });
      const updated = await base44.entities.Gap.update(body.gap_id, {
        status: 'applied',
        applied_at: new Date().toISOString(),
      });
      await base44.entities.AgentLog.create({
        agent_name: 'Gap Engine',
        level: 'success',
        category: 'gap_applied',
        message: `Gap #${gap.number} "${gap.title}" marked as applied.`,
      });
      return Response.json({ gap: updated });
    }

    // ── RECOMMEND (single) or RECOMMEND_ALL ──
    let gapsToProcess = [];
    if (mode === 'recommend_all') {
      const all = await base44.entities.Gap.list('-number', 100);
      gapsToProcess = all.filter((g) => !g.recommendation);
    } else {
      const gap = await base44.entities.Gap.get(body.gap_id);
      if (!gap) return Response.json({ error: 'Gap not found' }, { status: 404 });
      gapsToProcess = [gap];
    }

    if (gapsToProcess.length === 0) {
      return Response.json({ message: 'No gaps need recommendations.', updated: [] });
    }

    const results = [];
    for (const gap of gapsToProcess) {
      const res = await core.InvokeLLM({
        prompt: `You are the autonomous improvement engine for Vision Cortex — an AI business-creation platform on Base44 (React + Tailwind frontend, backend functions in base44/functions/, entities as JSON schemas in base44/entities/).

A system gap has been identified:

TITLE: ${gap.title}
DESCRIPTION: ${gap.description}
CATEGORY: ${gap.category}
SEVERITY: ${gap.severity}

Generate a concrete, actionable plan to fix this gap. Be specific to the Vision Cortex architecture (it has: Idea, BuildQueue, Simulation, AgentProfile, Doctrine, LifePlan, PersonaProfile entities; functions like runDestinyCycle, generateStrategies, runMarketer, launchPipelineBuild, auditDestinyEngine; a Destiny Flow wizard; a Life Lab Monte Carlo simulator).

Produce:
1. recommendation — a clear 2-3 sentence actionable recommendation
2. implementation_steps — 3-6 concrete steps
3. implementation_code — the ACTUAL code needed (a complete backend function entry.ts, or a React component, or an entity schema, or modifications). Make it real, runnable code — not pseudocode. If it's a new backend function, include the full file. If it's a frontend change, include the JSX. This code should be directly deployable.
4. affected_files — list of file paths that would be created or modified
5. estimated_effort — "small" | "medium" | "large"`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            recommendation: { type: 'string' },
            implementation_steps: { type: 'array', items: { type: 'string' } },
            implementation_code: { type: 'string' },
            affected_files: { type: 'array', items: { type: 'string' } },
            estimated_effort: { type: 'string' },
          },
          required: ['recommendation', 'implementation_steps', 'implementation_code'],
        },
      });

      const updated = await base44.entities.Gap.update(gap.id, {
        recommendation: res.recommendation,
        implementation_steps: res.implementation_steps,
        implementation_code: res.implementation_code,
        affected_files: res.affected_files,
        estimated_effort: res.estimated_effort || 'medium',
        status: 'recommended',
      });
      results.push({ id: gap.id, title: gap.title, status: 'recommended' });
    }

    await base44.entities.AgentLog.create({
      agent_name: 'Gap Engine',
      level: 'info',
      category: 'gap_recommend',
      message: `Generated AI recommendations for ${results.length} gap(s).`,
    });

    return Response.json({ updated: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}