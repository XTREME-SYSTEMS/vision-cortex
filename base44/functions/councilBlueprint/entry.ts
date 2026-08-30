import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const str = (v, max) => String(v ?? '').slice(0, max);
const arr = (v, max, itemMax) => (Array.isArray(v) ? v.slice(0, max).map((s) => str(s, itemMax)) : []);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // allow admin or workflow (no user) invocation
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context — no user token */ }

    const body = await req.json().catch(() => ({}));
    const focus = str(body?.focus, 800) ||
      'a fully digital, AI-operated business that runs 24/7 with minimal startup capital (under $5,000), legal, and realistic — designed to generate enough autonomous revenue to free the operator from the rat race';

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Xtreme Vision Council designing a business blueprint for the operator.\n\nCONSTRAINTS:\n- Fully digital and operable 24/7 by AI / automation / agent swarms.\n- Legal and ethical. No theft, no fraud, no scams.\n- Minimal startup capital (under $5,000).\n- Realistic income potential — no fantasy numbers. Ground estimates in current market reality.\n- The operator's goal: escape the rat race and become financially free.\n\nDesign the SINGLE best opportunity that fits every constraint above. Be concrete and evidence-based — use current market conditions. Output a complete, investor-grade blueprint with a clear automation plan showing how AI operates it autonomously.`,
      model: 'gemini_3_1_pro',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          one_liner: { type: 'string' },
          industry: { type: 'string' },
          sub_industry: { type: 'string' },
          problem: { type: 'string' },
          solution: { type: 'string' },
          target_users: { type: 'string' },
          monetization: { type: 'array', items: { type: 'string' } },
          tech_stack: { type: 'array', items: { type: 'string' } },
          automation_plan: { type: 'string' },
          moat: { type: 'string' },
          hidden_opportunity: { type: 'string' },
          launch_cost_usd: { type: 'number' },
          est_monthly_profit_usd: { type: 'number' },
          time_to_launch_days: { type: 'number' },
          risks: { type: 'array', items: { type: 'string' } },
          investor_notes: { type: 'string' }
        },
        required: ['title', 'one_liner', 'problem', 'solution', 'monetization', 'automation_plan', 'launch_cost_usd']
      }
    });

    const idea = await base44.asServiceRole.entities.Idea.create({
      title: str(llm.title, 200),
      one_liner: str(llm.one_liner, 300),
      industry: str(llm.industry, 80),
      sub_industry: str(llm.sub_industry, 80),
      problem: str(llm.problem, 2000),
      solution: str(llm.solution, 2000),
      target_users: str(llm.target_users, 500),
      monetization: arr(llm.monetization, 8, 300),
      tech_stack: arr(llm.tech_stack, 10, 100),
      automation_plan: str(llm.automation_plan, 2000),
      moat: str(llm.moat, 1000),
      hidden_opportunity: str(llm.hidden_opportunity, 1000),
      launch_cost_usd: Number(llm.launch_cost_usd) || 0,
      est_monthly_profit_usd: Number(llm.est_monthly_profit_usd) || 0,
      time_to_launch_days: Number(llm.time_to_launch_days) || 0,
      risks: arr(llm.risks, 8, 300),
      investor_notes: str(llm.investor_notes, 2000),
      stage: 'strategized',
      discovered_by: 'Council Blueprint'
    });

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Council',
      level: 'success',
      category: 'blueprint',
      message: `Council designed digital business blueprint: ${idea.title}`,
      detail: str(llm.one_liner, 500),
      auto_action: 'blueprint generated',
      resolved: true
    });

    return Response.json({ idea });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}