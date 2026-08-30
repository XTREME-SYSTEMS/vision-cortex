import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const cbUrl = () => (secrets.get('CLOUD_BROWSER_URL') || '').replace(/\/$/, '');
const cbKey = () => secrets.get('CLOUD_BROWSER_API_KEY') || '';

async function engine(path, method, payload) {
  const res = await fetch(`${cbUrl()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': cbKey() },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`engine ${method} ${path} ${res.status}: ${json?.error || text}`);
  return json;
}

const str = (v, max) => String(v ?? '').slice(0, max);
const arr = (v, max, itemMax) => (Array.isArray(v) ? v.slice(0, max).map((s) => str(s, itemMax)) : []);

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

    if (!cbUrl() || !cbKey()) return Response.json({ error: 'CLOUD_BROWSER_URL / CLOUD_BROWSER_API_KEY secrets not set' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const url = str(body?.url, 500).trim();
    const prompt = str(body?.prompt, 2000) ||
      'From the page content below, extract the most important intelligence signals and developments. For each: a concise headline, a 2-3 sentence factual summary, the source name, any source URL, 2-4 key takeaways, 1-3 correlations to other markets/sectors/regions/crypto, the region affected, and an impact score 0-100. Ignore navigation, ads, and boilerplate.';
    const category = str(body?.category, 80) || 'Cloud Browser Scrape';
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    // 1. spin up a real browser session on the cloud-browser engine
    const sess = await engine('/sessions', 'POST', { usePool: false });
    const sid = sess?.sessionId;
    if (!sid) throw new Error('engine returned no sessionId');

    let pageText = '';
    try {
      // 2. navigate to the target
      await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'goto', value: url });
      // 3. extract raw page content (engine returns up to 50k chars of body text)
      const ex = await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'ai_extract' });
      pageText = str(ex?.data, 40000);
    } finally {
      // 4. always release the session
      await engine(`/sessions/${sid}`, 'DELETE').catch(() => {});
    }

    if (!pageText || pageText.length < 50) {
      return Response.json({ url, category, ingested: 0, error: 'no usable page text extracted', textChars: pageText.length });
    }

    // 5. layer Vision Cortex's LLM to structure the raw scrape into signals
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