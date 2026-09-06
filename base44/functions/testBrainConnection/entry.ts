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

    // Test 1: Brain health endpoint
    try {
      const res = await fetch(`${brainUrl}/functions/brainHealth`, {
        headers: { 'x-eyes-api-key': brainKey },
        signal: AbortSignal.timeout(10000),
      });
      checks.brain_reachable = res.ok;
      checks.brain_health_found = res.ok;
      if (res.status === 401) {
        checks.keys_match = false;
        checks.brain_reachable = true; // reachable but wrong key
      } else if (res.ok) {
        checks.keys_match = true;
      }
    } catch (e) {
      checks.brain_reachable = false;
    }

    // Test 2: syncFromEyes endpoint (should return 401 without proper key, 400 with key but no body)
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
    } catch {
      checks.sync_from_eyes_found = false;
    }

    const allGood = checks.brain_url_set && checks.brain_api_key_set && checks.brain_reachable && checks.keys_match;

    return Response.json({
      status: allGood ? 'connected' : 'issues',
      checks,
      brain_url: brainUrl,
      message: allGood
        ? 'Brain is reachable and keys match — bi-directional sync is ready'
        : 'See checks for issues — Brain may need brainHealth function or keys may not match',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}