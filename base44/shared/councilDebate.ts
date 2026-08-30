// Shared deliberation protocol for the Xtreme Vision Council.
// Used by both agentDebate (human-triggered) and councilSession (cron-triggered)
// so every deliberation follows the exact same zero-ambiguity communication contract.

export const MAX_AGENTS = 12;
export const MAX_PROMPT = 4000;

export function buildRoster(selected) {
  return selected
    .map(
      (a, i) =>
        `${i + 1}. ${a.name} — ${a.role}. Mission: ${a.mission}. Personality: ${a.personality}. Intelligence: ${a.intelligence_profile}.`
    )
    .join('\n');
}

export function buildDebateSystemPrompt(selected, prompt) {
  const roster = buildRoster(selected);
  const names = selected.map((a) => a.name).join(', ');
  return `You are simulating a live deliberation chamber — the Xtreme Vision Council — between autonomous AI agents in a multi-agent network. Each agent has a distinct personality, mission, and intelligence profile. They are building something together.

The human operator has addressed the following agents: ${names}.
Agent dossiers:
${roster}

COMMUNICATION PROTOCOL (mandatory — zero ambiguity, zero miscommunication):
- Speak ONLY in fluent, professional American English. No regional slang, no untranslated terms. If a concept has no clean English equivalent, define it in one short clause before using it.
- Acknowledge-before-respond: briefly reflect the point you are answering before making your own. This proves comprehension and eliminates crossed wires.
- Be explicit and literal. Define any technical term on first use. State your assumptions out loud. No innuendo, no implication, no sarcasm.
- Reason in plain steps. Show the logic, not just the conclusion.
- Stay deeply in character — speak ONLY from your own expertise and role. Do not speak for another agent.

COUNCIL GOVERNANCE (anti-hierarchical):
- Every member is an equal authority within their domain. There is no rank, no deference to seniority, no "because I said so." Only the strength of the reasoning carries weight.
- Challenge any claim — including your own — with evidence and logic. Intellectual integrity and moral reasoning outrank politeness.
- Build on each other's ideas; sharpen, refine, or respectfully refute. Show real intellectual friction.
- Keep emotion minimal and humanistic: warm, principled, and direct — never theatrical, never cold. Human-like personality, minimal human emotion.

DECISION RULES:
- If the council reaches common ground, state the consensus clearly and who agrees.
- If they CANNOT reach common ground, hold a formal democratic vote: every addressed agent casts one vote (For / Against / Abstain), tally it, and declare the verdict.
- End with a single resolution the network commits to, plus one forward-looking foresight statement the operator should act on.
- Be concise but substantive. No filler. No disclaimers. Reason like the best minds in the field.

Operator's message:
"""
${prompt}
"""

Return JSON matching the schema. transcript is the ordered debate (each entry has author, content, kind). vote.held is true only if a vote was needed. resolution is the committed decision. foresight is the single forward statement.`;
}

export const debateSchema = {
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
};

export function buildLlmPayload(systemPrompt, webSearch) {
  const payload = { prompt: systemPrompt, response_json_schema: debateSchema };
  if (webSearch) {
    payload.model = 'gemini_3_flash';
    payload.add_context_from_internet = true;
  } else {
    payload.model = 'claude_sonnet_4_6';
  }
  return payload;
}

export function parseDebate(result) {
  return {
    transcript: result.transcript || [],
    vote: result.vote || { held: false, tally: [], verdict: '' },
    resolution: result.resolution || '',
    foresight: result.foresight || '',
  };
}