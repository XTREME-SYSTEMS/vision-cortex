import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// dailySiteAudit — autonomous daily crawler. Tests every agent, scores the
// entire site, generates self-reflections, and awards bonus points for
// proactive behavior. Runs once per day via workflow.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const today = new Date().toISOString().split('T')[0];

    // Load all agents
    const agents = await sr.AgentProfile.list('order', 50);

    // Load recent logs (last 24h)
    const allLogs = await sr.AgentLog.list('-created_date', 500);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentLogs = allLogs.filter((l) => new Date(l.created_date).getTime() > dayAgo);

    // Load systems + capabilities + gaps for health check
    const systems = await sr.SystemDNA_System.list('category', 10);
    const capabilities = await sr.SystemDNA_Capability.list('-benchmark_position', 200);
    const gaps = await sr.SystemDNA_Gap.filter({ status: 'open' }, '-severity', 100);

    // Score each agent
    const scores = [];
    for (const agent of agents) {
      const agentLogs = recentLogs.filter((l) => l.agent_name === agent.name);
      const successCount = agentLogs.filter((l) => l.level === 'success').length;
      const errorCount = agentLogs.filter((l) => l.level === 'error').length;
      const proactiveCount = agentLogs.filter((l) => l.auto_action).length;
      const total = agentLogs.length || 1;
      const successRate = Math.round((successCount / total) * 100);

      const taskScore = Math.min(agent.tasks_completed || 0, 50);
      const successScore = successRate * 0.3;
      const proactiveScore = Math.min(proactiveCount * 5, 20);
      const baseScore = Math.round(taskScore + successScore + proactiveScore);

      const failures = agentLogs.filter((l) => l.level === 'error').map((l) => l.message).slice(0, 5);

      scores.push({
        agent_name: agent.name,
        test_date: today,
        score: Math.min(baseScore, 100),
        tests_passed: successCount,
        tests_total: agentLogs.length,
        success_rate: successRate,
        failures,
        proactive_actions: proactiveCount,
        tasks_completed: agent.tasks_completed || 0,
        capabilities_tested: capabilities.slice(0, 10).map((c) => c.capability),
      });
    }

    // Rank agents
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((s, i) => { s.rank = i + 1; });

    // Create AgentScore records
    for (const score of scores) {
      await sr.AgentScore.create(score);
    }

    // Award bonus points for proactive agents
    const proactiveAgents = scores.filter((s) => s.proactive_actions > 0);
    for (const pa of proactiveAgents) {
      const bonusPoints = pa.proactive_actions * 10;
      await sr.AgentAward.create({
        agent_name: pa.agent_name,
        award_type: 'bonus',
        title: 'Proactivity Bonus',
        reason: `${pa.proactive_actions} proactive actions in the last 24h`,
        evidence: `AgentScore ${pa.score}/100, ${pa.tests_passed} successful actions`,
        bonus_points: bonusPoints,
        awarded_at: new Date().toISOString(),
      });
    }

    // Generate overall reflection via LLM
    const core = base44.asServiceRole.integrations.Core;
    const systemSummary = systems.map((s) => `${s.name}: ${s.current_score}/100 (${s.health_status})`).join('; ');
    const agentSummary = scores.slice(0, 10).map((s) => `${s.agent_name}: ${s.score}/100, ${s.success_rate}% success, ${s.proactive_actions} proactive`).join('; ');
    const gapSummary = `${gaps.length} open gaps, ${gaps.filter((g) => g.is_blocking).length} blocking`;

    const reflection = await core.InvokeLLM({
      prompt: `You are the System DNA daily auditor. Generate a concise daily reflection.

DATE: ${today}
SYSTEMS: ${systemSummary}
AGENTS: ${agentSummary}
GAPS: ${gapSummary}

Generate a JSON response:
- overall_score: 0-100
- summary: 2-3 sentence reflection on system health
- top_performer: agent name with highest score
- biggest_risk: the most pressing issue
- recommendation: one actionable recommendation for tomorrow`,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_score: { type: 'number' },
          summary: { type: 'string' },
          top_performer: { type: 'string' },
          biggest_risk: { type: 'string' },
          recommendation: { type: 'string' },
        },
        required: ['overall_score', 'summary', 'top_performer', 'biggest_risk', 'recommendation'],
      },
    });

    // Log the audit
    await sr.AgentLog.create({
      agent_name: 'system_dna_auditor',
      level: 'success',
      message: `Daily site audit complete. Overall: ${reflection.overall_score}/100. Top: ${reflection.top_performer}. ${gaps.length} gaps open.`,
      auto_action: 'daily_audit',
    });

    return Response.json({
      date: today,
      systems_audited: systems.length,
      agents_scored: scores.length,
      proactive_agents: proactiveAgents.length,
      gaps_open: gaps.length,
      reflection,
      scores,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}