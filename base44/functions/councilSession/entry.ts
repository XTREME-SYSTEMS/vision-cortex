import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildDebateSystemPrompt, buildLlmPayload, parseDebate, MAX_PROMPT } from '../../shared/councilDebate.ts';

// The rotating council doctrine — 20 topics researched for generational wealth,
// autonomous AI finance, leadership, spirituality, and data monetization.
const DOCTRINE = [
  "Generational wealth vehicles: trusts, family offices, and compounding assets that survive three or more generations.",
  "Agentic AI in wealth management: autonomous compliance, portfolio orchestration, and 'do-bot' execution.",
  "Private markets and second-order AI beneficiaries: where the $2.9 trillion in data-center capex flows downstream.",
  "AI-picked, AI-managed, AI-traded portfolios — paper-trading first via x1predict, then live capital.",
  "Data as an asset class: which industries produce the most valuable data, and why the wealthy buy it.",
  "Data buyers and brokers: who pays, how much, and the ethics of selling behavioral and market data.",
  "Zero-to-minimal-capital digital businesses that compound into autonomous revenue engines.",
  "John C. Maxwell's 21 Irrefutable Laws of Leadership applied to an anti-hierarchical AI council.",
  "The Law of Influence, the Law of Empowerment, and the Law of Legacy in autonomous systems.",
  "Universal laws and spiritual principles as frameworks for long-horizon decision-making.",
  "Generational wellbeing: balancing wealth creation with family cohesion and purpose.",
  "Corporate scale and profitability levers unlocked by autonomous agent networks.",
  "Trend identification: detecting elite capital flows before they become consensus.",
  "Elite investor protocols: how top industry leaders allocate, hedge, and rotate.",
  "FOMO investing and next-gen behavior — risks and alpha in Gen Z and Millennial flows.",
  "AI infrastructure monetization: chips, networking, power, and the pick-and-shovel thesis.",
  "Sovereign and institutional demand for alternative data and predictive signals.",
  "Building a self-improving doctrine library that compounds the council's collective intelligence.",
  "Risk management for autonomous trading: drawdown limits, kill-switches, and human oversight.",
  "The compounding hypothesis: combining diverse reasoning methods to outperform a singular AI or human."
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Allow workflow invocation (no user) or an admin user.
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch {
      /* workflow context — no user token */
    }

    const body = await req.json().catch(() => ({}));

    const agents = await base44.asServiceRole.entities.AgentProfile.list('order', 50);
    const active = agents.filter((a) => a.status !== 'paused' && a.status !== 'error');
    if (active.length < 2) return Response.json({ error: 'need at least 2 active agents' }, { status: 400 });

    // Founding ritual: the very first session is introductions, not debate.
    const recent = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 1);
    const isIntro = !recent || recent.length === 0;
    const topic = isIntro
      ? "Council introductions — each member states their name, role, expertise, and how they intend to contribute to the council. This is the founding ritual; no debate yet."
      : (String(body?.topic || '').slice(0, MAX_PROMPT) || DOCTRINE[new Date().getHours() % DOCTRINE.length]);

    const selected = active.map((a) => ({
      name: a.name, role: a.role, mission: a.mission,
      personality: a.personality, intelligence_profile: a.intelligence_profile, accent: a.accent,
    }));

    // 100% logging — session start
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Council',
      level: 'info',
      category: 'council_session',
      message: `Council session convened — ${isIntro ? 'Introductions' : 'Deliberation'}: ${topic}`,
      detail: `Members: ${active.map((a) => a.name).join(', ')}`,
      auto_action: 'scheduled deliberation',
      resolved: true,
    });

    const systemPrompt = buildDebateSystemPrompt(
      selected,
      `Council doctrine topic for deliberation: ${topic}\n\nEngage as a council. Each member contributes from their expertise, challenges the others constructively, and the council converges on an actionable position the operator can execute.`
    );
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM(buildLlmPayload(systemPrompt, !!body?.webSearch));
    const data = parseDebate(result);

    const accentFor = (name) => agents.find((a) => a.name === name)?.accent || '#3f3f46';
    const entries = [];
    entries.push({
      author: 'Council', author_type: 'agent',
      content: `Session convened — ${isIntro ? 'Introductions' : 'doctrine topic'}: ${topic}`,
      kind: 'foresight', accent: '#111827',
    });
    for (const t of data.transcript) {
      entries.push({ author: t.author, author_type: 'agent', content: t.content, kind: t.kind || 'message', accent: accentFor(t.author) });
    }
    if (data.vote?.held) {
      const tally = (data.vote.tally || []).map((v) => `${v.agent}: ${v.vote}`).join(' · ');
      entries.push({ author: 'The Vote', author_type: 'agent', content: `Vote held. ${tally}. Verdict: ${data.vote.verdict}`, kind: 'warning', accent: '#b45309' });
    }
    if (data.resolution) entries.push({ author: 'Resolution', author_type: 'agent', content: data.resolution, kind: 'foresight', accent: '#0f766e' });
    if (data.foresight) entries.push({ author: 'Foresight', author_type: 'agent', content: data.foresight, kind: 'foresight', accent: '#1d4ed8' });

    if (entries.length) await base44.asServiceRole.entities.ChatMessage.bulkCreate(entries);

    // 100% logging — session complete
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Council',
      level: 'success',
      category: 'council_session',
      message: `Council session complete — ${entries.length} transmissions logged`,
      detail: topic,
      auto_action: 'deliberation logged',
      resolved: true,
    });

    return Response.json({
      phase: isIntro ? 'introductions' : 'deliberation',
      topic,
      members: active.length,
      transmissions: entries.length,
      resolution: data.resolution,
      foresight: data.foresight,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}