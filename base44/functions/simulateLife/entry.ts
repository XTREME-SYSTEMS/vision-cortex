import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { taxonomyContext, LIFE_EVENTS } from '../../shared/humanTaxonomy.ts';

// simulateLife — the profound core. Takes a vision, a chosen strategy, a persona,
// a time horizon, and optional user choice overrides. Generates a realistic life
// timeline with confidence bands (p10/p50/p90), conditional life-event probabilities
// computed from the persona's demographics, interactive decision points, and
// three outcome scenarios. Optionally grounds financials in real market data via
// web search so the projection reflects actual comps, CAC, and market sizes.

const HORIZONS = {
  '1m': { periods: 4, unit: 'week', years: 0.083 },
  '3m': { periods: 3, unit: 'month', years: 0.25 },
  '6m': { periods: 6, unit: 'month', years: 0.5 },
  '1y': { periods: 12, unit: 'month', years: 1 },
  '2y': { periods: 8, unit: 'quarter', years: 2 },
  '3y': { periods: 12, unit: 'quarter', years: 3 },
  '5y': { periods: 5, unit: 'year', years: 5 },
  '10y': { periods: 10, unit: 'year', years: 10 },
  '15y': { periods: 15, unit: 'year', years: 15 },
  '20y': { periods: 20, unit: 'year', years: 20 },
};

