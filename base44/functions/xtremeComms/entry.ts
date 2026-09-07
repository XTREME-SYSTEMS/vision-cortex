import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    const apiKey = process.env.XTREME_COMMS_API_KEY;
    const accountSid = process.env.XTREME_COMMS_ACCOUNT_SID;
    const baseUrl = process.env.XTREME_COMMS_URL || 'https://api.xtremecommunications.com/v1';

    if (!apiKey || !accountSid) {
      return Response.json({
        error: 'Xtreme Communications not configured. Set XTREME_COMMS_API_KEY, XTREME_COMMS_ACCOUNT_SID, and XTREME_COMMS_URL secrets.',
        configured: false,
      }, { status: 400 });
    }

    const authHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'X-Account-SID': accountSid,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'status': {
        try {
          const r = await fetch(`${baseUrl}/account`, { headers: authHeaders });
          const data = await r.json();
          return Response.json({ configured: true, status: 'connected', account: data });
        } catch (e) {
          return Response.json({ configured: true, status: 'error', error: e.message });
        }
      }

      case 'send_sms': {
        const { to, from, body: message } = body;
        if (!to || !message) return Response.json({ error: 'to and body required' }, { status: 400 });
        const r = await fetch(`${baseUrl}/messages/sms`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ to, from: from || undefined, body: message }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'SMS failed' }, { status: r.status });
        return Response.json({ sent: true, ...data });
      }

      case 'send_mms': {
        const { to, from, body: message, media_url } = body;
        if (!to || !message) return Response.json({ error: 'to and body required' }, { status: 400 });
        const r = await fetch(`${baseUrl}/messages/mms`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ to, from: from || undefined, body: message, media_url }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'MMS failed' }, { status: r.status });
        return Response.json({ sent: true, ...data });
      }

      case 'send_whatsapp': {
        const { to, from, body: message } = body;
        if (!to || !message) return Response.json({ error: 'to and body required' }, { status: 400 });
        const r = await fetch(`${baseUrl}/messages/whatsapp`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ to, from: from || undefined, body: message }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'WhatsApp failed' }, { status: r.status });
        return Response.json({ sent: true, ...data });
      }

      case 'send_email': {
        const { to, subject, body: message, from } = body;
        if (!to || !subject || !message) return Response.json({ error: 'to, subject, body required' }, { status: 400 });
        const r = await fetch(`${baseUrl}/messages/email`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ to, subject, body: message, from }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'Email failed' }, { status: r.status });
        return Response.json({ sent: true, ...data });
      }

      case 'make_call': {
        const { to, from, agent_id, instructions: callInstructions } = body;
        if (!to) return Response.json({ error: 'to required' }, { status: 400 });
        const r = await fetch(`${baseUrl}/calls`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ to, from: from || undefined, agent_id, instructions: callInstructions }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'Call failed' }, { status: r.status });
        return Response.json({ call_initiated: true, ...data });
      }

      case 'buy_number': {
        const { area_code, country_code } = body;
        const r = await fetch(`${baseUrl}/phone-numbers/purchase`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ area_code, country_code: country_code || 'US' }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'Purchase failed' }, { status: r.status });
        return Response.json({ purchased: true, ...data });
      }

      case 'list_numbers': {
        const r = await fetch(`${baseUrl}/phone-numbers`, { headers: authHeaders });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'List failed' }, { status: r.status });
        return Response.json({ numbers: data });
      }

      case 'create_voice_agent': {
        const { name, voice, instructions: agentInstructions, model } = body;
        if (!name) return Response.json({ error: 'name required' }, { status: 400 });
        const r = await fetch(`${baseUrl}/voice-agents`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ name, voice, instructions: agentInstructions, model }),
        });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'Agent creation failed' }, { status: r.status });
        return Response.json({ created: true, ...data });
      }

      case 'list_voice_agents': {
        const r = await fetch(`${baseUrl}/voice-agents`, { headers: authHeaders });
        const data = await r.json();
        if (!r.ok) return Response.json({ error: data.error || 'List failed' }, { status: r.status });
        return Response.json({ agents: data });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'Xtreme Comms failed' }, { status: 500 });
  }
}