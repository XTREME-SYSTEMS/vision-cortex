import { secrets } from 'base44:runtime';

const cbUrl = () => (secrets.get('CLOUD_BROWSER_URL') || '').replace(/\/$/, '');
const cbKey = () => secrets.get('CLOUD_BROWSER_API_KEY') || '';

// Proxy rotation: CLOUD_BROWSER_PROXIES is a comma-separated list of proxy URLs.
// If set, each session picks one at random so the origin IP changes every browse,
// keeping Shadow unlinkable across research sessions. A single rotating-proxy
// endpoint can also be placed here and it will be used for every session.
const proxies = () => (secrets.get('CLOUD_BROWSER_PROXIES') || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const pickProxy = () => {
  const list = proxies();
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
};

// Rotating user-agents reduce fingerprinting across sessions.
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];
const pickUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

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

// Spins up an isolated browser session (with a rotated proxy + randomized UA when
// configured), navigates, extracts raw page text, and always releases the session.
export async function browseSession(url, maxChars = 40000) {
  if (!cbUrl() || !cbKey()) throw new Error('CLOUD_BROWSER_URL / CLOUD_BROWSER_API_KEY secrets not set');
  const sessionPayload = { usePool: false, userAgent: pickUA() };
  const proxy = pickProxy();
  if (proxy) sessionPayload.proxy = proxy;
  const sess = await engine('/sessions', 'POST', sessionPayload);
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