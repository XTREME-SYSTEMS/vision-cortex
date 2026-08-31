import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { taxonomyContext, LIFE_EVENTS } from '../../shared/humanTaxonomy.ts';

// simulateLife — the profound core. Takes a vision, a chosen strategy, a persona
// (from personal onboarding), a time horizon, and an optional set of user choice
// overrides. Generates a realistic life timeline with:
//   - financial projection (net worth, income, expenses per period)
//   - life events (death, divorce, depression cycles, windfalls) with probabilities
//   - interactive decision points (the AI recommends the best choice; the user can
//     override any decision, which re-runs the simulation and changes the outcome)
//   - three outcome scenarios (conservative / base / aggressive) with final net worth
//
// The human variables the user described are modeled: riskier vision → higher
// investment variance; marriage → divorce risk (men lose more, depression/rebuild);
// age → death probability; ADHD → hyperfocus + impulsivity events; conditions and
// decision style shape the decision points and their financial impact.

const HORIZONS = {
  '1m': { periods: 4, unit: 'week' },
  '3m': { periods: 3, unit: 'month' },
  '6m': { periods: 6, unit: 'month' },
  '1y': { periods: 12, unit: 'month' },
  '2y': { periods: 8, unit: 'quarter' },
  '3y': { periods: 12, unit: 'quarter' },
  '5y': { periods: 5, unit: 'year' },
  '10y': { periods: 10, unit: 'year' },
  '15y': { periods: 15, unit: 'year' },
  '20y': { periods: 20, unit: 'year' },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const horizon = HORIZONS[body.horizon] ? body.horizon : '1y';
    const cfg = HORIZONS[horizon];
    const vision = String(body.vision || '').slice(0, 800);
    const strategy = body.strategy || {};
    const persona = body.persona || {};
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const lifeVars = body.lifeVariables || {};

    const periodLabels = Array.from({ length: cfg.periods }, (_, i) => `${cfg.unit} ${i + 1}`);
    const choicesBlock = choices.length
      ? `\nThe user has OVERRIDDEN these decisions (honor them exactly and let them reshape the downstream timeline and finances):\n${choices.map((c) => `- ${c.prompt} → user chose: "${c.choice}"`).join('\n')}`
      : '';

    const prompt = `You are a rigorous life-simulation engine grounded in behavioral science, psychology, and finance. Simulate one realistic human future.

VISION: "${vision}"
STRATEGY: ${strategy.title || ''} — ${strategy.one_liner || ''}
  archetype: ${strategy.archetype || ''}, capital required: $${strategy.capital_required_usd || 0}, time to profit: ${strategy.time_to_profit_days || 0} days
PERSONA:
  archetype: ${persona.archetype || 'unknown'}
  decision style: ${persona.decision_style || 'unknown'}
  risk tolerance: ${persona.risk_tolerance || 'medium'}
  conditions: ${(persona.conditions || []).join(', ') || 'none'}
  relationship status: ${persona.relationship_status || 'unknown'}
  strengths: ${(persona.strengths || []).join(', ')}
  blind spots: ${(persona.blind_spots || []).join(', ')}
  summary: ${persona.summary || ''}
HORIZON: ${horizon} — ${cfg.periods} ${cfg.unit} periods: ${periodLabels.join(', ')}
LIFE VARIABLES (user-set): ${JSON.stringify(lifeVars)}
${choicesBlock}

REFERENCE TAXONOMY:
${taxonomyContext()}

MODEL THESE HUMAN REALITIES (use them, don't just list them):
- Risk: a riskier vision means higher investment and higher variance — can enhance the outcome OR lose it all on a bad break.
- Marriage: if married, ~42% divorce probability over a long horizon; men typically lose ~50% of assets and face a depression/rebuild cycle (3-9 month productivity collapse, then recovery).
- Aging: probability of a death in the family rises with horizon length.
- ADHD: include possible hyperfocus breakthroughs (big productive windows) AND impulsivity missteps.
- Bipolar/hypomania: include possible manic highs (big wins) and depressive troughs.
- Habits: 66% of behavior is habitual; sustained outcomes come from loop changes, not willpower spikes.
- Decision style shapes how the person navigates the decision points you generate.

GENERATE:
1. timeline: ${cfg.periods} periods, each with { label, net_worth, income, expenses, event }.
   - net_worth is cumulative (starts negative if capital is invested).
   - event is a short string describing what happened that period (may be "").
2. decision_points: 3-5 key decisions across the horizon. Each: { id, period_label, prompt, options (3-4 strings), ai_choice (the best option), rationale (why), financial_impact (estimate) }.
   - If the user overrode a decision, set ai_choice to the user's choice and note it.
3. life_events: 0-4 events that occur, each { kind, period_label, probability (0-100), description, financial_impact }.
   - Draw from: ${LIFE_EVENTS.map((e) => e.kind).join(', ')}.
4. outcomes: 3 scenarios { scenario: conservative|base|aggressive, final_net_worth, probability (0-100), summary }.
5. summary: 2-3 sentences on the most likely path and the single biggest risk.

Be realistic — no vanity numbers. Net worth can go negative. Return JSON matching the schema.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                net_worth: { type: 'number' },
                income: { type: 'number' },
                expenses: { type: 'number' },
                event: { type: 'string' },
              },
              required: ['label', 'net_worth'],
            },
          },
          decision_points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                period_label: { type: 'string' },
                prompt: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                ai_choice: { type: 'string' },
                rationale: { type: 'string' },
                financial_impact: { type: 'string' },
              },
              required: ['id', 'prompt', 'options', 'ai_choice'],
            },
          },
          life_events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string' },
                period_label: { type: 'string' },
                probability: { type: 'number' },
                description: { type: 'string' },
                financial_impact: { type: 'string' },
              },
            },
          },
          outcomes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scenario: { type: 'string' },
                final_net_worth: { type: 'number' },
                probability: { type: 'number' },
                summary: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
        required: ['timeline', 'decision_points', 'outcomes', 'summary'],
      },
    });

    return Response.json({ horizon, ...res });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}