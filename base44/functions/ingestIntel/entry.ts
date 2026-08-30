import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CATEGORIES = [
  'Worldwide Intelligence',
  'Elite Operations',
  'Stock Market',
  'Weather',
  'Trends',
  'Economics',
  'AI Technology',
  'Social Media',
  'Inventions & Ideas (top threads)',
  'Crypto News',
  'Elite Stock Trading',
  'Politician Stock Trading',
  'Wealth-Enhancing Topics',
  'Intelligence-Enhancing Topics',
  'Influential Industries'
];

const str = (v, max) => String(v ?? '').slice(0, max);
const arr = (v, max, itemMax) =>
  Array.isArray(v) ? v.slice(0, max).map((s) => str(s, itemMax)) : [];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth gate: allow the scheduled workflow (no user) or an admin.
    let allowed = true;
    try {
      const user = await base44.auth.me();
      if (user) allowed = user.role === 'admin';
    } catch {
      allowed = true;
    }
    if (!allowed) return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const categories = Array.isArray(body?.categories) && body.categories.length
      ? body.categories
      : CATEGORIES;

    const prompt = `You are the intelligence ingestion core of Vision Cortex, an autonomous multi-agent system. Today is ${new Date().toUTCString()}. Use live web search to pull the most current, high-signal developments across these categories: ${categories.join(', ')}.

For EACH category, surface the 2-3 most important, actionable, wealth- or intelligence-relevant developments from the last 24-48 hours. Prioritize: politician stock trades (PTR filings), elite fund moves, crypto market shifts, AI breakthroughs, macroeconomic signals, weather events with market impact, and viral threads about people building, inventing, or solving hard problems.

For every item, capture:
- category (one of the listed)
- headline (concise, specific)
- summary (2-3 sentences, factual, no filler)
- source (publication or platform name)
- url (real URL if available, else empty string)
- signals (array of 2-4 short takeaways)
- correlations (array of 1-3 strings: how this affects other markets, regions, sectors, or crypto)
- region (part of the world most affected, or "Global")
- impact_score (0-100, near-term leverage estimate)

Return JSON matching the schema. items is the array. Be rigorous: never present speculation as fact, cite real sources where possible.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                headline: { type: 'string' },
                summary: { type: 'string' },
                source: { type: 'string' },
                url: { type: 'string' },
                signals: { type: 'array', items: { type: 'string' } },
                correlations: { type: 'array', items: { type: 'string' } },
                region: { type: 'string' },
                impact_score: { type: 'number' }
              },
              required: ['category', 'headline', 'summary']
            }
          }
        },
        required: ['items']
      }
    });

    const items = (result.items || []).map((it) => ({
      category: str(it.category, 80) || 'General',
      headline: str(it.headline, 300),
      summary: str(it.summary, 2000),
      source: str(it.source, 200),
      url: str(it.url, 500),
      signals: arr(it.signals, 8, 300),
      correlations: arr(it.correlations, 6, 300),
      region: str(it.region, 80) || 'Global',
      impact_score: Number(it.impact_score) || 0
    }));

    if (items.length) await base44.asServiceRole.entities.IntelFeed.bulkCreate(items);

    return Response.json({ ingested: items.length, items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}