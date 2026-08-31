import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// simulateOutcomes — takes a single strategy (+ optional goal) and generates
// three simulated futures (conservative, base, aggressive), each with a
// 12-month monthly timeline of revenue, cost, profit, and cumulative profit,
// plus a probability and key assumptions.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const s = body.strategy || {};
    const goal = body.goal || null;

    const prompt = `You are a rigorous financial simulation engine. Simulate 3 distinct outcomes for this business strategy:
Title: ${s.title || ''}
One-liner: ${s.one_liner || ''}
Archetype: ${s.archetype || ''}
Capital required: $${s.capital_required_usd || 0}
Time to profit: ${s.time_to_profit_days || 0} days
${goal ? `Owner goal: ${goal.kind || 'residual income'} → ${goal.value || ''} by ${goal.by_horizon || '1 year'}` : ''}

Generate exactly 3 scenarios: "conservative" (things go slower/worse), "base" (realistic), "aggressive" (things go better/faster).
For EACH scenario produce:
- probability (0-100, likelihood of this outcome)
- assumptions (3 key assumptions that drive this scenario)
- timeline: 12 monthly entries with month (1-12), revenue, cost, profit, cumulative (cumulative profit)
- summary (one sentence on the outcome)
Be realistic with numbers — no vanity. Cumulative should be the running sum of profit.
Return JSON: { "outcomes": [ {scenario, probability, assumptions, timeline, summary}, ...3 ] }`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          outcomes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scenario: { type: 'string' },
                probability: { type: 'number' },
                assumptions: { type: 'array', items: { type: 'string' } },
                timeline: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      month: { type: 'number' },
                      revenue: { type: 'number' },
                      cost: { type: 'number' },
                      profit: { type: 'number' },
                      cumulative: { type: 'number' },
                    },
                  },
                },
                summary: { type: 'string' },
              },
              required: ['scenario', 'probability', 'timeline'],
            },
          },
        },
        required: ['outcomes'],
      },
    });
    return Response.json({ outcomes: res.outcomes || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}