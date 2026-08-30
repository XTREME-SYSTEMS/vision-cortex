import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { browseSession, str } from '../../shared/cloudBrowser.ts';

// Covert browse: drives the cloud browser, returns content ONLY to the caller.
// Nothing is persisted — no IntelFeed, no logs, no trace.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const url = str(body?.url, 500).trim();
    const prompt = str(body?.prompt, 4000);
    const extract = !!body?.extract;
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    const pageText = await browseSession(url, 40000);
    if (!pageText || pageText.length < 50) {
      return Response.json({ url, textChars: pageText.length, error: 'no usable page text extracted' });
    }

    // Raw covert read — return page text directly, no LLM, no persistence.
    if (!extract || !prompt) {
      return Response.json({ url, textChars: pageText.length, text: pageText });
    }

    // Optional LLM structuring — result returned only to the caller, never stored.
    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${prompt}\n\nPage URL: ${url}\n\nPage content:\n"""\n${pageText}\n"""`,
      model: 'gemini_3_flash'
    });

    return Response.json({ url, textChars: pageText.length, result: llm });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}