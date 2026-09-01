import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// monthlyAwardCeremony — generates awards + digital letters of achievement
// for all agents based on monthly performance. Can be triggered manually
// or scheduled at end of month.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Load all agent scores for this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const allScores = await sr.AgentScore.list('-test_date', 500);
    const monthScores = allScores.filter((s) => s.test_date >= monthStart);

    // Aggregate by agent
    const agentStats = {};
    for (const score of monthScores) {
      if (!agentStats[score.agent_name]) {
        agentStats[score.agent_name] = { total: 0, count: 0, proactive: 0, tasks: 0, successRate: 0 };
      }
      agentStats[score.agent_name].total += score.score;
      agentStats[score.agent_name].count++;
      agentStats[score.agent_name].proactive += score.proactive_actions || 0;
      agentStats[score.agent_name].tasks += score.tasks_completed || 0;
      agentStats[score.agent_name].successRate += score.success_rate || 0;
    }

    const rankings = Object.entries(agentStats).map(([name, stats]) => ({
      agent_name: name,
      avg_score: Math.round(stats.total / stats.count),
      proactive_actions: stats.proactive,
      tasks_completed: stats.tasks,
      avg_success_rate: Math.round(stats.successRate / stats.count),
    })).sort((a, b) => b.avg_score - a.avg_score);

    const core = base44.asServiceRole.integrations.Core;
    const awards = [];

    // Most Active
    const mostActive = [...rankings].sort((a, b) => b.tasks_completed - a.tasks_completed)[0];
    if (mostActive) {
      awards.push({
        agent_name: mostActive.agent_name,
        award_type: 'most_active',
        title: 'Most Active Agent',
        reason: `${mostActive.tasks_completed} tasks completed this month`,
        evidence: `Avg score ${mostActive.avg_score}/100, ${mostActive.proactive_actions} proactive actions`,
        bonus_points: 100,
        ceremony_month: month,
        awarded_at: now.toISOString(),
      });
    }

    // Proactive Excellence
    const mostProactive = [...rankings].sort((a, b) => b.proactive_actions - a.proactive_actions)[0];
    if (mostProactive && mostProactive.proactive_actions > 0) {
      awards.push({
        agent_name: mostProactive.agent_name,
        award_type: 'proactive',
        title: 'Proactive Excellence Award',
        reason: `${mostProactive.proactive_actions} proactive actions — went beyond what was asked`,
        evidence: `Avg score ${mostProactive.avg_score}/100`,
        bonus_points: 100,
        ceremony_month: month,
        awarded_at: now.toISOString(),
      });
    }

    // Top 3 Performers
    const top3 = rankings.slice(0, 3);
    for (let i = 0; i < top3.length; i++) {
      const agent = top3[i];
      const medal = ['Gold', 'Silver', 'Bronze'][i];
      awards.push({
        agent_name: agent.agent_name,
        award_type: 'weekly_top3',
        title: `${medal} Performer — ${month}`,
        reason: `Ranked #${i + 1} with avg score ${agent.avg_score}/100`,
        evidence: `${agent.tasks_completed} tasks, ${agent.proactive_actions} proactive, ${agent.avg_success_rate}% success`,
        bonus_points: [50, 30, 20][i],
        ceremony_month: month,
        awarded_at: now.toISOString(),
      });
    }

    // Generate digital letters
    for (const award of awards) {
      const letter = await core.InvokeLLM({
        prompt: `Generate a formal Letter of Achievement for an AI agent.

AGENT: ${award.agent_name}
AWARD: ${award.title}
REASON: ${award.reason}
EVIDENCE: ${award.evidence}
MONTH: ${month}

Write a formal, dignified letter of achievement. Include:
- A formal opening addressing the agent by name
- The specific achievement and why it matters
- Recognition of their excellence and contribution
- A formal closing

Format as plain text, suitable for display on a certificate.`,
      });
      award.letter_content = letter;
    }

    // Create all awards
    for (const award of awards) {
      await sr.AgentAward.create(award);
    }

    // Log
    await sr.AgentLog.create({
      agent_name: 'system_dna_auditor',
      level: 'success',
      message: `Monthly award ceremony complete for ${month}. ${awards.length} awards given.`,
      auto_action: 'monthly_ceremony',
    });

    return Response.json({ month, awards_given: awards.length, awards, rankings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}