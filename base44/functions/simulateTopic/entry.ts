import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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
      'You are PRIMUS running the Vision Cortex Simulation Engine. The owner wants to simulate a topic under discussion. Produce a rigorous, multi-scenario simulation.\n\n' +
      'Topic to simulate: """' + topic + '"""\n' +
      contextBlock +
      '\nProduce a simulation as a single JSON object:\n' +
      '{\n' +
      '  "topic": "<the topic>",\n' +
      '  "summary": "2-3 sentence overview of what this simulation models",\n' +
      '  "key_variables": ["the 3-6 variables that most influence the outcome"],\n' +
      '  "scenarios": [\n' +
      '    { "name": "Best Case", "probability": <0-1>, "outcome": "...", "financial_impact": "...", "timeline": "...", "triggers": ["..."] },\n' +
      '    { "name": "Base Case", "probability": <0-1>, "outcome": "...", "financial_impact": "...", "timeline": "...", "triggers": ["..."] },\n' +
      '    { "name": "Worst Case", "probability": <0-1>, "outcome": "...", "financial_impact": "...", "timeline": "...", "triggers": ["..."] }\n' +
      '  ],\n' +
      '  "expected_value": "weighted expected outcome — one line",\n' +
      '  "key_risks": ["top 3 risks"],\n' +
      '  "opportunities": ["top 3 upside opportunities"],\n' +
      '  "recommendation": "what the owner should DO based on this simulation — actionable, specific",\n' +
      '  "confidence": <0-1>,\n' +
      '  "next_simulations": ["2-3 related topics worth simulating next"]\n' +
      '}\n\n' +
      'Rules:\n' +
      '- Probabilities must sum to 1.0 across the three scenarios.\n' +
      '- Be concrete and specific to the topic. No generic filler.\n' +
      '- Financial impact: estimate in USD or % when applicable; use "N/A" only when truly not applicable.\n' +
      '- Confidence reflects real uncertainty. Do not inflate.\n' +
      '- American English, zero ambiguity.';

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          summary: { type: 'string' },
          key_variables: { type: 'array', items: { type: 'string' } },
          scenarios: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                probability: { type: 'number' },
                outcome: { type: 'string' },
                financial_impact: { type: 'string' },
                timeline: { type: 'string' },
                triggers: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          expected_value: { type: 'string' },
          key_risks: { type: 'array', items: { type: 'string' } },
          opportunities: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          confidence: { type: 'number' },
          next_simulations: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    const simulation = res || {};
    const scenarios = simulation.scenarios || [];
    const simText =
      '📊 SIMULATION: ' + (simulation.topic || topic) + '\n\n' +
      (simulation.summary || '') + '\n\n' +
      'SCENARIOS:\n' +
      scenarios.map((s) => '• ' + s.name + ' (' + Math.round((s.probability || 0) * 100) + '%): ' + s.outcome + ' | Impact: ' + (s.financial_impact || 'N/A') + ' | Timeline: ' + (s.timeline || 'N/A')).join('\n') +
      '\n\nExpected value: ' + (simulation.expected_value || 'N/A') +
      '\nConfidence: ' + Math.round((simulation.confidence || 0) * 100) + '%\n\n' +
      'Risks: ' + ((simulation.key_risks || []).join('; ')) + '\n' +
      'Opportunities: ' + ((simulation.opportunities || []).join('; ')) + '\n\n' +
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