import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Quick connection test — checks if the Brain is reachable and keys match.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {}
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    const brainUrl = (secrets.get('VISION_CORTEX_BRAIN_URL') || '').replace(/\/$/, '');
    const brainKey = secrets.get('VISION_CORTEX_BRAIN_API_KEY') || '';
    const inboundKey = secrets.get('VISION_CORTEX_INBOUND_API_KEY') || '';

    const checks = {
      brain_url_set: !!brainUrl,
      brain_api_key_set: !!brainKey,
      inbound_api_key_set: !!inboundKey,
      brain_reachable: false,
      sync_from_eyes_found: false,
      brain_health_found: false,
      keys_match: false,
    };

    if (!brainUrl || !brainKey) {
      return Response.json({
        status: 'unconfigured',
        checks,
        message: 'VISION_CORTEX_BRAIN_URL and VISION_CORTEX_BRAIN_API_KEY must be set',
      });
    }

    // Test 1: Probe syncFromEyes — this is the actual sync endpoint on the Brain.
    // A 401 means wrong key (reachable but keys don't match).
    // A 200/400 means the key was accepted (keys match) — 400 just means bad payload.
    // A 404 means the function doesn't exist on the Brain.
    try {
      const res = await fetch(`${brainUrl}/functions/syncFromEyes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-eyes-api-key': brainKey,
        },
        body: JSON.stringify({ test: true }),
        signal: AbortSignal.timeout(10000),
      });
      checks.sync_from_eyes_found = res.status !== 404;
      checks.brain_reachable = res.status !== 404;
      if (res.status === 401) {
        checks.keys_match = false;
      } else if (res.status === 200 || res.status === 400 || res.status === 422) {
        checks.keys_match = true;
      }
    } catch {
      checks.sync_from_eyes_found = false;
      checks.brain_reachable = false;
    }

    let status = 'issues';
    let message = '';
    if (checks.brain_url_set && checks.brain_api_key_set && checks.brain_reachable && checks.keys_match) {
      status = 'connected';
      message = 'Brain is reachable and keys match — bi-directional sync is ready';
    } else if (checks.brain_reachable && !checks.keys_match) {
      status = 'key_mismatch';
      message = 'Brain is reachable but the API key is rejected (401). Ensure VISION_CORTEX_BRAIN_API_KEY matches the Brain\'s inbound key.';
    } else if (!checks.brain_reachable) {
      status = 'unreachable';
      message = 'Brain is not reachable — check VISION_CORTEX_BRAIN_URL or Brain app status';
    }

    return Response.json({ status, checks, brain_url: brainUrl, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}