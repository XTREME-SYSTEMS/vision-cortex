import { secrets } from 'base44:runtime';

// ─── Engine Configuration ──────────────────────────────────────────────
// Each engine is an isolated cloud browser instance with its own URL,
// API key, priority, and capability set. The fleet manager registers
// engines in the BrowserEngineFleet entity; backend functions load them
// via setFleetEngines() before calling browseStealth().

export interface EngineConfig {
  engine_id: string;
  url: string;
  api_key: string;
  priority: number;
  capabilities?: string[];
}

// Module-level fleet engines — set by the calling backend function
// from BrowserEngineFleet entity records before invoking browseStealth.
let _fleetEngines: EngineConfig[] | null = null;

export function setFleetEngines(engines: EngineConfig[]) {
  _fleetEngines = [...engines].sort((a, b) => a.priority - b.priority);
}

export function clearFleetEngines() {
  _fleetEngines = null;
}

// Legacy single-engine fallback from secrets
const STAGING_URL = 'https://cloudbrowser-engine-preview-production.up.railway.app';
const cbUrl = () => {
  const stagingKey = secrets.get('CLOUD_BROWSER_STAGING_KEY');
  if (stagingKey) return STAGING_URL;
  return (secrets.get('CLOUD_BROWSER_URL') || '').replace(/\/$/, '');
};
const cbKey = () => secrets.get('CLOUD_BROWSER_STAGING_KEY') || secrets.get('CLOUD_BROWSER_API_KEY') || '';

// Returns the active engine list: fleet engines if set, else secrets fallback
function getActiveEngines(): EngineConfig[] {
  if (_fleetEngines && _fleetEngines.length > 0) return _fleetEngines;
  const url = cbUrl();
  const key = cbKey();
  if (url && key) return [{ engine_id: 'default', url, api_key: key, priority: 1 }];
  return [];
}

// ─── Engine API Call ────────────────────────────────────────────────────
export async function engine(path: string, method: string, payload?: any, engineConfig?: EngineConfig) {
  const cfg = engineConfig || getActiveEngines()[0];
  if (!cfg) throw new Error('No browser engine configured');
  const res = await fetch(`${cfg.url}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.api_key },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`engine ${method} ${path} ${res.status}: ${json?.error || text}`);
  return json;
}

// ─── Health Probe ───────────────────────────────────────────────────────
export async function engineHealth(engineConfig: EngineConfig): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${engineConfig.url}/health`, {
      headers: { 'x-api-key': engineConfig.api_key },
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

export const str = (v: any, max: number) => String(v ?? '').slice(0, max);
export const arr = (v: any, max: number, itemMax: number) => (Array.isArray(v) ? v.slice(0, max).map((s: any) => str(s, itemMax)) : []);

// ─── Session Browse (single engine, backward compatible) ────────────────
export async function browseSession(url: string, maxChars = 40000) {
  const engines = getActiveEngines();
  if (engines.length === 0) throw new Error('No browser engine configured');
  const cfg = engines[0];
  const sess = await engine('/sessions', 'POST', { usePool: true }, cfg);
  const sid = sess?.sessionId;
  if (!sid) throw new Error('engine returned no sessionId');
  let pageText = '';
  try {
    await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'goto', value: url }, cfg);
    const ex = await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'ai_extract' }, cfg);
    pageText = str(ex?.data, maxChars);
  } finally {
    await engine(`/sessions/${sid}`, 'DELETE', undefined, cfg).catch(() => {});
  }
  return pageText;
}

// ─── Direct Fetch Fallback ─────────────────────────────────────────────
export async function browseDirect(url: string, maxChars = 40000) {
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

// ─── Multi-Engine Stealth Browse ────────────────────────────────────────
// Tries engines in priority order. Each engine gets `retries` attempts
// before failing over to the next. If all engines are exhausted, falls
// back to direct fetch so the pipeline still produces results.
export async function browseStealth(url: string, opts: any = {}) {
  const {
    maxChars = 40000,
    sessionId = null,
    country = null,
    retries = 3,
    scroll = true,
    delayMs = 600,
    antiDetect = true,
  } = opts;

  const engines = getActiveEngines();

  // No engines at all — direct fetch only
  if (engines.length === 0) {
    const text = await browseDirect(url, maxChars);
    return { text, attempts: 1, sessionId: null, success: true, method: 'direct' };
  }

  let lastErr: Error | null = null;
  let totalAttempts = 0;

  for (const engineConfig of engines) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      totalAttempts++;
      let sid: string | null = null;
      try {
        const sessPayload: any = { usePool: true };
        if (sessionId) sessPayload.sessionId = attempt === 0 ? sessionId : `${sessionId}-r${attempt}`;
        if (country) sessPayload.country = country;
        const sess = await engine('/sessions', 'POST', sessPayload, engineConfig);
        sid = sess?.sessionId;
        if (!sid) throw new Error('engine returned no sessionId');

        // Layer 3 — Browser: kill the webdriver flag before any page loads
        if (antiDetect) {
          await engine(`/sessions/${sid}/execute`, 'POST', {
            action_type: 'evaluate',
            value: 'Object.defineProperty(navigator,"webdriver",{get:()=>undefined});window.chrome={runtime:{}};',
          }, engineConfig).catch(() => {});
        }

        await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'goto', value: url }, engineConfig);

        // Layer 4 — Behavioral: scroll + jittered wait to look human
        if (scroll) {
          await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'scroll', value: 'down' }, engineConfig).catch(() => {});
        }
        const jitter = delayMs + Math.floor(Math.random() * 500);
        await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'wait', value: jitter }, engineConfig).catch(() => {});

        const ex = await engine(`/sessions/${sid}/execute`, 'POST', { action_type: 'ai_extract' }, engineConfig);
        const pageText = str(ex?.data, maxChars);
        if (pageText && pageText.length >= 50) {
          return { text: pageText, attempts: totalAttempts, sessionId: sid, success: true, engine_id: engineConfig.engine_id };
        }
        lastErr = new Error(`extract too short (${pageText?.length || 0} chars) from ${engineConfig.engine_id}`);
      } catch (e: any) {
        lastErr = e;
      } finally {
        if (sid) await engine(`/sessions/${sid}`, 'DELETE', undefined, engineConfig).catch(() => {});
      }
    }
  }

  // All engines exhausted — direct fetch fallback
  try {
    const text = await browseDirect(url, maxChars);
    if (text && text.length >= 50) {
      return { text, attempts: totalAttempts, sessionId: null, success: true, method: 'direct_fallback' };
    }
  } catch (e) {
    // direct fetch also failed
  }
  throw lastErr || new Error('stealth browse failed after all retries across all engines');
}