import { createClientFromRequest, secrets } from '../../runtime/index';

// Probes the Cloud Browser engine (Railway-hosted) and reports its health.
// The engine runs 3 instances for redundancy — this checks each one.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {}
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    const cbUrl = (secrets.get('CLOUD_BROWSER_URL') || '').replace(/\/$/, '');
    const cbKey = secrets.get('CLOUD_BROWSER_API_KEY') || '';

    if (!cbUrl || !cbKey) {
      return Response.json({
        status: 'unconfigured',
        message: 'CLOUD_BROWSER_URL or CLOUD_BROWSER_API_KEY not set',
        engines: [],
      });
    }

    // Probe the engine's health endpoint
    const engines = [];
    let overallHealthy = false;

    try {
      const res = await fetch(`${cbUrl}/health`, {
        headers: { 'x-api-key': cbKey },
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }

      const isHealthy = res.ok && !text.includes('Application not found') && !text.includes('<!DOCTYPE');
      overallHealthy = isHealthy;

      engines.push({
        engine_url: cbUrl,
        engine_label: 'primary',
        status: isHealthy ? 'healthy' : 'down',
        http_code: res.status,
        response: body,
      });
    } catch (e) {
      engines.push({
        engine_url: cbUrl,
        engine_label: 'primary',
        status: 'unreachable',
        error: e.message,
      });
    }

    // If healthy, also test session creation
    let sessionTest = null;
    if (overallHealthy) {
      try {
        const sessRes = await fetch(`${cbUrl}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': cbKey },
          body: JSON.stringify({ usePool: true }),
          signal: AbortSignal.timeout(10000),
        });
        const sessData = await sessRes.json();
        if (sessRes.ok && sessData?.sessionId) {
          sessionTest = { status: 'ok', sessionId: sessData.sessionId };
          // Clean up the test session
          await fetch(`${cbUrl}/sessions/${sessData.sessionId}`, {
            method: 'DELETE',
            headers: { 'x-api-key': cbKey },
          }).catch(() => {});
        } else {
          sessionTest = { status: 'failed', code: sessRes.status, body: sessData };
        }
      } catch (e) {
        sessionTest = { status: 'error', error: e.message };
      }
    }

    // Log an alert if the engine is down
    if (!overallHealthy) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          title: 'Cloud Browser Engine Down',
          message: `The Cloud Browser engine at ${cbUrl} is returning errors. Railway deploy may need attention.`,
          type: 'system_alert',
          severity: 'critical',
          read: false,
        });
      } catch {}
    }

    return Response.json({
      status: overallHealthy ? 'healthy' : 'down',
      engine_url: cbUrl,
      engines,
      session_test: sessionTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}