import { createClientFromRequest, secrets } from '../../runtime/index';

// Eyes → Brain push: sends scored intelligence items to the Brain (V-1) app.
// The Brain receives these at /functions/syncFromEyes with header x-eyes-api-key.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {}
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'push'; // push | test
    const brainUrl = (secrets.get('VISION_CORTEX_BRAIN_URL') || '').replace(/\/$/, '');
    const brainKey = secrets.get('VISION_CORTEX_BRAIN_API_KEY') || '';

    if (!brainUrl || !brainKey) {
      return Response.json({ error: 'VISION_CORTEX_BRAIN_URL or VISION_CORTEX_BRAIN_API_KEY not set' }, { status: 500 });
    }

    const batchId = `BATCH-${Date.now()}`;

    // TEST mode — just ping the Brain's health endpoint
    if (mode === 'test') {
      try {
        const res = await fetch(`${brainUrl}/functions/brainHealth`, {
          headers: { 'x-eyes-api-key': brainKey },
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; };

        await base44.asServiceRole.entities.BrainSyncLog.create({
          direction: 'eyes_to_brain',
          operation: 'connection_test',
          status: res.ok ? 'success' : 'failed',
          brain_url: `${brainUrl}/functions/brainHealth`,
          response_code: res.status,
          details: res.ok ? 'Brain reachable' : `Brain returned ${res.status}`,
          batch_id: batchId,
        });

        return Response.json({
          reachable: res.ok,
          status: res.status,
          brain_url: brainUrl,
          response: data,
        });
      } catch (e) {
        await base44.asServiceRole.entities.BrainSyncLog.create({
          direction: 'eyes_to_brain',
          operation: 'connection_test',
          status: 'failed',
          brain_url: `${brainUrl}/functions/brainHealth`,
          details: e.message,
          batch_id: batchId,
        });
        return Response.json({ reachable: false, error: e.message, brain_url: brainUrl }, { status: 502 });
      }
    }

    // PUSH mode — gather recent high-impact intel and send to Brain
    const limit = Math.min(body.limit || 25, 100);
    const intel = await base44.asServiceRole.entities.IntelFeed.filter(
      { impact_score: { $gte: body.min_impact || 60 } },
      '-created_date',
      limit
    ).catch(() => []);

    if (intel.length === 0) {
      return Response.json({ status: 'idle', message: 'No intelligence items to push', batch_id: batchId });
    }

    const payload = {
      batch_id: batchId,
      source: 'vision_cortex_eyes',
      items: intel.map((it) => ({
        headline: it.headline,
        summary: it.summary,
        category: it.category,
        url: it.url,
        source: it.source,
        signals: it.signals || [],
        correlations: it.correlations || [],
        region: it.region,
        impact_score: it.impact_score,
        created_date: it.created_date,
      })),
    };

    try {
      const res = await fetch(`${brainUrl}/functions/syncFromEyes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-eyes-api-key': brainKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; };

      await base44.asServiceRole.entities.BrainSyncLog.create({
        direction: 'eyes_to_brain',
        operation: 'intel_push',
        status: res.ok ? 'success' : 'failed',
        items_count: intel.length,
        brain_url: `${brainUrl}/functions/syncFromEyes`,
        response_code: res.status,
        details: res.ok ? `Pushed ${intel.length} items` : `Brain returned ${res.status}: ${text.slice(0, 200)}`,
        batch_id: batchId,
      });

      return Response.json({
        status: res.ok ? 'success' : 'failed',
        pushed: intel.length,
        batch_id: batchId,
        brain_response: data,
      });
    } catch (e) {
      await base44.asServiceRole.entities.BrainSyncLog.create({
        direction: 'eyes_to_brain',
        operation: 'intel_push',
        status: 'failed',
        items_count: intel.length,
        brain_url: `${brainUrl}/functions/syncFromEyes`,
        details: e.message,
        batch_id: batchId,
      });
      return Response.json({ status: 'failed', error: e.message, pushed: 0, batch_id: batchId }, { status: 502 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}