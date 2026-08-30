import { secrets } from 'base44:runtime';

const cbUrl = () => (secrets.get('CLOUD_BROWSER_URL') || '').replace(/\/$/, '');
const cbKey = () => secrets.get('CLOUD_BROWSER_API_KEY') || '';

export async function engine(path, method, payload) {
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

export const str = (v, max) => String(v ?? '').slice(0, max);
export const arr = (v, max, itemMax) => (Array.isArray(v) ? v.slice(0, max).map((s) => str(s, itemMax)) : []);

// Spins up an isolated browser session, navigates, extracts raw page text, and always releases the session.
export async function browseSession(url, maxChars = 40000) {
  if (!cbUrl() || !cbKey()) throw new Error('CLOUD_BROWSER_URL / CLOUD_BROWSER_API_KEY secrets not set');
  const sess = await engine('/sessions', 'POST', { usePool: false });
  const sid = sess?.sessionId;
  if (!sid) throw new Error('engine returned no sessionId');
  let pageText = '';
  try {
    await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'goto', value: url });
    const ex = await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'ai_extract' });
    pageText = str(ex?.data, maxChars);
  } finally {
    await engine(`/sessions/${sid}`, 'DELETE').catch(() => {});
  }
  return pageText;
}