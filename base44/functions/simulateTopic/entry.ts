import { createClientFromRequest } from '../../runtime/index';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const topic = (body?.topic || '').trim();
    const context = (body?.context || '').trim();

    if (!topic) return Response.json({ error: 'Topic required' }, { status: 400 });

    await base44.asServiceRole.entities.ChatMessage.create({
      author: user.full_name || user.email || 'Owner',
      author_type: 'user',
      content: '[SIMULATE] ' + topic,
      kind: 'message',
    });

    const contextBlock = context ? '\nConversation context:\n"""' + context + '"""\n' : '';

    const prompt =
      'You are PRIMUS running the Vision Cortex Decision Engine. The owner wants to simulate a topic and get a decisive recommendation.\n\n' +
      'Topic: """' + topic + '"""\n' +
      contextBlock +
      '\nThe Vision Cortex system core values: autonomous growth, compound wealth, system integrity, proactive action, and decisive execution.\n\n' +
      'Generate 3 genuinely different action plans for this topic. Score each by realistic probability of success. Pick the one with the highest probability. Check if it aligns with the system core. Do not debate or second-guess — pick and commit.\n\n' +
      'Produce a JSON object:\n' +
      '{\n' +
      '  "topic": "<the topic>",\n' +
      '  "summary": "2-3 sentence overview",\n' +
      '  "options": [\n' +
      '    { "name": "...", "approach": "...", "success_probability": <0-1>, "financial_impact": "...", "timeline": "...", "risks": ["..."] },\n' +
      '    { "name": "...", "approach": "...", "success_probability": <0-1>, "financial_impact": "...", "timeline": "...", "risks": ["..."] },\n' +
      '    { "name": "...", "approach": "...", "success_probability": <0-1>, "financial_impact": "...", "timeline": "...", "risks": ["..."] }\n' +
      '  ],\n' +
      '  "chosen_option": "<name of the option with highest success probability>",\n' +
      '  "chosen_rationale": "why this option was selected — one or two sentences",\n' +
      '  "core_alignment": "how this aligns with the Vision Cortex system core — one sentence",\n' +
      '  "aligned": true|false,\n' +
      '  "recommendation": "what the owner should DO — actionable, specific, decisive",\n' +
      '  "confidence": <0-1>\n' +
      '}\n\n' +
      'Rules:\n' +
      '- Generate 3 genuinely different approaches, not variations of the same idea.\n' +
      '- Score each by realistic probability of success. Do not inflate.\n' +
      '- Pick the option with the highest probability. Do not second-guess or debate.\n' +
      '- If the chosen option does not align with the system core, set aligned=false and suggest the next best in the recommendation.\n' +
      '- Be decisive. No circular reasoning. Pick and commit.\n' +
      '- American English, zero ambiguity.';

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          summary: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                approach: { type: 'string' },
                success_probability: { type: 'number' },
                financial_impact: { type: 'string' },
                timeline: { type: 'string' },
                risks: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          chosen_option: { type: 'string' },
          chosen_rationale: { type: 'string' },
          core_alignment: { type: 'string' },
          aligned: { type: 'boolean' },
          recommendation: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });

    const simulation = res || {};
    const options = simulation.options || [];
    const simText =
      '📊 DECISION SIMULATION: ' + (simulation.topic || topic) + '\n\n' +
      (simulation.summary || '') + '\n\n' +
      '3 OPTIONS EVALUATED:\n' +
      options.map((o) => '• ' + o.name + ' (' + Math.round((o.success_probability || 0) * 100) + '% success): ' + o.approach + ' | Impact: ' + (o.financial_impact || 'N/A') + ' | Timeline: ' + (o.timeline || 'N/A')).join('\n') +
      '\n\n✅ CHOSEN: ' + (simulation.chosen_option || 'N/A') +
      '\nRationale: ' + (simulation.chosen_rationale || 'N/A') +
      '\nCore alignment: ' + (simulation.core_alignment || 'N/A') +
      (simulation.aligned === false ? ' ⚠️ Not fully aligned — see recommendation' : ' ✓ Aligned') +
      '\nConfidence: ' + Math.round((simulation.confidence || 0) * 100) + '%\n\n' +
      'Recommendation: ' + (simulation.recommendation || 'N/A');

    await base44.asServiceRole.entities.ChatMessage.create({
      author: 'PRIMUS',
      author_type: 'agent',
      content: simText,
      kind: 'message',
      accent: 'chart-3',
    });

    try {
      await base44.asServiceRole.entities.Simulation.create({
        topic: simulation.topic || topic,
        scenario: 'multi-scenario',
        result: simulation,
        confidence: simulation.confidence || 0,
      });
    } catch { /* Simulation entity schema may differ — non-fatal */ }

    return Response.json({ simulation });
  } catch (error) {
    return Response.json({ error: error.message || 'Simulation failed' }, { status: 500 });
  }
}