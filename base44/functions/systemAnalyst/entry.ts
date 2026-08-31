import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// systemAnalyst — the System Analyst Agent. Scans the entire system (entities,
// functions, agents, workflows, gaps, simulations, life plans), identifies
// gaps and enhancement opportunities, runs each recommendation through web
// search for the absolute greatest technical enhancement protocols, and
// creates numbered SystemEnhancement records with: existing system, downfall,
// recommended enhancement, technical protocols, and surrounding enhancements.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    // Scan the system
    const [gaps, enhancements, agents, ideas, sims, plans, doctrines] = await Promise.all([
      base44.entities.Gap.list('-created_date', 50).catch(() => []),
      base44.entities.SystemEnhancement.list('-created_date', 50).catch(() => []),
      base44.entities.AgentProfile.list('order', 50).catch(() => []),
      base44.entities.Idea.list('-created_date', 20).catch(() => []),
      base44.entities.Simulation.list('-created_date', 10).catch(() => []),
      base44.entities.LifePlan.list('-created_date', 5).catch(() => []),
      base44.entities.Doctrine.list('-created_date', 20).catch(() => []),
    ]);

    const systemInventory = {
      gaps: gaps.map((g) => ({ title: g.title, status: g.status, severity: g.severity, category: g.category })),
      existing_enhancements: enhancements.map((e) => ({ number: e.number, title: e.title, status: e.status, category: e.category })),
      agents: agents.map((a) => ({ name: a.name, role: a.role, status: a.status, health: a.health, tasks: a.tasks_completed })),
      ideas: ideas.map((i) => ({ title: i.title, stage: i.stage, score: i.score, prob: i.probability_of_success })),
      simulations: sims.map((s) => ({ name: s.strategy_name, status: s.status, profit: s.metrics?.total_profit, roi: s.metrics?.roi_pct })),
      life_plans: plans.map((p) => ({ vision: (p.vision || '').slice(0, 120), status: p.status, calibration: p.calibration_score })),
      doctrines: doctrines.map((d) => ({ topic: d.topic, validated: d.validated, confidence: d.confidence })),
    };

    const prompt = `You are the System Analyst Agent for the Vision Cortex Destiny Engine. Your job is to scan the entire system, identify gaps and enhancement opportunities, and for each one, search the web for the absolute greatest technical enhancement protocols available.

For each gap you find, document:
1. The EXISTING SYSTEM — what exists now, how it currently works
2. The DOWNFALL — what is wrong, missing, or suboptimal about it
3. The RECOMMENDED ENHANCEMENT — the specific fix or upgrade
4. TECHNICAL PROTOCOLS — the best protocols, frameworks, and approaches found via web search
5. SURROUND ENHANCEMENTS — related supporting enhancements that compound the fix

SYSTEM INVENTORY:
${JSON.stringify(systemInventory, null, 2)}

Identify the top 5-8 most impactful system enhancements. For each, search the web for the best technical protocols. Be specific and actionable. Return a numbered list.`;

    const res = await core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          enhancements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                existing_system: { type: 'string', description: 'What exists now' },
                downfall: { type: 'string', description: 'What is wrong / missing' },
                recommended_enhancement: { type: 'string', description: 'The recommended fix' },
                technical_protocols: { type: 'array', items: { type: 'string' }, description: 'Best protocols from web search' },
                surround_enhancements: { type: 'array', items: { type: 'string' }, description: 'Related supporting enhancements' },
                web_search_sources: { type: 'array', items: { type: 'string' }, description: 'URLs found during web search' },
                category: { type: 'string', enum: ['feature', 'hardening', 'optimization', 'healing', 'doctrine', 'integration'] },
                priority: { type: 'number' },
              },
              required: ['title', 'existing_system', 'downfall', 'recommended_enhancement'],
            },
          },
        },
        required: ['enhancements'],
      },
    });

    // Get the next number
    const maxNumber = enhancements.reduce((max, e) => Math.max(max, e.number || 0), 0);

    const created = [];
    for (let i = 0; i < (res.enhancements || []).length; i++) {
      const e = res.enhancements[i];
      const record = await base44.entities.SystemEnhancement.create({
        number: maxNumber + i + 1,
        title: e.title,
        existing_system: e.existing_system,
        downfall: e.downfall,
        recommended_enhancement: e.recommended_enhancement,
        technical_protocols: e.technical_protocols || [],
        surround_enhancements: e.surround_enhancements || [],
        web_search_sources: e.web_search_sources || [],
        category: e.category || 'feature',
        priority: e.priority || 3,
        status: 'pending',
        approved: false,
        source: 'system_analyst',
        implementation_plan: e.recommended_enhancement,
      });
      created.push(record.id);
    }

    await base44.entities.AgentLog.create({
      agent_name: 'System Analyst',
      level: 'info',
      category: 'system_scan',
      message: `System scan complete — ${created.length} enhancements identified with web-searched protocols.`,
    });

    return Response.json({ created: created.length, enhancements: res.enhancements });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}