/**
 * Vercel catch-all for ALL base44 backend functions.
 * POST /api/functions/<name> — routed to base44/functions/<name>/entry.ts default export.
 *
 * The Node-runtime handler converts the Vercel req into a Web Request
 * (entries use the Web fetch API: req.json(), Response.json)
 * and converts the returned Response back to the Node res.
 */
import type { VercelRequest, VercelResponse } from 'vercel';
// @ts-ignore — generated file mapping every function name to its entry module
import { registry } from '../../base44/runtime/registry';

export const config = {
  maxDuration: 60
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const name = Array.isArray(req.query.name) ? req.query.name[0] : req.query.name;
  const entry = (registry as Record<string, { default?: (r: Request) => Promise<Response> }>)[name as string];

  if (!entry || typeof entry.default !== 'function') {
    res.status(404).json({ error: `Unknown function: ${name}` });
    return;
  }

  // Build a web-standard Request from the Node request
  const url = `https://${req.headers.host || 'localhost'}${req.url}`;
  const body = (req.method === 'GET' || req.method === 'HEAD') ? undefined : JSON.stringify(req.body ?? {});
  const webReq = new Request(url, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    body
  });

  try {
    const webRes = await entry.default(webReq);
    res.status(webRes.status);
    webRes.headers.forEach((v: string, k: string) => {
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
    const text = await webRes.text();
    res.end(text);
  } catch (err: any) {
    console.error(`[api/functions/${name}]`, err);
    res.status(500).json({ error: err?.message || 'Function crashed', function: name });
  }
}
