import { createClientFromRequest } from '../../runtime/index';

const XTREME_OS_URL = 'https://xtremeos.base44.app';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    const apiKey = process.env.XTREME_OS_API_KEY || process.env.XTREME_COMMS_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: 'Xtreme OS not configured. Set XTREME_OS_API_KEY secret (xpo_ prefixed key from Xtreme OS API Keys page).',
        configured: false,
      }, { status: 400 });
    }

    // Single endpoint for all Xtreme OS commands
    const callCommand = async (command: string, payload: any = {}) => {
      const r = await fetch(`${XTREME_OS_URL}/functions/executeSystemCommand`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, ...payload }),
      });
      const data = await r.json().catch(() => ({ raw: null }));
      return { ok: r.ok, status: r.status, data };
    };

    switch (action) {
      case 'status': {
        return Response.json({ configured: true, status: 'ready', baseUrl: XTREME_OS_URL, hasKey: true });
      }

      // ── Xtreme OS native commands ──
      case 'system_status': {
        const result = await callCommand('system_status');
        return Response.json({ action: 'system_status', ...result });
      }

      case 'list_capabilities': {
        const result = await callCommand('list_capabilities');
        return Response.json({ action: 'list_capabilities', ...result });
      }

      case 'entity_crud': {
        if (!body.entity_name) return Response.json({ error: 'entity_name required' }, { status: 400 });
        const result = await callCommand('entity_crud', {
          operation: body.operation || 'read',
          entity_name: body.entity_name,
          query: body.query || {},
          limit: body.limit || 50,
          data: body.data,
          record_id: body.record_id,
        });
        return Response.json({ action: 'entity_crud', entity: body.entity_name, operation: body.operation || 'read', ...result });
      }

      case 'invoke_function': {
        if (!body.function_name) return Response.json({ error: 'function_name required' }, { status: 400 });
        const result = await callCommand('invoke_function', {
          function_name: body.function_name,
          payload: body.payload || {},
        });
        return Response.json({ action: 'invoke_function', function: body.function_name, ...result });
      }

      case 'query_rag': {
        if (!body.query) return Response.json({ error: 'query required' }, { status: 400 });
        const result = await callCommand('query_rag', {
          query: body.query,
          company_key: body.company_key || 'xps',
        });
        return Response.json({ action: 'query_rag', ...result });
      }

      // ── Legacy comms actions — mapped to invoke_function on Xtreme OS ──
      case 'send_sms': {
        const result = await callCommand('invoke_function', {
          function_name: 'sendSms',
          payload: { to: body.to, from: body.from, body: body.body },
        });
        return Response.json({ action: 'send_sms', ...result });
      }

      case 'send_mms': {
        const result = await callCommand('invoke_function', {
          function_name: 'sendMms',
          payload: { to: body.to, from: body.from, body: body.body, media_url: body.media_url },
        });
        return Response.json({ action: 'send_mms', ...result });
      }

      case 'send_whatsapp': {
        const result = await callCommand('invoke_function', {
          function_name: 'sendWhatsApp',
          payload: { to: body.to, from: body.from, body: body.body },
        });
        return Response.json({ action: 'send_whatsapp', ...result });
      }

      case 'send_email': {
        const result = await callCommand('invoke_function', {
          function_name: 'sendEmail',
          payload: { to: body.to, subject: body.subject, body: body.body, from: body.from },
        });
        return Response.json({ action: 'send_email', ...result });
      }

      case 'make_call': {
        const result = await callCommand('invoke_function', {
          function_name: 'makeCall',
          payload: { to: body.to, from: body.from, agent_id: body.agent_id, instructions: body.instructions },
        });
        return Response.json({ action: 'make_call', ...result });
      }

      case 'buy_number': {
        const result = await callCommand('invoke_function', {
          function_name: 'buyNumber',
          payload: { area_code: body.area_code, country_code: body.country_code || 'US' },
        });
        return Response.json({ action: 'buy_number', ...result });
      }

      case 'list_numbers': {
        const result = await callCommand('invoke_function', {
          function_name: 'listNumbers',
          payload: {},
        });
        return Response.json({ action: 'list_numbers', ...result });
      }

      case 'create_voice_agent': {
        const result = await callCommand('invoke_function', {
          function_name: 'createVoiceAgent',
          payload: { name: body.name, voice: body.voice, instructions: body.instructions, model: body.model },
        });
        return Response.json({ action: 'create_voice_agent', ...result });
      }

      case 'list_voice_agents': {
        const result = await callCommand('invoke_function', {
          function_name: 'listVoiceAgents',
          payload: {},
        });
        return Response.json({ action: 'list_voice_agents', ...result });
      }

      // ── Audit / heal (mapped to invoke_function) ──
      case 'runAutonomousAudit': {
        const result = await callCommand('invoke_function', {
          function_name: 'runAutonomousAudit',
          payload: body.payload || {},
        });
        await base44.asServiceRole.entities.AgentLog.create({
          agent_name: 'PRIMUS',
          category: 'audit',
          level: result.ok ? 'success' : 'error',
          message: 'Xtreme OS autonomous audit',
          detail: JSON.stringify(result.data).slice(0, 500),
        });
        return Response.json({ action: 'autonomous_audit', ...result });
      }

      case 'preflightHeal': {
        const result = await callCommand('invoke_function', {
          function_name: 'preflightHeal',
          payload: body.payload || {},
        });
        await base44.asServiceRole.entities.AgentLog.create({
          agent_name: 'PRIMUS',
          category: 'heal',
          level: result.ok ? 'success' : 'error',
          message: 'Xtreme OS auto-heal',
          detail: JSON.stringify(result.data).slice(0, 500),
        });
        return Response.json({ action: 'auto_heal', ...result });
      }

      // ── Generic passthrough ──
      case 'call_function': {
        if (!body.function_name) return Response.json({ error: 'function_name required' }, { status: 400 });
        const result = await callCommand('invoke_function', {
          function_name: body.function_name,
          payload: body.payload || {},
        });
        return Response.json({ action: 'call_function', function: body.function_name, ...result });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'Xtreme OS command failed' }, { status: 500 });
  }
}