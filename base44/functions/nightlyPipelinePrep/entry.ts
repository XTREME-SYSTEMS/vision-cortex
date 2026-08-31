import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildRoster } from '../../shared/councilDebate.ts';

// Nightly ritual: reads the owner's vision statement + recent ideas, has the
// Council choose 10 fully-digital strategies, produces 10 pipeline blueprints
// with estimated results, runs a simulation (highest return, fastest return,
// best balance), and stages everything for the morning meeting.
// Admin or workflow invocation. Replaces the previous night's batch.

const GOAL = `Autonomous, 24/7, high-growth residual income from digital businesses operated by the Vision Cortex council.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    try {
      const u = await base44.auth.me();
      if (u && u.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context */ }

    const body = await req.json().catch(() => ({}));

    const [doctrine, recentIdeas, agents] = await Promise.all([
      base44.asServiceRole.entities.Doctrine.filter({ category: 'leadership' }, '-created_date', 20),
      base44.asServiceRole.entities.Idea.list('-created_date', 15),
      base44.asServiceRole.entities.AgentProfile.list('order', 50),
    ]);
    const visionStatement = doctrine.find((d) => /vision statement/i.test(d.topic || ''))?.insight || '';
    const active = agents.filter((a) => a.status !== 'paused' && a.status !== 'error').slice(0, 12);
    const roster = buildRoster(active.map((a) => ({
      name: a.name, role: a.role, mission: a.mission,
      personality: a.personality, intelligence_profile: a.intelligence_profile,
    })));

    const ideaSeed = (body.vision || visionStatement || GOAL).slice(0, 3000);
    const recentTitles = recentIdeas.map((i) => i.title).join(', ');

    const prompt = `You are the Xtreme Vision Council running the NIGHTLY PIPELINE PREP ritual.\n\nAgent dossiers:\n${roster}\n\nOWNER'S VISION / IDEAS:\n${ideaSeed}\n\nRECENT DISCOVERED OPPORTUNITIES:\n${recentTitles || 'none'}\n\nDeliberate as a council, then CHOOSE 10 distinct, fully-digital, AI-operable strategies that best fit the owner's vision. For EACH strategy produce a complete pipeline blueprint with realistic, evidence-grounded estimated results. Then run a SIMULATION: rank the 10 by (a) highest estimated monthly profit and (b) fastest time-to-first-revenue, and pick the single best balance of low cost / high return / fast return.\n\nReturn JSON: transcript (ordered debate, each {author, content, kind}), pipelines (array of exactly 10 objects: {title, one_liner, industry, problem, solution, launch_cost_usd, est_monthly_profit_usd, est_annual_revenue_usd, time_to_launch_days, probability_of_success, primary_risk, autonomous_loop, monetization (array of strings)}), simulation ({highest_return: {title, est_monthly_profit_usd}, fastest_return: {title, time_to_launch_days}, best_balance: title, reasoning}), resolution, foresight.`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          transcript: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, content: { type: 'string' }, kind: { type: 'string' } }, required: ['author', 'content'] } },
          pipelines: { type: 'array', items: { type: 'object', properties: {
            title: { type: 'string' }, one_liner: { type: 'string' }, industry: { type: 'string' },
            problem: { type: 'string' }, solution: { type: 'string' },
            launch_cost_usd: { type: 'number' }, est_monthly_profit_usd: { type: 'number' },
            est_annual_revenue_usd: { type: 'number' }, time_to_launch_days: { type: 'number' },
            probability_of_success: { type: 'number' }, primary_risk: { type: 'string' },
            autonomous_loop: { type: 'string' }, monetization: { type: 'array', items: { type: 'string' } },
          }, required: ['title'] } },
          simulation: { type: 'object', properties: {
            highest_return: { type: 'object', properties: { title: { type: 'string' }, est_monthly_profit_usd: { type: 'number' } } },
            fastest_return: { type: 'object', properties: { title: { type: 'string' }, time_to_launch_days: { type: 'number' } } },
            best_balance: { type: 'string' }, reasoning: { type: 'string' },
          } },
          resolution: { type: 'string' },
          foresight: { type: 'string' },
        },
        required: ['transcript', 'pipelines', 'resolution'],
      },
    });

    // Replace the previous night's batch.
    const old = await base44.asServiceRole.entities.Idea.filter({ discovered_by: 'nightly_prep' }, '-created_date', 200);
    if (old.length) await base44.asServiceRole.entities.Idea.deleteMany({ discovered_by: 'nightly_prep' });

    const pipes = (llm.pipelines || []).slice(0, 10);
    const created = pipes.length
      ? await base44.asServiceRole.entities.Idea.bulkCreate(pipes.map((p) => ({
          title: String(p.title || 'Untitled').slice(0, 200),
          one_liner: String(p.one_liner || '').slice(0, 300),
          industry: String(p.industry || '').slice(0, 100),
          problem: String(p.problem || '').slice(0, 1000),
          solution: String(p.solution || '').slice(0, 1000),
          launch_cost_usd: Number(p.launch_cost_usd) || 0,
          est_monthly_profit_usd: Number(p.est_monthly_profit_usd) || 0,
          est_annual_revenue_usd: Number(p.est_annual_revenue_usd) || 0,
          time_to_launch_days: Number(p.time_to_launch_days) || 0,
          probability_of_success: Number(p.probability_of_success) || 0,
          risks: [String(p.primary_risk || '').slice(0, 300)],
          automation_plan: String(p.autonomous_loop || '').slice(0, 1000),
          monetization: (p.monetization || []).map((m) => String(m).slice(0, 200)),
          stage: 'strategized',
          discovered_by: 'nightly_prep',
        })))
      : [];

    const sim = llm.simulation || {};
    const brief = `Morning Brief — ${created.length} pipelines ready. Highest return: ${sim.highest_return?.title || '—'} ($${Number(sim.highest_return?.est_monthly_profit_usd || 0).toLocaleString()}/mo). Fastest: ${sim.fastest_return?.title || '—'} (${sim.fastest_return?.time_to_launch_days || 0} days). Best balance: ${sim.best_balance || '—'}.`;

    await base44.asServiceRole.entities.Notification.create({
      kind: 'info', severity: 'info', read: false,
      title: 'Morning Brief — 10 Pipelines Ready',
      body: brief,
    });

    const accentFor = (name) => agents.find((a) => a.name === name)?.accent || '#3f3f46';
    const entries = [{ author: 'Nightly Prep', author_type: 'agent', content: `${brief}\n\n${String(llm.resolution || '').slice(0, 900)}`, kind: 'foresight', accent: '#111827' }];
    for (const t of (llm.transcript || [])) {
      entries.push({ author: t.author, author_type: 'agent', content: t.content, kind: t.kind || 'message', accent: accentFor(t.author) });
    }
    if (llm.foresight) entries.push({ author: 'Foresight', author_type: 'agent', content: String(llm.foresight).slice(0, 1000), kind: 'foresight', accent: '#1d4ed8' });
    if (entries.length) await base44.asServiceRole.entities.ChatMessage.bulkCreate(entries);

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Council', level: 'success', category: 'nightly_prep',
      message: brief,
      detail: String(llm.resolution || '').slice(0, 500),
      auto_action: 'nightly ritual', resolved: true,
    });

    return Response.json({
      count: created.length,
      simulation: sim,
      resolution: llm.resolution,
      foresight: llm.foresight,
      pipelines: created.map((c) => ({ id: c.id, title: c.title })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}