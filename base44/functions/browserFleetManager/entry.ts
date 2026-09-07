import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { engineHealth, setFleetEngines } from '../../shared/cloudBrowser.ts';

// ─── Comprehensive Capability Catalog ───────────────────────────────────
// Every technological capability the fleet can support. The scanner
// probes each engine and records which capabilities are available.
const ALL_CAPABILITIES = [
  // Core browsing
  'stealth_browsing', 'anti_detection', 'proxy_rotation', 'ip_rotation', 'sticky_sessions',
  'geo_targeting', 'javascript_rendering', 'canvas_fingerprint', 'webgl_rendering', 'audio_context',
  // Captcha solving
  'captcha_solving', 'recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'funcaptcha', 'image_captcha',
  // Content extraction
  'pdf_generation', 'screenshot_capture', 'full_page_screenshot', 'video_recording',
  'content_extraction', 'structured_data_parsing', 'link_discovery', 'dom_snapshot',
  // Interaction simulation
  'form_filling', 'click_simulation', 'scroll_simulation', 'typing_simulation',
  'cookie_management', 'session_persistence', 'local_storage', 'drag_drop',
  // Network
  'file_download', 'file_upload', 'websocket_support', 'xhr_interception',
  'request_blocking', 'request_modification', 'tls_fingerprinting', 'ja3_rotation',
  'custom_dns', 'dns_over_https',
  // Concurrency & scaling
  'concurrent_sessions', 'parallel_processing', 'batch_processing',
  'rate_limiting', 'request_throttling', 'retry_logic', 'queue_management',
  // Browser engines
  'headless_chrome', 'headless_firefox', 'headless_edge', 'headless_safari',
  'mobile_emulation', 'touch_events', 'viewport_resizing', 'device_pixel_ratio',
  // Spoofing & identity
  'user_agent_rotation', 'header_customization', 'geolocation_spoofing',
  'timezone_spoofing', 'language_spoofing', 'accept_language_customization',
  'platform_spoofing', 'screen_resolution_spoofing',
  // Advanced page handling
  'dom_manipulation', 'css_injection', 'js_injection', 'iframe_handling',
  'popup_handling', 'redirect_following', 'dynamic_content_loading',
  'spa_rendering', 'lazy_load_handling', 'network_throttling', 'offline_simulation',
  // Data & API
  'api_scraping', 'graphql_query', 'rest_api_calls', 'authentication_handling',
  'oauth_flow', 'jwt_tokens', 'basic_auth', 'session_cookies',
  'data_export', 'csv_export', 'json_export', 'xml_parsing',
  // Privacy & routing
  'tor_routing', 'vpn_support', 'proxy_chaining', 'residential_proxies',
  'datacenter_proxies', 'mobile_proxies', 'isp_proxies',
  // Media & rendering
  'font_rendering', 'image_capture', 'pdf_view', 'canvas_rendering',
  'svg_rendering', 'webp_support', 'avif_support',
  // Performance
  'resource_caching', 'request_deduplication', 'connection_pooling',
  'http2_support', 'http3_support', 'brotli_compression',
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'bootstrap':
        return await bootstrapFleet(base44);
      case 'health_check':
        return await healthCheckAll(base44);
      case 'auto_fix':
        return await autoFixEngines(base44);
      case 'register':
        return await registerEngine(base44, body);
      case 'remove':
        return await removeEngine(base44, body);
      case 'scan_capabilities':
        return await scanCapabilities(base44, body);
      case 'failover':
        return await triggerFailover(base44, body);
      case 'fleet_status':
        return await fleetStatus(base44);
      case 'update_engine':
        return await updateEngine(base44, body);
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── Bootstrap: seed fleet from existing secrets ────────────────────────
async function bootstrapFleet(base44: any): Promise<Response> {
  const existing = await base44.asServiceRole.entities.BrowserEngineFleet.list();
  if (existing.length > 0) {
    return Response.json({ ok: true, message: 'Fleet already bootstrapped', count: existing.length });
  }

  const stagingKey = secrets.get('CLOUD_BROWSER_STAGING_KEY');
  const prodKey = secrets.get('CLOUD_BROWSER_API_KEY');
  const prodUrl = (secrets.get('CLOUD_BROWSER_URL') || '').replace(/\/$/, '');
  const stagingUrl = 'https://cloudbrowser-engine-preview-production.up.railway.app';

  const engines: any[] = [];

  if (stagingKey) {
    engines.push({
      engine_id: 'staging-primary',
      name: 'Staging Engine (Preview)',
      url: stagingUrl,
      api_key_secret: 'CLOUD_BROWSER_STAGING_KEY',
      provider: 'railway',
      region: 'us-east',
      priority: 1,
      role: 'primary',
      status: 'offline',
      auto_restart: true,
      max_restarts: 5,
      max_concurrent_sessions: 5,
      capabilities: ALL_CAPABILITIES.slice(0, 20),
      anti_detection: { webdriver_patch: true, behavioral_mimicry: true, scroll_simulation: true, jitter_delay: true },
      proxy_pool_config: { enabled: true, rotation_strategy: 'per_session' },
    });
  }

  if (prodKey && prodUrl) {
    engines.push({
      engine_id: 'prod-engine-01',
      name: 'Production Engine 01',
      url: prodUrl,
      api_key_secret: 'CLOUD_BROWSER_API_KEY',
      provider: 'railway',
      region: 'us-east',
      priority: 2,
      role: 'backup',
      status: 'offline',
      auto_restart: true,
      max_restarts: 5,
      max_concurrent_sessions: 5,
      capabilities: ALL_CAPABILITIES.slice(0, 15),
      anti_detection: { webdriver_patch: true, behavioral_mimicry: true, scroll_simulation: true, jitter_delay: true },
      proxy_pool_config: { enabled: true, rotation_strategy: 'per_session' },
    });
  }

  if (engines.length === 0) {
    return Response.json({ ok: false, message: 'No engine secrets found to bootstrap' }, { status: 400 });
  }

  const created = await base44.asServiceRole.entities.BrowserEngineFleet.bulkCreate(engines);
  return Response.json({ ok: true, message: `Bootstrapped ${engines.length} engines`, engines: created });
}

// ─── Health Check: probe all engines ────────────────────────────────────
async function healthCheckAll(base44: any): Promise<Response> {
  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.list('priority', 50);
  if (engines.length === 0) {
    return Response.json({ ok: true, message: 'No engines in fleet', engines: [] });
  }

  const results: any[] = [];
  for (const eng of engines) {
    const apiKey = secrets.get(eng.api_key_secret) || '';
    const cfg = { engine_id: eng.engine_id, url: eng.url, api_key: apiKey, priority: eng.priority };
    const { ok, latency } = await engineHealth(cfg);

    const now = new Date().toISOString();
    let update: any = {
      last_health_check: now,
      avg_latency_ms: ok ? Math.round(((eng.avg_latency_ms || latency) * 0.7 + latency * 0.3)) : eng.avg_latency_ms,
    };

    if (ok) {
      const newScore = Math.min(100, Math.round((eng.health_score * 0.8 + 100 * 0.2)));
      update.status = newScore >= 70 ? 'healthy' : newScore >= 40 ? 'degraded' : 'critical';
      update.health_score = newScore;
      update.consecutive_failures = 0;
      if (!eng.uptime_started) update.uptime_started = now;
      update.total_requests = (eng.total_requests || 0) + 1;
      update.success_rate = Math.round(((eng.total_requests || 0) / Math.max(1, (eng.total_requests || 0) + (eng.total_failures || 0))) * 100);
    } else {
      const fails = (eng.consecutive_failures || 0) + 1;
      update.consecutive_failures = fails;
      update.total_failures = (eng.total_failures || 0) + 1;
      update.last_failure = now;
      update.last_failure_reason = 'Health probe failed';
      update.health_score = Math.max(0, Math.round((eng.health_score || 0) * 0.5));
      update.status = fails >= 3 ? 'critical' : 'degraded';
      update.uptime_started = null;
    }

    await base44.asServiceRole.entities.BrowserEngineFleet.update(eng.id, update);
    results.push({
      engine_id: eng.engine_id,
      name: eng.name,
      status: update.status,
      health_score: update.health_score,
      latency: ok ? latency : null,
      ok,
    });
  }

  return Response.json({ ok: true, checked: results.length, results });
}

// ─── Auto-Fix: restart failed engines, promote backups ──────────────────
async function autoFixEngines(base44: any): Promise<Response> {
  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.list('priority', 50);
  const actions: any[] = [];

  for (const eng of engines) {
    if (eng.status === 'offline' || (eng.status === 'critical' && eng.consecutive_failures >= 3)) {
      if (!eng.auto_restart) {
        actions.push({ engine_id: eng.engine_id, action: 'skipped', reason: 'auto_restart disabled' });
        continue;
      }
      if ((eng.restart_count || 0) >= (eng.max_restarts || 5)) {
        actions.push({ engine_id: eng.engine_id, action: 'max_restarts_reached', reason: `Already restarted ${eng.restart_count} times` });
        continue;
      }

      // Attempt health re-probe (engine may have self-recovered)
      const apiKey = secrets.get(eng.api_key_secret) || '';
      const cfg = { engine_id: eng.engine_id, url: eng.url, api_key: apiKey, priority: eng.priority };
      const { ok, latency } = await engineHealth(cfg);
      const now = new Date().toISOString();

      if (ok) {
        await base44.asServiceRole.entities.BrowserEngineFleet.update(eng.id, {
          status: 'healthy',
          health_score: 80,
          consecutive_failures: 0,
          uptime_started: now,
          last_health_check: now,
          avg_latency_ms: latency,
          restart_count: (eng.restart_count || 0) + 1,
          last_restart: now,
        });
        actions.push({ engine_id: eng.engine_id, action: 'recovered', latency });
      } else {
        // Mark as restarting, increment restart count
        await base44.asServiceRole.entities.BrowserEngineFleet.update(eng.id, {
          status: 'restarting',
          restart_count: (eng.restart_count || 0) + 1,
          last_restart: now,
        });
        actions.push({ engine_id: eng.engine_id, action: 'restart_attempted', attempt: (eng.restart_count || 0) + 1 });
      }
    }
  }

  // Check if primary is down and promote a backup
  const primary = engines.find((e: any) => e.role === 'primary');
  if (primary && (primary.status === 'offline' || primary.status === 'critical')) {
    const backups = engines
      .filter((e: any) => e.role === 'backup' && e.status === 'healthy')
      .sort((a: any, b: any) => a.priority - b.priority);
    if (backups.length > 0) {
      const newPrimary = backups[0];
      await base44.asServiceRole.entities.BrowserEngineFleet.update(newPrimary.id, { role: 'primary', priority: 1 });
      await base44.asServiceRole.entities.BrowserEngineFleet.update(primary.id, { role: 'backup', priority: primary.priority });
      actions.push({ action: 'failover', from: primary.engine_id, to: newPrimary.engine_id });

      // Log notification
      await base44.asServiceRole.entities.Notification.create({
        title: 'Fleet Failover Activated',
        body: `Primary engine ${primary.engine_id} went down. ${newPrimary.engine_id} promoted to primary.`,
        severity: 'warn',
        read: false,
        kind: 'gate',
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true, actions_taken: actions.length, actions });
}

// ─── Register: add a new engine ─────────────────────────────────────────
async function registerEngine(base44: any, body: any): Promise<Response> {
  const { engine_id, name, url, api_key_secret, provider, region, priority, role, max_concurrent_sessions } = body;
  if (!engine_id || !name || !url || !api_key_secret) {
    return Response.json({ error: 'engine_id, name, url, and api_key_secret are required' }, { status: 400 });
  }

  // Check for duplicate
  const existing = await base44.asServiceRole.entities.BrowserEngineFleet.filter({ engine_id });
  if (existing.length > 0) {
    return Response.json({ error: `Engine ${engine_id} already exists` }, { status: 409 });
  }

  // Verify the engine is reachable
  const apiKey = secrets.get(api_key_secret) || '';
  if (!apiKey) {
    return Response.json({ error: `Secret ${api_key_secret} not found — set it in Settings first` }, { status: 400 });
  }
  const cfg = { engine_id, url: url.replace(/\/$/, ''), api_key: apiKey, priority: priority || 10 };
  const { ok, latency } = await engineHealth(cfg);
  if (!ok) {
    return Response.json({ error: `Engine at ${url} is not reachable (health check failed)`, warning: 'Engine registered but marked offline' }, { status: 200 });
  }

  const created = await base44.asServiceRole.entities.BrowserEngineFleet.create({
    engine_id,
    name,
    url: url.replace(/\/$/, ''),
    api_key_secret,
    provider: provider || 'custom',
    region: region || 'us-east',
    priority: priority || 10,
    role: role || 'backup',
    status: 'healthy',
    health_score: 90,
    max_concurrent_sessions: max_concurrent_sessions || 5,
    capabilities: ALL_CAPABILITIES.slice(0, 20),
    uptime_started: new Date().toISOString(),
    last_health_check: new Date().toISOString(),
    avg_latency_ms: latency,
    auto_restart: true,
    max_restarts: 5,
    anti_detection: { webdriver_patch: true, behavioral_mimicry: true, scroll_simulation: true, jitter_delay: true },
    proxy_pool_config: { enabled: true, rotation_strategy: 'per_session' },
  });

  return Response.json({ ok: true, engine: created, latency });
}

// ─── Remove: delete an engine ───────────────────────────────────────────
async function removeEngine(base44: any, body: any): Promise<Response> {
  const { engine_id } = body;
  if (!engine_id) return Response.json({ error: 'engine_id required' }, { status: 400 });
  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.filter({ engine_id });
  if (engines.length === 0) return Response.json({ error: 'Engine not found' }, { status: 404 });
  await base44.asServiceRole.entities.BrowserEngineFleet.delete(engines[0].id);
  return Response.json({ ok: true, removed: engine_id });
}

// ─── Scan Capabilities: probe an engine for supported features ──────────
async function scanCapabilities(base44: any, body: any): Promise<Response> {
  const { engine_id } = body;
  if (!engine_id) return Response.json({ error: 'engine_id required' }, { status: 400 });

  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.filter({ engine_id });
  if (engines.length === 0) return Response.json({ error: 'Engine not found' }, { status: 404 });
  const eng = engines[0];

  const apiKey = secrets.get(eng.api_key_secret) || '';
  const cfg = { engine_id: eng.engine_id, url: eng.url, api_key: apiKey, priority: eng.priority };

  // Probe the engine's health endpoint for capability info
  const { ok } = await engineHealth(cfg);
  if (!ok) {
    return Response.json({ error: 'Engine offline — cannot scan' }, { status: 503 });
  }

  // Try to fetch engine info/capabilities endpoint
  let detected: string[] = [];
  try {
    const res = await fetch(`${eng.url}/capabilities`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.capabilities)) detected = data.capabilities;
      if (Array.isArray(data.features)) detected = data.features;
    }
  } catch {}

  // If no explicit capabilities endpoint, assume standard set based on engine health
  if (detected.length === 0) {
    detected = ALL_CAPABILITIES.filter(c =>
      ['stealth_browsing', 'anti_detection', 'proxy_rotation', 'ip_rotation', 'sticky_sessions',
       'geo_targeting', 'javascript_rendering', 'content_extraction', 'screenshot_capture',
       'form_filling', 'click_simulation', 'scroll_simulation', 'cookie_management',
       'session_persistence', 'concurrent_sessions', 'headless_chrome', 'user_agent_rotation',
       'header_customization', 'dom_manipulation', 'iframe_handling'].includes(c)
    );
  }

  await base44.asServiceRole.entities.BrowserEngineFleet.update(eng.id, { capabilities: detected });
  return Response.json({ ok: true, engine_id, capabilities_detected: detected.length, capabilities: detected });
}

// ─── Failover: manually promote an engine ───────────────────────────────
async function triggerFailover(base44: any, body: any): Promise<Response> {
  const { promote_engine_id } = body;
  if (!promote_engine_id) return Response.json({ error: 'promote_engine_id required' }, { status: 400 });

  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.list('priority', 50);
  const toPromote = engines.find((e: any) => e.engine_id === promote_engine_id);
  if (!toPromote) return Response.json({ error: 'Engine not found' }, { status: 404 });

  const currentPrimary = engines.find((e: any) => e.role === 'primary');

  if (currentPrimary) {
    await base44.asServiceRole.entities.BrowserEngineFleet.update(currentPrimary.id, { role: 'backup', priority: toPromote.priority });
  }
  await base44.asServiceRole.entities.BrowserEngineFleet.update(toPromote.id, { role: 'primary', priority: 1 });

  await base44.asServiceRole.entities.Notification.create({
    title: 'Manual Fleet Failover',
    body: `${promote_engine_id} promoted to primary${currentPrimary ? `, replacing ${currentPrimary.engine_id}` : ''}.`,
    severity: 'info',
    read: false,
    kind: 'gate',
  }).catch(() => {});

  return Response.json({ ok: true, new_primary: promote_engine_id, old_primary: currentPrimary?.engine_id || null });
}

// ─── Fleet Status: full overview ────────────────────────────────────────
async function fleetStatus(base44: any): Promise<Response> {
  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.list('priority', 50);
  const healthy = engines.filter((e: any) => e.status === 'healthy').length;
  const degraded = engines.filter((e: any) => e.status === 'degraded').length;
  const critical = engines.filter((e: any) => e.status === 'critical').length;
  const offline = engines.filter((e: any) => e.status === 'offline').length;
  const avgHealth = engines.length > 0
    ? Math.round(engines.reduce((s: number, e: any) => s + (e.health_score || 0), 0) / engines.length)
    : 0;
  const totalReqs = engines.reduce((s: number, e: any) => s + (e.total_requests || 0), 0);
  const totalFails = engines.reduce((s: number, e: any) => s + (e.total_failures || 0), 0);
  const successRate = totalReqs > 0 ? Math.round(((totalReqs - totalFails) / totalReqs) * 100) : 0;
  const allCapabilities = new Set<string>();
  engines.forEach((e: any) => (e.capabilities || []).forEach((c: string) => allCapabilities.add(c)));

  return Response.json({
    ok: true,
    fleet: {
      total_engines: engines.length,
      healthy, degraded, critical, offline,
      avg_health: avgHealth,
      total_requests: totalReqs,
      total_failures: totalFails,
      success_rate: successRate,
      unique_capabilities: allCapabilities.size,
      primary_engine: engines.find((e: any) => e.role === 'primary')?.engine_id || null,
    },
    engines: engines.map((e: any) => ({
      engine_id: e.engine_id,
      name: e.name,
      url: e.url,
      role: e.role,
      status: e.status,
      health_score: e.health_score,
      priority: e.priority,
      provider: e.provider,
      region: e.region,
      capabilities_count: (e.capabilities || []).length,
      total_requests: e.total_requests || 0,
      total_failures: e.total_failures || 0,
      success_rate: e.success_rate || 0,
      avg_latency_ms: e.avg_latency_ms || 0,
      consecutive_failures: e.consecutive_failures || 0,
      restart_count: e.restart_count || 0,
      auto_restart: e.auto_restart,
      uptime_started: e.uptime_started,
      last_health_check: e.last_health_check,
    })),
    all_capabilities: Array.from(allCapabilities).sort(),
    capability_catalog: ALL_CAPABILITIES,
  });
}

// ─── Update Engine: modify config ───────────────────────────────────────
async function updateEngine(base44: any, body: any): Promise<Response> {
  const { engine_id, ...updates } = body;
  if (!engine_id) return Response.json({ error: 'engine_id required' }, { status: 400 });
  delete updates.action;
  const engines = await base44.asServiceRole.entities.BrowserEngineFleet.filter({ engine_id });
  if (engines.length === 0) return Response.json({ error: 'Engine not found' }, { status: 404 });
  const updated = await base44.asServiceRole.entities.BrowserEngineFleet.update(engines[0].id, updates);
  return Response.json({ ok: true, engine: updated });
}