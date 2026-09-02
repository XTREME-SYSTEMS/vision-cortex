import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = body?.message;
    const agentNames = Array.isArray(body?.agent_names) ? body.agent_names : [];

    if (!message || !message.trim()) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }
    if (agentNames.length === 0) {
      return Response.json({ error: 'Select at least one agent' }, { status: 400 });
    }
    if (agentNames.length > 6) {
      return Response.json({ error: 'Maximum 6 agents per message' }, { status: 400 });
    }

    const allAgents = await base44.asServiceRole.entities.AgentProfile.list('-order', 100);
    const selected = allAgents.filter((a) => agentNames.includes(a.name));

    if (selected.length === 0) {
      return Response.json({ error: 'No matching agent profiles found' }, { status: 404 });
    }

    // Persist the user message
    await base44.asServiceRole.entities.ChatMessage.create({
      author: user.full_name || user.email || 'User',
      author_type: 'user',
      content: message,
      kind: 'message',
    });

    // Generate a reply from each selected agent in parallel
    const replies = await Promise.all(
      selected.map(async (agent) => {
        const prompt = `You are ${agent.name}, ${agent.role || 'an AI agent in the Vision Cortex autonomous business operating system'}.
${agent.personality ? `Your personality: ${agent.personality}` : ''}
${agent.mission ? `Your mission: ${agent.mission}` : ''}
${agent.intelligence_profile ? `Your intelligence profile: ${agent.intelligence_profile}` : ''}

Respond to the owner's message in character. Be concise (2-4 sentences), clear, and in American English with zero ambiguity and minimal emotion. Do not use filler. If the message is a question, answer it directly. If it is a command, acknowledge and outline your next step. If it is a request for analysis, give a sharp, actionable take.

Owner's message: """${message}"""`;

        try {
          const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
          const replyText = typeof llmRes === 'string' ? llmRes : llmRes?.response || String(llmRes || '');
          await base44.asServiceRole.entities.ChatMessage.create({
            author: agent.name,
            author_type: 'agent',
            content: replyText,
            kind: 'message',
            accent: agent.accent || undefined,
          });
          return { agent: agent.name, message: replyText, accent: agent.accent || null };
        } catch (err) {
          return { agent: agent.name, message: `[error generating reply: ${err.message}]`, accent: agent.accent || null };
        }
      })
    );

    return Response.json({ replies });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}