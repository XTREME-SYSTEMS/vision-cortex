import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Skill taxonomy — maps agent roles/archetypes to benchmarked skill categories
const SKILL_CATEGORIES = {
  intelligence: { label: 'Intelligence', benchmark: 85 },
  strategy: { label: 'Strategy', benchmark: 80 },
  build: { label: 'Build & Deploy', benchmark: 75 },
  audit: { label: 'Audit & QA', benchmark: 90 },
  comms: { label: 'Communications', benchmark: 78 },
  money: { label: 'Monetization', benchmark: 70 },
  ops: { label: 'Self-Healing Ops', benchmark: 85 },
  coding: { label: 'Code Generation', benchmark: 65 },
  research: { label: 'Research & Scraping', benchmark: 82 },
  governance: { label: 'Governance', benchmark: 88 },
};

// Map agent role keywords to skill categories
function inferSkills(agent) {
  const text = ((agent.role || '') + ' ' + (agent.archetype || '') + ' ' + (agent.mission || '') + ' ' + (agent.capabilities || []).join(' ')).toLowerCase();
  const skills = [];
  if (text.match(/intel|research|scrap|discover|data acquis/)) skills.push('intelligence');
  if (text.match(/strateg|plan|reverse engineer/)) skills.push('strategy');
  if (text.match(/build|compile|forge|provision|deploy/)) skills.push('build');
  if (text.match(/audit|valid|quality|inquisitor|sentinel/)) skills.push('audit');
  if (text.match(/comm|outreach|diplomat|voice|call|sms|mms|email/)) skills.push('comms');
  if (text.match(/money|monetiz|merchant|capital|treasurer|revenue|broker|distributor/)) skills.push('money');
  if (text.match(/heal|self-heal|hardening|monitor|sentinel|keeper/)) skills.push('ops');
  if (text.match(/code|architect|engineer|function/)) skills.push('coding');
  if (text.match(/scrap|browse|fleet|cartographer|shadow/)) skills.push('research');
  if (text.match(/govern|ethic|philosopher|maxwell|chief|ceo|sage/)) skills.push('governance');
  if (skills.length === 0) skills.push('ops');
  return [...new Set(skills)];
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole.entities;

    // Load all agents
    const agents = await sr.AgentProfile.list('order', 100);

    // Load recent scores
    const scores = await sr.AgentScore.list('-test_date', 200).catch(() => []);

    // Load recent logs for activity counting
    const logs = await sr.AgentLog.list('-created_date', 500).catch(() => []);

    // Aggregate scores per agent
    const scoreMap = {};
    for (const s of scores) {
      if (!scoreMap[s.agent_name]) scoreMap[s.agent_name] = { total: 0, count: 0, tasks: 0, proactive: 0, recent: null };
      scoreMap[s.agent_name].total += (s.score || 0);
      scoreMap[s.agent_name].count += 1;
      scoreMap[s.agent_name].tasks += (s.tasks_completed || 0);
      scoreMap[s.agent_name].proactive += (s.proactive_actions || 0);
      if (!scoreMap[s.agent_name].recent || s.test_date > scoreMap[s.agent_name].recent) {
        scoreMap[s.agent_name].recent = s.test_date;
        scoreMap[s.agent_name].latest_score = s.score || 0;
        scoreMap[s.agent_name].success_rate = s.success_rate || 0;
      }
    }

    // Count logs per agent
    const logMap = {};
    for (const l of logs) {
      const name = l.agent_name;
      if (!logMap[name]) logMap[name] = { total: 0, success: 0, errors: 0, warnings: 0 };
      logMap[name].total++;
      if (l.level === 'success') logMap[name].success++;
      if (l.level === 'error') logMap[name].errors++;
      if (l.level === 'warn') logMap[name].warnings++;
    }

    // Build the matrix
    const matrix = agents.map((a) => {
      const skills = inferSkills(a);
      const sData = scoreMap[a.name] || {};
      const lData = logMap[a.name] || {};
      const avgScore = sData.count > 0 ? Math.round(sData.total / sData.count) : 0;
      const skillPerformance = {};
      for (const sk of skills) {
        const benchmark = SKILL_CATEGORIES[sk]?.benchmark || 75;
        const logBoost = Math.min(20, Math.round((lData.success || 0) / 5));
        const performance = Math.min(100, Math.round((avgScore * 0.5) + ((sData.success_rate || 0) * 0.3) + logBoost));
        const meetsBenchmark = performance >= benchmark;
        skillPerformance[sk] = {
          benchmark,
          performance,
          meets_benchmark: meetsBenchmark,
          gap: performance - benchmark,
          status: meetsBenchmark ? 'passing' : (performance >= benchmark - 10 ? 'borderline' : 'failing'),
        };
      }
      return {
        agent_id: a.id,
        name: a.name,
        codename: a.codename,
        role: a.role,
        archetype: a.archetype,
        status: a.status,
        health: a.health || 100,
        skills,
        skill_performance: skillPerformance,
        tasks_completed: a.tasks_completed || sData.tasks || 0,
        proactive_actions: sData.proactive || 0,
        avg_score: avgScore,
        latest_score: sData.latest_score || 0,
        success_rate: sData.success_rate || 0,
        log_activity: lData,
        inf_balance: a.inf_balance || 0,
        rank: a.rank || 0,
        avatar_url: a.avatar_url || null,
      };
    });

    // Summary stats
    const totalAgents = matrix.length;
    const activeAgents = matrix.filter((m) => m.status === 'active').length;
    const allSkillPerfs = matrix.flatMap((m) => Object.values(m.skill_performance).map((sp) => sp.performance));
    const avgPerformance = allSkillPerfs.length > 0 ? Math.round(allSkillPerfs.reduce((a, b) => a + b, 0) / allSkillPerfs.length) : 0;
    const passingSkills = allSkillPerfs.filter((p) => p >= 75).length;
    const totalSkillEvals = allSkillPerfs.length;

    // Benchmark summary per skill category
    const benchmarkSummary = {};
    for (const [key, cat] of Object.entries(SKILL_CATEGORIES)) {
      const perfs = matrix.filter((m) => m.skills.includes(key)).map((m) => m.skill_performance[key]?.performance || 0);
      benchmarkSummary[key] = {
        label: cat.label,
        benchmark: cat.benchmark,
        avg_performance: perfs.length > 0 ? Math.round(perfs.reduce((a, b) => a + b, 0) / perfs.length) : 0,
        agent_count: perfs.length,
      };
    }

    return Response.json({
      ok: true,
      matrix,
      skill_categories: SKILL_CATEGORIES,
      benchmark_summary: benchmarkSummary,
      summary: {
        total_agents: totalAgents,
        active_agents: activeAgents,
        total_skill_categories: Object.keys(SKILL_CATEGORIES).length,
        avg_performance: avgPerformance,
        passing_skills: passingSkills,
        total_skill_evals: totalSkillEvals,
        pass_rate: totalSkillEvals > 0 ? Math.round((passingSkills / totalSkillEvals) * 100) : 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Matrix failed' }, { status: 500 });
  }
}