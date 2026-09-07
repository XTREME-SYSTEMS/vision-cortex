import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    const apiKey = process.env.XTREME_COMMS_API_KEY;
    const baseUrl = (process.env.XTREME_COMMS_URL || 'https://xtreme-communications.com').replace(/\/$/, '');

    if (!apiKey) {
      return Response.json({
        error: 'Xtreme Communications not configured. Set XTREME_COMMS_API_KEY secret (generate an admin API key with full scopes from the API Keys page).',
        configured: false,
      }, { status: 400 });
    }

    // Helper: call a function on the Xtreme Communications platform
    const callFunction = async (functionName: string, payload: any = {}) => {
      const r = await fetch(`${baseUrl}/functions/${functionName}`, {
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
        return Response.json({ configured: true, status: 'ready', baseUrl, hasKey: true });
      }

      case 'runAutonomousAudit': {
        const result = await callFunction('runAutonomousAudit', body.payload || {});
        await base44.asServiceRole.entities.AgentLog.create({
          agent_name: 'PRIMUS',
          category: 'audit',
          level: result.ok ? 'success' : 'error',
          message: 'Xtreme Comms autonomous audit',
          detail: JSON.stringify(result.data).slice(0, 500),
        });
        return Response.json({ action: 'autonomous_audit', ...result });
      }

      case 'preflightHeal': {
        const result = await callFunction('preflightHeal', body.payload || {});
        await base44.asServiceRole.entities.AgentLog.create({
          agent_name: 'PRIMUS',
          category: 'heal',
          level: result.ok ? 'success' : 'error',
          message: 'Xtreme Comms auto-heal',
          detail: JSON.stringify(result.data).slice(0, 500),
        });
        return Response.json({ action: 'auto_heal', ...result });
      }

      case 'send_sms': {
        const result = await callFunction('sendSms', { to: body.to, from: body.from, body: body.body });
        return Response.json({ action: 'send_sms', ...result });
      }

      case 'send_mms': {
        const result = await callFunction('sendMms', { to: body.to, from: body.from, body: body.body, media_url: body.media_url });
        return Response.json({ action: 'send_mms', ...result });
      }

      case 'send_whatsapp': {
        const result = await callFunction('sendWhatsApp', { to: body.to, from: body.from, body: body.body });
        return Response.json({ action: 'send_whatsapp', ...result });
      }

      case 'send_email': {
        const result = await callFunction('sendEmail', { to: body.to, subject: body.subject, body: body.body, from: body.from });
        return Response.json({ action: 'send_email', ...result });
      }

      case 'make_call': {
        const result = await callFunction('makeCall', { to: body.to, from: body.from, agent_id: body.agent_id, instructions: body.instructions });
        return Response.json({ action: 'make_call', ...result });
      }

      case 'buy_number': {
        const result = await callFunction('buyNumber', { area_code: body.area_code, country_code: body.country_code || 'US' });
        return Response.json({ action: 'buy_number', ...result });
      }

      case 'list_numbers': {
        const result = await callFunction('listNumbers', {});
        return Response.json({ action: 'list_numbers', ...result });
      }

      case 'create_voice_agent': {
        const result = await callFunction('createVoiceAgent', { name: body.name, voice: body.voice, instructions: body.instructions, model: body.model });
        return Response.json({ action: 'create_voice_agent', ...result });
      }

      case 'list_voice_agents': {
        const result = await callFunction('listVoiceAgents', {});
        return Response.json({ action: 'list_voice_agents', ...result });
      }

      // Generic action — call any function on the Xtreme Communications platform by name
      case 'call_function': {
        if (!body.function_name) return Response.json({ error: 'function_name required' }, { status: 400 });
        const result = await callFunction(body.function_name, body.payload || {});
        return Response.json({ action: 'call_function', function: body.function_name, ...result });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'Xtreme Comms failed' }, { status: 500 });
  }
}