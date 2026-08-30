import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { browseSession, str, arr } from '../../shared/cloudBrowser.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let allowed = true;
    try {
      const user = await base44.auth.me();
      if (user) allowed = user.role === 'admin';
    } catch {
      allowed = true;
    }
    if (!allowed) return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const url = str(body?.url, 500).trim();
    const prompt = str(body?.prompt, 2000) ||
      'From the page content below, extract the most important intelligence signals and developments. For each: a concise headline, a 2-3 sentence factual summary, the source name, any source URL, 2-4 key takeaways, 1-3 correlations to other markets/sectors/regions/crypto, the region affected, and an impact score 0-100. Ignore navigation, ads, and boilerplate.';
    const category = str(body?.category, 80) || 'Cloud Browser Scrape';
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    const pageText = await browseSession(url, 40000);
    if (!pageText || pageText.length < 50) {
      return Response.json({ url, category, ingested: 0, error: 'no usable page text extracted', textChars: pageText.length });
    }

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${prompt}\n\nPage URL: ${url}\nPage category: ${category}\n\nPage content:\n"""\n${pageText}\n"""`,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                headline: { type: 'string' },
                summary: { type: 'string' },
                source: { type: 'string' },
                url: { type: 'string' },
                signals: { type: 'array', items: { type: 'string' } },
                correlations: { type: 'array', items: { type: 'string' } },
                region: { type: 'string' },
                impact_score: { type: 'number' }
              },
              required: ['headline', 'summary']
            }
          }
        },
        required: ['items']
      }
    });

    const records = (llm.items || []).map((it) => ({
      category,
      headline: str(it.headline, 300),
      summary: str(it.summary, 2000),
      source: str(it.source, 200),
      url: str(it.url || url, 500),
      signals: arr(it.signals, 8, 300),
      correlations: arr(it.correlations, 6, 300),
      region: str(it.region, 80) || 'Global',
      impact_score: Number(it.impact_score) || 0
    })).filter((r) => r.headline);

    if (records.length) await base44.asServiceRole.entities.IntelFeed.bulkCreate(records);

    return Response.json({ url, category, ingested: records.length, textChars: pageText.length, items: records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}