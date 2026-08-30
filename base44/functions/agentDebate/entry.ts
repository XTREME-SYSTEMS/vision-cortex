import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildDebateSystemPrompt, buildLlmPayload, parseDebate, MAX_AGENTS, MAX_PROMPT } from '../../shared/councilDebate.ts';

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

    const systemPrompt = buildDebateSystemPrompt(selected, prompt);
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM(buildLlmPayload(systemPrompt, webSearch));
    const parsed = parseDebate(result);

    return Response.json({ agents: selected, webSearch, ...parsed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}