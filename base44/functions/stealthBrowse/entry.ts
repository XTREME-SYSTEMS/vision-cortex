import { createClientFromRequest } from '../../runtime/index';
import { browseStealth, str } from '../../shared/cloudBrowser.ts';

// Stealth covert browse — anti-detection hardened (reverse-engineered from Decodo's
// 4-layer model). Supports sticky sessions for multi-page flows, geo-targeting,
// behavioral mimicry, and auto-retry with proxy rotation. Returns content ONLY to
// the caller — nothing persisted.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const url = str(body?.url, 500).trim();
    const prompt = str(body?.prompt, 4000);
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    const result = await browseStealth(url, {
      sessionId: body.sessionId || null,
      country: body.country || null,
      retries: body.retries ?? 3,
      scroll: body.scroll !== false,
      delayMs: body.delayMs ?? 600,
      antiDetect: body.antiDetect !== false,
      maxChars: body.maxChars ?? 40000,
    });

    if (prompt && body.extract) {
      const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${prompt}\n\nPage URL: ${url}\n\nPage content:\n"""\n${result.text}\n"""`,
        model: 'gemini_3_flash'
      });
      return Response.json({ url, ...result, structured: llm });
    }

    return Response.json({ url, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}