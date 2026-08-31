import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// generateStrategies — takes a vision sentence (+ optional goal) and generates
// 210 distinct, launchable business strategies across 7 archetypes (30 each),
// then recommends the single best one with reasoning.
const ARCHETYPES = [
  'SaaS / software tools',
  'Content / media / creator economy',
  'E-commerce / DTC / physical products',
  'Marketplace / platform / network',
  'AI tools / automation agents',
  'Services / consulting / agency',
  'Community / membership / subscription',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const vision = String(body.vision || '').slice(0, 1000);
    const goal = body.goal || null;
    const goalStr = goal ? ` The owner's goal: ${goal.kind || 'residual income'} → ${goal.value || ''} by ${goal.by_horizon || '1 year'}.` : '';

    const batches = await Promise.all(ARCHETYPES.map(async (arch) => {
      const prompt = `You are a master business strategist. The user's vision: "${vision}".${goalStr}
Generate 30 distinct, realistic, launchable business strategies in the "${arch}" archetype. Each must be specific to the vision — not generic. Vary them across risk, capital, speed, and angle.
For each strategy capture:
- title (concise product/business name)
- one_liner (one sentence value prop)
- score (0-100, overall conviction given the vision and goal)
- time_to_profit_days (realistic days to first profit)
- capital_required_usd (realistic USD to launch)
- why (one sentence on why it fits the vision)
Return JSON: { "items": [ ...30 objects... ] }`;
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  one_liner: { type: 'string' },
                  score: { type: 'number' },
                  time_to_profit_days: { type: 'number' },
                  capital_required_usd: { type: 'number' },
                  why: { type: 'string' },
                },
                required: ['title', 'one_liner'],
              },
            },
          },
          required: ['items'],
        },
      });
      return (res.items || []).map((s) => ({ ...s, archetype: arch }));
    }));

    const all = batches.flat().map((s, i) => ({ id: i + 1, ...s }));
    all.sort((a, b) => (b.score || 0) - (a.score || 0));
    const best = all[0];

    let reasoning = '';
    if (best) {
      const recRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `A user's vision: "${vision}".${goalStr} Out of 210 generated strategies, the top-scoring one is "${best.title}" — ${best.one_liner} (score ${best.score}/100, archetype ${best.archetype}). Explain in 2-3 sentences why this is the strongest strategy for this vision and goal. Return JSON: { "reasoning": string }`,
        response_json_schema: {
          type: 'object',
          properties: { reasoning: { type: 'string' } },
          required: ['reasoning'],
        },
      });
      reasoning = recRes?.reasoning || '';
    }

    return Response.json({
      strategies: all,
      count: all.length,
      recommendation: { strategy_id: best?.id || null, reasoning },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}