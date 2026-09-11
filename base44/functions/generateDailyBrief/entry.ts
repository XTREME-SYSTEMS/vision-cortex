import { createClientFromRequest, secrets } from '../../runtime/index';

const GROQ_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GROQ_MODEL = 'google/gemini-3-flash';

async function groq(prompt: string, system = 'You are Prime, the autonomous orchestrator of Vision Cortex. Generate concise, actionable briefs. Return ONLY valid JSON.') {
  const key = secrets.get('AI_GATEWAY_API_KEY');
  if (!key) return null;
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.4, max_tokens: 4000 })
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d.choices[0].message.content;
}

export default async function(req: any) {
  const base44 = createClientFromRequest(req);
  try {
    const u = await base44.auth.me();
    if (!u || u.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 401 });
  } catch {}

  const [logs, enhancements, sites, systems, quests] = await Promise.all([
    base44.asServiceRole.entities.AgentLog.list('-created_date', 30),
    base44.asServiceRole.entities.SystemEnhancement.filter({ status: { $in: ['pending', 'in_progress'] } }, '-created_date', 30),
    base44.asServiceRole.entities.MonitoredSite.list('-updated_date', 20),
    base44.asServiceRole.entities.SystemDNA_System.list('-updated_date', 20),
    base44.asServiceRole.entities.KnowledgeQuest.filter({ status: { $in: ['pending', 'researching'] } }, '-created_date', 10)
  ]);

  const allScores = [...sites.map((s: any) => s.audit_score || 0), ...systems.map((s: any) => s.current_score || 0)];
  const overallHealth = allScores.length ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) : 0;

  const activity = {
    overall_health: overallHealth,
    sites_count: sites.length,
    systems_count: systems.length,
    pending_enhancements: enhancements.length,
    pending_quests: quests.length,
    recent_logs: logs.slice(0, 15).map((l: any) => ({ agent: l.agent_name, level: l.level, message: l.message, time: l.created_date })),
    enhancement_titles: enhancements.slice(0, 15).map((e: any) => ({ title: e.title, category: e.category, priority: e.priority })),
    sites: sites.map((s: any) => ({ name: s.name, url: s.url, score: s.audit_score, status: s.status, issues: s.issues_count, critical: s.critical_issues_count })),
    systems: systems.map((s: any) => ({ name: s.name, score: s.current_score, health: s.health_status, target: s.north_star_score, gaps: s.critical_gaps_count }))
  };

  const briefPrompt = `You are Prime, the autonomous orchestrator of Vision Cortex. Generate a daily brief for the owner. Be specific, actionable, and 10 steps ahead.

CURRENT SYSTEM STATE:
${JSON.stringify(activity, null, 2)}

Generate a comprehensive daily brief as JSON:
{
  "what_happened": "Summary of what Vision Cortex did recently (2-3 sentences, be specific with numbers)",
  "key_wins": ["2-3 notable achievements or progress made"],
  "critical_issues": ["2-3 issues needing owner attention"],
  "recommendations": ["4-5 specific recommendations for today, ranked by impact"],
  "today_plan": ["4-5 specific actions Vision Cortex will execute today"],
  "week_plan": ["4-5 strategic goals for this week"],
  "agent_assignments": [{"agent": "agent name", "task": "specific task"}],
  "revenue_opportunities": ["2-3 money-making opportunities identified from the data"],
  "system_health_summary": "1 sentence on overall system health and trajectory",
  "next_autonomous_actions": "What Vision Cortex will do next without owner input"
}
Return ONLY valid JSON, no markdown.`;

  let brief: any;
  try {
    const resp = await groq(briefPrompt);
    brief = JSON.parse(resp?.replace(/```json|```/g, '').trim() || '{}');
  } catch (e: any) {
    brief = {
      what_happened: `Vision Cortex is managing ${activity.sites_count} apps and ${activity.systems_count} internal systems. Overall health: ${overallHealth}%. ${activity.pending_enhancements} enhancements queued.`,
      key_wins: [], critical_issues: [], recommendations: [], today_plan: [], week_plan: [],
      agent_assignments: [], revenue_opportunities: [], system_health_summary: `Overall health at ${overallHealth}%.`,
      next_autonomous_actions: 'Continue autonomous healing and enhancement cycles.'
    };
  }

  return Response.json({ brief, activity, generated_at: new Date().toISOString() });
}