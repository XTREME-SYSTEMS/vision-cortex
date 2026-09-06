import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-5.6-sol';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const prompt = body?.prompt;
    const model = body?.model || DEFAULT_MODEL;
    const system = body?.system || '';
    const maxTokens = Math.min(body?.max_tokens || 4096, 8192);
    const temperature = body?.temperature ?? 0.7;

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Missing "prompt" field' }, { status: 400 });
    }
    if (prompt.length > 32000) {
      return Response.json({ error: 'Prompt too long (max 32k chars)' }, { status: 400 });
    }

    const apiKey = secrets.get('AI_GATEWAY_API_KEY');
    if (!apiKey) return Response.json({ error: 'AI_GATEWAY_API_KEY not configured' }, { status: 500 });

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const gwRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      console.error('AI Gateway error:', gwRes.status, errText);
      return Response.json({ error: `AI Gateway returned ${gwRes.status}`, details: errText.slice(0, 500) }, { status: 502 });
    }

    const data = await gwRes.json();
    const choice = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    return Response.json({
      text: choice,
      model: data.model || model,
      usage: {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error('aiGatewayGenerate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}