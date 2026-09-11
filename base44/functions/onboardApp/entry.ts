import { createClientFromRequest, secrets } from '../../runtime/index';

const GROQ_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GROQ_MODEL = 'google/gemini-3-flash';

async function groqChat(prompt: string, system = 'You are Prime, the autonomous chief strategist of Vision Cortex. Be decisive and specific.') {
  const key = secrets.get('AI_GATEWAY_API_KEY');
  if (!key) throw new Error('AI_GATEWAY_API_KEY not set');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.4, max_tokens: 4000 })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const d = await res.json();
  return d.choices[0].message.content;
}

// Onboard a new app into Vision Cortex management.
// Pipeline: register → audit (live fetch) → score → plan (Groq) → enhancement tickets → simulations
export default async function(req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const u = await base44.auth.me();
    if (!u || u.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 401 });

    const { name, url, github_repo } = await req.json();
    if (!name || !url) return Response.json({ error: 'name and url required' }, { status: 400 });

    // === 1. REGISTER — create MonitoredSite if not exists ===
    const existing = await base44.asServiceRole.entities.MonitoredSite.filter({ url });
    let site: any;
    if (existing.length > 0) {
      site = existing[0];
    } else {
      site = await base44.asServiceRole.entities.MonitoredSite.create({
        name, url, github_repo: github_repo || '', status: 'active', audit_score: 0
      });
    }

    // === 2. AUDIT — live fetch and extract signals ===
    const audit: any = { score: 0, issues: [], title: '', description: '', response_time: 0, tech_signals: [] };
    try {
      const start = Date.now();
      const r = await fetch(url, { headers: { 'User-Agent': 'VisionCortex-Auditor/1.0' }, redirect: 'follow' });
      audit.response_time = Date.now() - start;
      if (r.ok) {
        const html = await r.text();
        audit.title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
        audit.description = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || '';
        let score = 50;
        if (audit.title) score += 10;
        if (audit.description) score += 10;
        if (audit.description.length >= 50 && audit.description.length <= 160) score += 10;
        if (html.includes('<h1')) score += 10;
        if (html.includes('og:image')) score += 5;
        if (html.includes('viewport')) score += 5;
        if (audit.response_time < 2000) score += 10;
        audit.score = Math.min(100, score);
        if (html.includes('next.js') || html.includes('__next')) audit.tech_signals.push('Next.js');
        if (html.includes('react')) audit.tech_signals.push('React');
        if (!audit.title) audit.issues.push({ severity: 'high', category: 'seo', title: 'Missing title tag', description: 'No <title> found', recommendation: 'Add a descriptive title tag' });
        if (!audit.description) audit.issues.push({ severity: 'high', category: 'seo', title: 'Missing meta description', description: 'No meta description found', recommendation: 'Add a 50-160 char description' });
        if (audit.response_time > 3000) audit.issues.push({ severity: 'medium', category: 'performance', title: 'Slow response time', description: `${audit.response_time}ms`, recommendation: 'Optimize server response' });
        if (!html.includes('viewport')) audit.issues.push({ severity: 'medium', category: 'accessibility', title: 'Missing viewport meta', recommendation: 'Add viewport for mobile' });
      } else {
        audit.issues.push({ severity: 'critical', category: 'infrastructure', title: `Site returned HTTP ${r.status}`, description: '', recommendation: 'Check deployment' });
      }
    } catch (e: any) {
      audit.issues.push({ severity: 'critical', category: 'infrastructure', title: 'Site unreachable', description: e.message, recommendation: 'Verify URL and deployment' });
    }

    await base44.asServiceRole.entities.MonitoredSite.update(site.id, {
      audit_score: audit.score,
      issues: audit.issues,
      issues_count: audit.issues.length,
      critical_issues_count: audit.issues.filter((i: any) => i.severity === 'critical').length,
      last_audit_at: new Date().toISOString(),
      last_action: 'audit',
      last_action_at: new Date().toISOString(),
      last_action_summary: `Onboard audit: ${audit.score}/100, ${audit.issues.length} issues`,
      status: audit.score >= 80 ? 'healthy' : audit.score >= 50 ? 'degraded' : 'critical'
    });

    // === 3. PLAN — generate full management plan via Groq ===
    const planPrompt = `You are the chief strategist for Vision Cortex, managing a portfolio of web apps. A new app has been onboarded for full management.

APP: ${name}
URL: ${url}
GitHub: ${github_repo || 'N/A'}
AUDIT SCORE: ${audit.score}/100
TITLE: "${audit.title}"
DESCRIPTION: "${audit.description}"
RESPONSE TIME: ${audit.response_time}ms
TECH SIGNALS: ${audit.tech_signals.join(', ') || 'unknown'}
ISSUES: ${JSON.stringify(audit.issues)}

Generate a comprehensive management plan as JSON:
{
  "executive_summary": "2-3 sentence overview of this app and its current state",
  "integration_strategy": "How this app integrates into the Vision Cortex ecosystem and bi-directional sync",
  "growth_strategy": "SEO + marketing + user acquisition roadmap",
  "technical_strategy": "Technical improvements and architecture recommendations",
  "monetization_strategy": "Revenue opportunities and pricing",
  "sync_protocol": "How bi-directional sync with Vision Cortex should work",
  "simulation_scenarios": ["3 key scenarios to simulate for risk assessment"],
  "enhancements": [{"title": "...", "category": "feature|hardening|optimization|healing|integration", "priority": 1, "description": "specific action"}],
  "plan_30_days": {"week_1": "...", "week_2": "...", "week_3": "...", "week_4": "..."},
  "success_metrics": ["KPI1", "KPI2", "KPI3"]
}
Return ONLY valid JSON, no markdown.`;

    let plan: any;
    try {
      const planResponse = await groqChat(planPrompt);
      plan = JSON.parse(planResponse.replace(/```json|```/g, '').trim());
    } catch (e: any) {
      plan = { executive_summary: `${name} onboarded at ${audit.score}/100. Plan generation pending: ${e.message}`, enhancements: [] };
    }

    // === 4. CREATE ENHANCEMENT TICKETS ===
    let enhancementsCreated = 0;
    for (const enh of (plan.enhancements || []).slice(0, 10)) {
      try {
        await base44.asServiceRole.entities.SystemEnhancement.create({
          title: `${name}: ${enh.title}`,
          description: enh.description || '',
          category: enh.category || 'feature',
          status: 'pending',
          priority: enh.priority || 3,
          source: 'onboard_app',
          existing_system: name,
          implementation_plan: JSON.stringify(enh)
        });
        enhancementsCreated++;
      } catch {}
    }
    for (const issue of audit.issues) {
      try {
        await base44.asServiceRole.entities.SystemEnhancement.create({
          title: `${name}: Fix ${issue.title}`,
          description: issue.description || '',
          category: issue.category === 'performance' ? 'optimization' : issue.category === 'seo' ? 'feature' : 'healing',
          status: 'pending',
          priority: issue.severity === 'critical' ? 1 : issue.severity === 'high' ? 2 : 3,
          source: 'onboard_audit',
          existing_system: name
        });
        enhancementsCreated++;
      } catch {}
    }

    // === 5. QUEUE SIMULATIONS ===
    let simulationsCreated = 0;
    for (const scenario of (plan.simulation_scenarios || []).slice(0, 3)) {
      try {
        await base44.asServiceRole.entities.Simulation.create({
          topic: `${name}: ${scenario}`,
          status: 'pending',
          autonomous: true
        });
        simulationsCreated++;
      } catch {}
    }

    // === 6. CREATE PERFECTION REPORT ===
    try {
      await base44.asServiceRole.entities.SystemPerfectionReport.create({
        site_id: site.id,
        site_url: url,
        site_name: name,
        system_type: 'web_application',
        system_description: audit.description || audit.title || name,
        tech_stack: audit.tech_signals,
        scores: { performance: audit.response_time < 2000 ? 90 : 50, seo: audit.score, security: 50, accessibility: 50, content: audit.title ? 70 : 30 },
        overall_score: audit.score,
        overall_summary: plan.executive_summary || `Onboard audit for ${name}. Score: ${audit.score}/100.`,
        launch_readiness_verdict: audit.score >= 80 ? 'launch_ready' : audit.score >= 60 ? 'near_ready' : 'not_ready',
        autonomous: true
      });
    } catch {}

    return Response.json({
      status: 'ok',
      site_id: site.id,
      site_name: name,
      audit_score: audit.score,
      issues_found: audit.issues.length,
      enhancements_created: enhancementsCreated,
      simulations_created: simulationsCreated,
      plan,
      message: `${name} onboarded → audited (${audit.score}/100) → planned → ${enhancementsCreated} tickets → ${simulationsCreated} simulations queued`
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}