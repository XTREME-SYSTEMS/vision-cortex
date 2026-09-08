import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Vercel AI Gateway — highest realtime model: openai/gpt-realtime-2.1
const GATEWAY_BASE = 'https://ai-gateway.vercel.sh';
const REALTIME_MODEL = 'openai/gpt-realtime-2.1';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const voice = body?.voice || 'alloy';

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: 'AI_GATEWAY_API_KEY not configured. Set it in Settings → Secrets.',
        configured: false,
      }, { status: 400 });
    }

    // Load user personalization settings
    const settingsList = await base44.asServiceRole.entities.AgentSettings.list('-updated_date', 1);
    const s = settingsList[0] || {};

    const instructions = [
      'You are Prime, the primary orchestrator of Vision Cortex V-1.',
      'You are having a real-time voice conversation with the owner. Be natural, conversational, and concise — like speaking to a real human.',
      'Do not read out long lists or bullet points. Speak in short, natural sentences.',
      'You have access to the full Vision Cortex system: autonomous outreach, lead generation, CRM, clone factory, swarm dispatch, and more.',
      'When the user asks you to do something, confirm it briefly and naturally. If it requires approval, mention that.',
      s.user_name ? `The user's name is ${s.user_name}. Address them by name when natural.` : '',
      s.about_user ? `About the user: ${s.about_user}` : '',
      s.response_style ? `Response style: ${s.response_style}` : '',
      s.tone ? `Tone: ${s.tone}` : '',
      s.personality_traits?.length ? `Traits: ${s.personality_traits.join(', ')}` : '',
      s.conversation_rules?.length ? `Rules: ${s.conversation_rules.join('; ')}` : '',
      s.language ? `Language: ${s.language}` : '',
    ].filter(Boolean).join('\n');

    // Mint a short-lived client secret from Vercel AI Gateway
    const tokenResponse = await fetch(`${GATEWAY_BASE}/v1/realtime/client-secrets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        expiresAfterSeconds: 600, // 10 minutes
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return Response.json({
        error: `Vercel AI Gateway error: ${errText}`,
        status: tokenResponse.status,
      }, { status: 500 });
    }

    const secret = await tokenResponse.json();

    // Construct the WebSocket URL for the realtime model
    const wsUrl = `wss://ai-gateway.vercel.sh/v4/ai/realtime-model?ai-model-id=${encodeURIComponent(REALTIME_MODEL)}`;

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'PRIMUS',
      category: 'voice',
      level: 'success',
      message: 'Vercel AI Gateway realtime session created',
      detail: JSON.stringify({ model: REALTIME_MODEL, voice, expiresAt: secret.expiresAt }),
    });

    return Response.json({
      token: secret.token,
      url: wsUrl,
      model: REALTIME_MODEL,
      voice,
      instructions,
      expiresAt: secret.expiresAt,
      protocols: ['ai-gateway-realtime.v1', `ai-gateway-auth.${secret.token}`],
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to create realtime session' }, { status: 500 });
  }
}