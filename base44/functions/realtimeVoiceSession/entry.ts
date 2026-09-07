import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const voice = body?.voice || 'alloy';

    // Load user personalization settings
    const settingsList = await base44.asServiceRole.entities.AgentSettings.list('-updated_date', 1);
    const s = settingsList[0] || {};

    const instructions = [
      'You are Prime, the primary orchestrator of Vision Cortex V-1.',
      'You are having a real-time voice conversation with the owner. Be natural, conversational, and concise — like speaking to a real human.',
      'Do not read out long lists or bullet points. Speak in short, natural sentences.',
      s.user_name ? `The user's name is ${s.user_name}. Address them by name when natural.` : '',
      s.about_user ? `About the user: ${s.about_user}` : '',
      s.response_style ? `Response style: ${s.response_style}` : '',
      s.tone ? `Tone: ${s.tone}` : '',
      s.personality_traits?.length ? `Traits: ${s.personality_traits.join(', ')}` : '',
      s.conversation_rules?.length ? `Rules: ${s.conversation_rules.join('; ')}` : '',
      s.language ? `Language: ${s.language}` : '',
    ].filter(Boolean).join('\n');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime-v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: voice,
        instructions: instructions,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
          interrupt_response: true,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `OpenAI error: ${errText}` }, { status: 500 });
    }

    const session = await response.json();

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'PRIMUS',
      category: 'voice',
      level: 'success',
      message: 'Realtime voice session created',
      detail: JSON.stringify({ voice, session_id: session.id }),
    });

    return Response.json({
      token: session.client_secret?.value,
      session_id: session.id,
      voice: session.voice,
      model: session.model,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to create realtime session' }, { status: 500 });
  }
}