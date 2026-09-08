import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const DEEP_CLONE_FACTORY_URL = 'https://deep-clone-factory.base44.app';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    const apiKey = process.env.DEEPCLONEFACTORY_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: 'Deep Clone Factory not configured. Set DEEPCLONEFACTORY_API_KEY secret (xck_ prefixed key).',
        configured: false,
      }, { status: 400 });
    }

    const callFactory = async (endpoint: string, payload: any = {}) => {
      const r = await fetch(`${DEEP_CLONE_FACTORY_URL}/functions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({ raw: null }));
      return { ok: r.ok, status: r.status, data };
    };

    switch (action) {
      case 'status': {
        return Response.json({ configured: true, status: 'ready', baseUrl: DEEP_CLONE_FACTORY_URL, hasKey: true });
      }

      case 'submit_queue': {
        const result = await callFactory('websiteFactory', {
          batchSize: body.batchSize || 3,
          source: body.source || 'vision_cortex',
          ...body.payload,
        });
        await base44.asServiceRole.entities.AgentLog.create({
          agent_name: 'PRIMUS',
          category: 'build',
          level: result.ok ? 'success' : 'error',
          message: 'Deep Clone Factory queue submission',
          detail: JSON.stringify({ batchSize: body.batchSize || 3, source: body.source || 'vision_cortex', ...result.data }).slice(0, 500),
        });
        return Response.json({ action: 'submit_queue', ...result });
      }

      case 'check_status': {
        const result = await callFactory('websiteFactory', { action: 'status', ...body.payload });
        return Response.json({ action: 'check_status', ...result });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'Deep Clone Factory request failed' }, { status: 500 });
  }
}