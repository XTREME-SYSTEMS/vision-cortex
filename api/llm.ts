/**
 * Authenticated LLM passthrough for the SPA.
 * POST /api/llm { prompt, system_prompt?, model?, max_tokens?, temperature? }
 */
import type { VercelRequest, VercelResponse } from 'vercel';
import { createClientFromRequest } from '../base44/runtime/index';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const url = `https://${req.headers.host || 'localhost'}${req.url}`;
  const webReq = new Request(url, {
    method: 'POST',
    headers: new Headers(req.headers as Record<string, string>),
    body: JSON.stringify(req.body ?? {})
  });

  try {
    const base44 = createClientFromRequest(webReq);
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const result = await base44.integrations.Core.InvokeLLM(req.body || {});
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[api/llm]', err);
    res.status(500).json({ error: err?.message || 'LLM call failed' });
  }
}
