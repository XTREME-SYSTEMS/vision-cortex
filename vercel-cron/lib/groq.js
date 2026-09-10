// Shared Groq LLM client — calls Groq directly, zero Base44 credits.
// Groq has a free tier; GROQ_API_KEY is already set as an app secret.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export async function groq(prompt, { maxTokens = 1500, system, temperature = 0.3 } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            system ||
            'You are the Vision Cortex Autonomous Engine (V-1). You self-audit, self-architect, self-implement, self-validate, and self-push. Output ONLY valid JSON — no markdown fences, no prose outside JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

export function tryParseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}