import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// aiAssist — lightweight LLM helper for the guided flow.
// mode "expand": turns a few words into a complete sentence.
// mode "suggest": returns 3-4 suggested answers for an onboarding question.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'expand';

    let prompt;
    let schema;
    if (mode === 'suggest') {
      const ctx = body.context || {};
      prompt = `You are a brilliant entrepreneur and business strategist helping a user through onboarding.
The user's vision: "${ctx.vision || ''}"
The question being asked: "${ctx.question || ''}"
Previous answers: ${JSON.stringify(ctx.answers || [])}

Generate 3 sharp, specific suggested answers that a top-tier founder would give — answers that compound intelligently toward a locked goal. Each answer should be 1-2 sentences, concrete, and opinionated.
Return JSON: { "suggestions": [string, string, string] }`;
      schema = {
        type: 'object',
        properties: { suggestions: { type: 'array', items: { type: 'string' } } },
        required: ['suggestions'],
      };
    } else {
      prompt = `You are an AI assistant helping a user express their vision clearly. The user typed a few rough words: "${body.text || ''}".${body.context ? ` Context: ${body.context}` : ''}
Expand this into one clear, specific, complete sentence that captures what the user most likely means. Keep it in the user's voice — do not add goals they didn't imply.
Return JSON: { "expanded": string }`;
      schema = {
        type: 'object',
        properties: { expanded: { type: 'string' } },
        required: ['expanded'],
      };
    }

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: schema,
    });
    return Response.json(res);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}