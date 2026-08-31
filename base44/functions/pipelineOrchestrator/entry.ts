import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildRoster } from '../../shared/councilDebate.ts';

// The recursive enhancement engine of the autonomous income pipeline.
// Each cycle: the Council deliberates over current pipeline state, reviews the
// top queued opportunity for launch-readiness, identifies the next opportunity,
// compounds a doctrine, and logs the transcript to the War Room.
// Admin or workflow (no user) invocation.

const GOAL = `Persistent end result: autonomous, 24/7, high-growth residual income from digital businesses operated by the Vision Cortex council with zero human intervention. Pipeline: Vision + Strategy find opportunities -> Validator gates -> BuildQueue -> AutoBuilder provisions domain/URL, builds, launches -> income compounds back into the doctrine brain. Recursively enhance the pipeline each cycle until a high-probability, high-growth success ratio is achieved.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    try {
      const u = await base44.auth.me();
      if (u && u.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context — no user token */ }

    const [agents, queue, ideas, doctrine] = await Promise.all([
      base44.asServiceRole.entities.AgentProfile.list('order', 50),
      base44.asServiceRole.entities.BuildQueue.filter({ stage: 'queued' }, '-priority', 10),
      base44.asServiceRole.entities.Idea.list('-created_date', 10),
      base44.asServiceRole.entities.Doctrine.list('-created_date', 8),
    ]);
    const active = agents.filter((a) => a.status !== 'paused' && a.status !== 'error').slice(0, 12);
    const topQueued = queue[0];

    const stateSummary = [
      `TOP QUEUED: ${topQueued ? `${topQueued.title} — ${String(topQueued.notes || '').slice(0, 200)}` : 'none'}`,
      `RECENT IDEAS: ${ideas.map((i) => i.title).join(', ') || 'none'}`,
      `RECENT DOCTRINE: ${doctrine.map((d) => d.topic).join(', ') || 'none'}`,
    ].join('\n');

    const roster = buildRoster(active.map((a) => ({
      name: a.name, role: a.role, mission: a.mission,
      personality: a.personality, intelligence_profile: a.intelligence_profile,
    })));

    const prompt = `You are the Xtreme Vision Council running a recursive pipeline-enhancement cycle.\n\nAgent dossiers:\n${roster}\n\nPERSISTENT GOAL:\n${GOAL}\n\nCURRENT PIPELINE STATE:\n${stateSummary}\n\nDeliberate as a council and do TWO things:\n1. REVIEW the top queued opportunity (if any). Decide if it is ready to launch unattended — confidence >= 0.8, primary risk mitigated, unit economics positive. Set ready_to_launch true only if all three hold.\n2. IDENTIFY the next best opportunity to add to the queue — a fully digital, AI-operated, 24/7 business with realistic income grounded in current market reality (use live web search).\n\nReturn JSON: transcript (ordered debate, each {author, content, kind}), ready_to_launch (boolean), next_opportunity ({title, one_liner, why_now, autonomous_loop, launch_cost_usd, est_monthly_profit_usd, time_to_launch_days, primary_risk, human_gate}), doctrine_insight (one durable principle to compound), next_action (single concrete step), resolution, foresight.`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          transcript: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, content: { type: 'string' }, kind: { type: 'string' } }, required: ['author', 'content'] } },
          ready_to_launch: { type: 'boolean' },
          next_opportunity: { type: 'object', properties: { title: { type: 'string' }, one_liner: { type: 'string' }, why_now: { type: 'string' }, autonomous_loop: { type: 'string' }, launch_cost_usd: { type: 'number' }, est_monthly_profit_usd: { type: 'number' }, time_to_launch_days: { type: 'number' }, primary_risk: { type: 'string' }, human_gate: { type: 'string' } } },
          doctrine_insight: { type: 'string' },
          next_action: { type: 'string' },
          resolution: { type: 'string' },
          foresight: { type: 'string' },
        },
        required: ['transcript', 'resolution'],
      },
    });

    // 1. Promote the top queued build to launch-ready if the council approved it.
    let promoted = null;
    if (llm.ready_to_launch && topQueued) {
      promoted = await base44.asServiceRole.entities.BuildQueue.update(topQueued.id, {
        stage: 'strategized',
        notes: `${String(topQueued.notes || '').slice(0, 1500)} | COUNCIL APPROVED for launch.`,
      });
    }

    // 2. Queue the next identified opportunity.
    let created = null;
    const op = llm.next_opportunity;
    if (op && op.title) {
      created = await base44.asServiceRole.entities.BuildQueue.create({
        title: String(op.title).slice(0, 200),
        stage: 'queued',
        priority: 3,
        assigned_agent: 'Builder',
        source: 'pipeline-orchestrator',
        notes: `${String(op.one_liner || '').slice(0, 300)} | why now: ${String(op.why_now || '').slice(0, 200)} | loop: ${String(op.autonomous_loop || '').slice(0, 300)} | cost: $${Number(op.launch_cost_usd) || 0} | est/mo: $${Number(op.est_monthly_profit_usd) || 0} | days: ${Number(op.time_to_launch_days) || 0} | risk: ${String(op.primary_risk || '').slice(0, 200)} | gate: ${String(op.human_gate || '').slice(0, 200)}`,
      });
    }

    // 3. Compound the doctrine brain.
    let doctrineRec = null;
    if (llm.doctrine_insight) {
      doctrineRec = await base44.asServiceRole.entities.Doctrine.create({
        topic: String(llm.resolution || 'Pipeline cycle').slice(0, 200),
        insight: String(llm.doctrine_insight).slice(0, 2000),
        category: 'compounding',
        confidence: 0.7,
        weight: 1,
        validated: false,
        validation_count: 0,
      });
    }

    // 4. Log the transcript to the War Room.
    const accentFor = (name) => agents.find((a) => a.name === name)?.accent || '#3f3f46';
    const entries = [{ author: 'Pipeline', author_type: 'agent', content: `Autonomous pipeline cycle — ${String(llm.resolution || '').slice(0, 500)}`, kind: 'foresight', accent: '#111827' }];
    for (const t of (llm.transcript || [])) {
      entries.push({ author: t.author, author_type: 'agent', content: t.content, kind: t.kind || 'message', accent: accentFor(t.author) });
    }
    if (llm.next_action) entries.push({ author: 'Next Action', author_type: 'agent', content: String(llm.next_action).slice(0, 1000), kind: 'opportunity', accent: '#0f766e' });
    if (llm.foresight) entries.push({ author: 'Foresight', author_type: 'agent', content: String(llm.foresight).slice(0, 1000), kind: 'foresight', accent: '#1d4ed8' });
    if (entries.length) await base44.asServiceRole.entities.ChatMessage.bulkCreate(entries);

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Council',
      level: 'success',
      category: 'pipeline_orchestrator',
      message: `Pipeline cycle complete — ${promoted ? 'promoted 1 to launch-ready; ' : ''}${created ? 'queued 1 new opportunity; ' : ''}${doctrineRec ? '+1 doctrine' : ''}`.trim(),
      detail: String(llm.resolution || '').slice(0, 500),
      auto_action: 'recursive enhancement',
      resolved: true,
    });

    return Response.json({
      ready_to_launch: !!llm.ready_to_launch,
      promoted: promoted?.id || null,
      queued: created?.id || null,
      doctrine: doctrineRec?.id || null,
      resolution: llm.resolution,
      next_action: llm.next_action,
      foresight: llm.foresight,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}