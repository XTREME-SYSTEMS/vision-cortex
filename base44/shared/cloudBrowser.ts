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

// Spins up an isolated browser session routed through the engine's Proxy Pool
// (usePool: true) so each session egresses from a rotated proxy, keeping Shadow's
// origin unlinkable across research. The pool itself is configured in the Cloud
// Browser engine's Settings -> Integrations -> Proxy Pool (Name, Server host:port,
// Country, Username, Password). Add multiple entries from different countries for
// real rotation; the engine picks one per session.
export async function browseSession(url, maxChars = 40000) {
  if (!cbUrl() || !cbKey()) throw new Error('CLOUD_BROWSER_URL / CLOUD_BROWSER_API_KEY secrets not set');
  const sess = await engine('/sessions', 'POST', { usePool: true });
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

// Stealth browse — reverse-engineered from Decodo's 4-layer anti-detection model:
//   Layer 1 (Network):  IP rotation via proxy pool + sticky sessions for multi-page flows
//   Layer 3 (Browser):  navigator.webdriver patch before navigation
//   Layer 4 (Behavioral): scroll + jittered delay to mimic human reading
// Plus auto-retry with rotation — re-spin a fresh session/proxy on failure until it succeeds.
// Fallback direct-fetch scraper — used when the Cloud Browser engine is down.
// No stealth/anti-detection, but works for most public pages without an external engine.
export async function browseDirect(url, maxChars = 40000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`direct fetch ${res.status}: ${res.statusText}`);
  const html = await res.text();
  // Strip scripts, styles, tags, and collapse whitespace
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return str(text, maxChars);
}

export async function browseStealth(url, opts = {}) {
  const {
    maxChars = 40000,
    sessionId = null,   // sticky: same ID keeps the same exit IP across a multi-page flow
    country = null,    // geo-target the proxy (matches Accept-Language implicitly)
    retries = 3,       // auto-retry with a fresh rotated session on failure
    scroll = true,
    delayMs = 600,
    antiDetect = true,
  } = opts;

  // If engine secrets aren't set, go straight to direct-fetch fallback
  if (!cbUrl() || !cbKey()) {
    const text = await browseDirect(url, maxChars);
    return { text, attempts: 1, sessionId: null, success: true, method: 'direct' };
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let sid;
    try {
      const sessPayload = { usePool: true };
      if (sessionId) sessPayload.sessionId = attempt === 0 ? sessionId : `${sessionId}-r${attempt}`;
      if (country) sessPayload.country = country;
      const sess = await engine('/sessions', 'POST', sessPayload);
      sid = sess?.sessionId;
      if (!sid) throw new Error('engine returned no sessionId');

      // Layer 3 — Browser: kill the webdriver flag before any page loads
      if (antiDetect) {
        await engine(`/sessions/${sid}/execute`, 'POST', {
          action_type: 'evaluate',
          value: 'Object.defineProperty(navigator,"webdriver",{get:()=>undefined});window.chrome={runtime:{}};'
        }).catch(() => {});
      }

      await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'goto', value: url });

      // Layer 4 — Behavioral: scroll down + jittered wait to look human
      if (scroll) {
        await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'scroll', value: 'down' }).catch(() => {});
      }
      const jitter = delayMs + Math.floor(Math.random() * 500);
      await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'wait', value: jitter }).catch(() => {});

      const ex = await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'ai_extract' });
      const pageText = str(ex?.data, maxChars);
      if (pageText && pageText.length >= 50) {
        return { text: pageText, attempts: attempt + 1, sessionId: sid, success: true };
      }
      lastErr = new Error(`extract too short (${pageText?.length || 0} chars) on attempt ${attempt + 1}`);
    } catch (e) {
      lastErr = e;
    } finally {
      if (sid) await engine(`/sessions/${sid}`, 'DELETE').catch(() => {});
    }
  }

  // Engine exhausted or down — fall back to direct fetch so the pipeline still works
  try {
    const text = await browseDirect(url, maxChars);
    if (text && text.length >= 50) {
      return { text, attempts: retries + 1, sessionId: null, success: true, method: 'direct_fallback' };
    }
  } catch (e) {
    // direct fetch also failed — throw the original engine error
  }
  throw lastErr || new Error('stealth browse failed after all retries');
}