// Conditional life-event probabilities — computed from the persona's actual
// demographics, not static constants. This is what makes the sim honest.
function conditionalProbabilities(persona, years) {
  const rel = String(persona.relationship_status || '').toLowerCase();
  const risk = String(persona.risk_tolerance || 'medium').toLowerCase();
  const conditions = (persona.conditions || []).map((c) => String(c).toLowerCase());
  const has = (s) => conditions.some((c) => c.includes(s));

  const yScale = Math.min(years / 10, 1); // ramp over a decade
  let divorceProb = 0, marriageProb = 0;
  if (rel.includes('married')) divorceProb = Math.min(0.42 * yScale, 0.6);
  else if (rel.includes('single')) marriageProb = Math.min(0.35 * Math.min(years / 5, 1), 0.7);
  else if (rel.includes('divorced')) marriageProb = Math.min(0.25 * Math.min(years / 5, 1), 0.5);

  const deathProb = Math.min(0.05 + 0.02 * years, 0.5);
  const depressionProb = has('depression') || has('anxiety') ? 0.45 : 0.3;
  const hyperfocusProb = has('adhd') ? 0.35 : 0.1;
  const manicProb = has('bipolar') ? 0.4 : 0.05;
  const marketCrashProb = Math.min(0.15 * Math.max(1, years / 3), 0.6);
  const legalProb = risk === 'extreme' ? 0.18 : risk === 'high' ? 0.1 : 0.04;

  return {
    'Divorce (if married)': Math.round(divorceProb * 100),
    'Marriage / partnership': Math.round(marriageProb * 100),
    'Death of a loved one': Math.round(deathProb * 100),
    'Depression cycle / burnout': Math.round(depressionProb * 100),
    'Hyperfocus breakthrough (ADHD)': Math.round(hyperfocusProb * 100),
    'Manic high (bipolar)': Math.round(manicProb * 100),
    'Market crash / recession': Math.round(marketCrashProb * 100),
    'Legal / regulatory hit': Math.round(legalProb * 100),
  };
}

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
    const grounded = body.grounded === true;
    const actuals = Array.isArray(body.actuals) ? body.actuals : []; // reality so far, for recalibration

    const periodLabels = Array.from({ length: cfg.periods }, (_, i) => `${cfg.unit} ${i + 1}`);
    const probs = conditionalProbabilities(persona, cfg.years);
    const choicesBlock = choices.length
      ? `\nThe user has OVERRIDDEN these decisions (honor them exactly and let them reshape the downstream timeline and finances):\n${choices.map((c) => `- ${c.prompt} → user chose: "${c.choice}"`).join('\n')}`
      : '';
    const actualsBlock = actuals.length
      ? `\nREALITY SO FAR (the user has already lived these — anchor the forward projection to them, do not re-imagine the past):\n${actuals.map((a) => `- ${a.date}: actual net worth $${a.actual_net_worth} (${a.note || ''})`).join('\n')}`
      : '';

    const prompt = `You are a rigorous life-simulation engine grounded in behavioral science, psychology, and finance. Simulate one realistic human future${grounded ? ' using REAL market data from web search to ground the financials in actual comps, CAC, LTV, and market sizes for this strategy type' : ''}.

VISION: "${vision}"
STRATEGY: ${strategy.title || ''} — ${strategy.one_liner || ''}
  archetype: ${strategy.archetype || ''}, capital required: $${strategy.capital_required_usd || 0}, time to profit: ${strategy.time_to_profit_days || 0} days
PERSONA:
  archetype: ${persona.archetype || 'unknown'}, decision style: ${persona.decision_style || 'unknown'}, risk: ${persona.risk_tolerance || 'medium'}
  conditions: ${(persona.conditions || []).join(', ') || 'none'}, relationship: ${persona.relationship_status || 'unknown'}
  strengths: ${(persona.strengths || []).join(', ')}, blind spots: ${(persona.blind_spots || []).join(', ')}
  summary: ${persona.summary || ''}
HORIZON: ${horizon} — ${cfg.periods} ${cfg.unit} periods: ${periodLabels.join(', ')}

CONDITIONAL LIFE-EVENT PROBABILITIES (computed from the persona — use these, they are not guesses):
${Object.entries(probs).map(([k, v]) => `- ${k}: ${v}%`).join('\n')}

${choicesBlock}${actualsBlock}

REFERENCE TAXONOMY:
${taxonomyContext()}

MODEL THESE HUMAN REALITIES:
- Risk: a riskier vision means higher investment and higher variance — can enhance the outcome OR lose it all on a bad break.
- Marriage/divorce: use the conditional probabilities above. If divorced, men typically lose ~50% of assets and face a depression/rebuild cycle (3-9 month productivity collapse, then recovery).
- Aging: death-in-family probability rises with horizon length (use the value above).
- ADHD: hyperfocus breakthroughs AND impulsivity missteps (use the values above).
- Bipolar: manic highs (big wins) and depressive troughs (use the values above).
- Habits: 66% of behavior is habitual; sustained outcomes come from loop changes, not willpower spikes.
- Event correlation: life events CLUSTER — a divorce often triggers a depression cycle which triggers a bad financial decision. Model cascades, not independent events.
- Decision style shapes how the person navigates the decision points you generate.

GENERATE:
1. timeline: ${cfg.periods} periods, each with { label, net_worth (p50/median), net_worth_p10 (worst 10%), net_worth_p90 (best 10%), income, expenses, event }.
   - net_worth is cumulative (starts negative if capital is invested).
   - The p10→p90 spread reflects uncertainty; widen it for riskier personas and longer horizons.
   - event is a short string describing what happened that period (may be "").
2. decision_points: 3-5 key decisions across the horizon. Each: { id, period_label, prompt, options (3-4 strings), ai_choice (the best option), rationale, financial_impact }.
   - If the user overrode a decision, set ai_choice to the user's choice and note it.
3. life_events: 0-4 events that occur, each { kind, period_label, probability (use the conditional values), description, financial_impact }. Draw from: ${LIFE_EVENTS.map((e) => e.kind).join(', ')}.
4. outcomes: 3 scenarios { scenario: conservative|base|aggressive, final_net_worth, probability (0-100), summary }.
5. summary: 2-3 sentences on the most likely path and the single biggest risk.

Be realistic — no vanity numbers. Net worth can go negative. Return JSON matching the schema.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: grounded,
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
                net_worth_p10: { type: 'number' },
                net_worth_p90: { type: 'number' },
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