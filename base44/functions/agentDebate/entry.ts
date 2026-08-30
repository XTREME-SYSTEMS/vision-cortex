import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const MAX_AGENTS = 12;
const MAX_PROMPT = 4000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const prompt = String(body?.prompt || '').slice(0, MAX_PROMPT);
    const agentIds = Array.isArray(body?.agentIds) ? body.agentIds.slice(0, MAX_AGENTS) : [];
    const webSearch = !!body?.webSearch;
    if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });
    if (agentIds.length === 0) return Response.json({ error: 'select at least one agent' }, { status: 400 });

    const all = await base44.entities.AgentProfile.list('order', 50);
    const selected = agentIds
      .map((id) => all.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => ({
        name: a.name,
        role: a.role,
        mission: a.mission,
        personality: a.personality,
        intelligence_profile: a.intelligence_profile,
        accent: a.accent,
      }));

    if (selected.length === 0) return Response.json({ error: 'agents not found' }, { status: 404 });

    const roster = selected
      .map(
        (a, i) =>
          `${i + 1}. ${a.name} — ${a.role}. Mission: ${a.mission}. Personality: ${a.personality}. Intelligence: ${a.intelligence_profile}.`
      )
      .join('\n');

    const systemPrompt = `You are simulating a live deliberation chamber between autonomous AI agents in a multi-agent network. Each agent has a distinct personality, mission and intelligence profile. They are building something together.

The human operator has addressed the following agents: ${selected.map((a) => a.name).join(', ')}.
Agent dossiers:
${roster}

Rules of engagement:
- Every agent speaks ONLY in its own voice and from its own expertise. Stay deeply in character.
- Run a genuine debate: agents respond to the operator, then to each other. They may agree, sharpen, challenge, or refute. Show real intellectual friction.
- Hold every contribution to the highest standard of intellectual integrity, moral reasoning, ingenuity, and human character. Call out weak logic, ethical risk, or shallow thinking — even from another agent.
- If the agents reach common ground, state the consensus clearly.
- If they CANNOT reach common ground on a recommendation, hold a formal democratic vote: every addressed agent casts one vote (For / Against / Abstain), tally it, and declare the verdict.
- End with a single resolution the network commits to, plus one forward-looking foresight statement the operator should act on.
- Be concise but substantive. No filler. No disclaimers. Reason like the best minds in the field.

Operator's message:
"""
${prompt}
"""

Return JSON matching the schema. transcript is the ordered debate (each entry has author, content, kind). vote.held is true only if a vote was needed. resolution is the committed decision. foresight is the single forward statement.`;

    const llmPayload = {
      prompt: systemPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          transcript: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                author: { type: 'string' },
                content: { type: 'string' },
                kind: { type: 'string', enum: ['message', 'insight', 'warning', 'opportunity', 'foresight'] },
              },
              required: ['author', 'content'],
            },
          },
          vote: {
            type: 'object',
            properties: {
              held: { type: 'boolean' },
              tally: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { agent: { type: 'string' }, vote: { type: 'string' } },
                  required: ['agent', 'vote'],
                },
              },
              verdict: { type: 'string' },
            },
          },
          resolution: { type: 'string' },
          foresight: { type: 'string' },
        },
        required: ['transcript', 'resolution'],
      },
    };

    if (webSearch) {
      llmPayload.model = 'gemini_3_flash';
      llmPayload.add_context_from_internet = true;
    } else {
      llmPayload.model = 'claude_sonnet_4_6';
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM(llmPayload);

    return Response.json({
      agents: selected,
      webSearch,
      transcript: result.transcript || [],
      vote: result.vote || { held: false, tally: [], verdict: '' },
      resolution: result.resolution || '',
      foresight: result.foresight || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}