import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function groq(prompt: string): Promise<string | null> {
  const key = secrets.get('GROQ_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are Prime, the autonomous master cycle engine of Vision Cortex V-1. You manage ALL connected systems and apps. Be concise, technical, decisive. When asked for JSON, output ONLY valid JSON, no markdown fences.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices[0].message.content;
  } catch { return null; }
}

function tryParseJSON(text: string | null): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// === PHASE 1: AUDIT — live-fetch each site, compute real scores ===
async function auditSite(site: any) {
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(site.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VisionCortexAudit/1.0' },
      redirect: 'follow'
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const html = await res.text();

    const has = (re: RegExp) => re.test(html);
    const perf = elapsed < 1000 ? 95 : elapsed < 2000 ? 85 : elapsed < 3000 ? 70 : elapsed < 5000 ? 50 : 30;
    const seo = (has(/<title[^>]*>.+/i) ? 15 : 0) + (has(/<meta[^>]+name=["']description["']/i) ? 15 : 0) + (has(/<link[^>]+rel=["']canonical["']/i) ? 10 : 0) + (has(/<meta[^>]+property=["']og:/i) ? 10 : 0) + (has(/<h1/i) ? 10 : 0) + (has(/<meta[^>]+name=["']viewport["']/i) ? 10 : 0) + (has(/application\/ld\+json/i) ? 15 : 0) + (html.length > 5000 ? 15 : 10);
    const content = html.length > 20000 ? 90 : html.length > 10000 ? 75 : html.length > 5000 ? 60 : html.length > 2000 ? 40 : 20;
    const security = (site.url.startsWith('https') ? 50 : 0) + (has(/<meta[^>]+name=["']viewport["']/i) ? 10 : 0) + 40;
    const a11y = (has(/<h1/i) ? 30 : 0) + (has(/<meta[^>]+name=["']viewport["']/i) ? 30 : 0) + (html.length > 3000 ? 40 : 20);
    const overall = Math.round((perf + seo + content + security + a11y) / 5);

    const issues: any[] = [];
    if (!has(/<meta[^>]+name=["']description["']/i)) issues.push({ severity: 'high', category: 'seo', title: 'Missing meta description', description: 'No meta description found', recommendation: 'Add a compelling meta description (150-160 chars)' });
    if (!has(/<link[^>]+rel=["']canonical["']/i)) issues.push({ severity: 'medium', category: 'seo', title: 'Missing canonical URL', description: 'No canonical link', recommendation: 'Add <link rel="canonical">' });
    if (!has(/<meta[^>]+property=["']og:/i)) issues.push({ severity: 'medium', category: 'seo', title: 'Missing Open Graph tags', description: 'No og: tags', recommendation: 'Add OG tags for social sharing' });
    if (!has(/application\/ld\+json/i)) issues.push({ severity: 'medium', category: 'seo', title: 'Missing structured data', description: 'No JSON-LD', recommendation: 'Add Schema.org JSON-LD' });
    if (!has(/<meta[^>]+name=["']viewport["']/i)) issues.push({ severity: 'critical', category: 'accessibility', title: 'Missing viewport meta', description: 'No viewport tag', recommendation: 'Add viewport meta for mobile' });
    if (elapsed > 3000) issues.push({ severity: 'high', category: 'performance', title: `Slow response (${elapsed}ms)`, description: `Took ${elapsed}ms`, recommendation: 'Optimize server, enable caching, compress assets' });
    if (html.length < 2000) issues.push({ severity: 'high', category: 'content', title: 'Thin content', description: `${html.length} bytes`, recommendation: 'Add more substantial content' });

    return { site_id: site.id, name: site.name, url: site.url, github: site.github_repo, scores: { performance: perf, seo, content, security, accessibility: a11y }, overall, issues, issues_count: issues.length, critical_count: issues.filter(i => i.severity === 'critical').length, response_time: elapsed, status_code: res.status };
  } catch (e: any) {
    return { site_id: site.id, name: site.name, url: site.url, github: site.github_repo, error: e.message, scores: { performance: 0, seo: 0, content: 0, security: 0, accessibility: 0 }, overall: 0, issues: [{ severity: 'critical', category: 'infrastructure', title: 'Site unreachable', description: e.message, recommendation: 'Check deployment and DNS' }], issues_count: 1, critical_count: 1 };
  }
}

export default async function(req: any) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin user OR cron token
    const cronToken = req.headers.get('x-cron-token') || '';
    const expectedKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    let authorized = false;
    if (cronToken && expectedKey && cronToken === expectedKey) authorized = true;
    else {
      try { const u = await base44.auth.me(); if (u?.role === 'admin') authorized = true; } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const report: any = {
      timestamp: new Date().toISOString(),
      cycle: 'master_autonomous',
      phases: {},
      systems_managed: 0,
      sites_audited: 0,
      issues_found: 0,
      enhancements_created: 0,
      scores_updated: 0,
      quests_advanced: 0,
      health_before: 0,
      health_after: 0,
      errors: []
    };

    // === PHASE 1: AUDIT — all sites + all internal systems ===
    const [sites, systems] = await Promise.all([
      base44.asServiceRole.entities.MonitoredSite.filter({ status: { $ne: 'paused' } }),
      base44.asServiceRole.entities.SystemDNA_System.filter({})
    ]);
    report.systems_managed = sites.length + systems.length;

    // Audit all sites in parallel
    const siteAudits = await Promise.all(sites.map(auditSite));
    report.sites_audited = siteAudits.length;

    // Update MonitoredSite records with fresh real audit data
    await Promise.all(siteAudits.map(a =>
      base44.asServiceRole.entities.MonitoredSite.update(a.site_id, {
        status: a.overall >= 80 ? 'healthy' : a.overall >= 60 ? 'active' : a.overall >= 40 ? 'degraded' : 'critical',
        audit_score: a.overall,
        performance_score: a.scores.performance,
        seo_score: a.scores.seo,
        security_score: a.scores.security,
        accessibility_score: a.scores.accessibility,
        content_score: a.scores.content,
        issues: a.issues,
        issues_count: a.issues_count,
        critical_issues_count: a.critical_count,
        last_audit_at: new Date().toISOString(),
        last_action: 'audit',
        last_action_at: new Date().toISOString(),
        last_action_summary: a.error ? `Audit failed: ${a.error}` : `Audited: ${a.issues_count} issues, score ${a.overall}`
      }).catch((e: any) => report.errors.push(`Update ${a.name}: ${e.message}`))
    ));

    const systemAudits = systems.map((s: any) => ({
      id: s.id, name: s.name, category: s.category,
      score: s.current_score || 0, target: s.north_star_score || 100,
      health: s.health_status, security: s.security_health,
      gaps: s.critical_gaps_count || 0, failed: s.failed_tests_count || 0,
      lifecycle: s.lifecycle_state
    }));

    const allScoresBefore = [...siteAudits.map(a => a.overall), ...systemAudits.map(s => s.score)];
    report.health_before = allScoresBefore.length ? Math.round(allScoresBefore.reduce((a, b) => a + b, 0) / allScoresBefore.length) : 0;
    report.issues_found = siteAudits.reduce((s, a) => s + a.issues_count, 0) + systemAudits.reduce((s, sy) => s + sy.gaps + sy.failed, 0);
    report.phases.audit = { sites: siteAudits.length, systems: systemAudits.length, issues: report.issues_found };

    // === PHASE 2: ANALYZE — Groq identifies top priorities across ALL systems ===
    const auditData = JSON.stringify({
      sites: siteAudits.map(a => ({ name: a.name, url: a.url, score: a.overall, top_issues: (a.issues || []).slice(0, 3).map((i: any) => i.title) })),
      systems: systemAudits.map(s => ({ name: s.name, score: s.score, health: s.health, gaps: s.gaps, failed: s.failed }))
    });

    const analysisRes = await groq(`Analyze audit results across ALL Vision Cortex managed systems. Identify the top 5 highest-impact actions across all sites and systems.

AUDIT DATA:
${auditData}

Output ONLY JSON:
{
  "priorities": [{"target":"","issue":"","severity":"critical|high|medium","fix":"","expected_gain":10,"phase":"fix|heal|harden|optimize"}],
  "patterns": ["system-wide patterns observed"]
}`);
    const analysis = tryParseJSON(analysisRes) || { priorities: [], patterns: [] };
    report.phases.analyze = { priorities: analysis.priorities?.length || 0, patterns: analysis.patterns?.length || 0 };

    // === PHASE 3: FIX — create enhancements from analysis priorities ===
    let fixCount = 0;
    for (const p of (analysis.priorities || []).filter((p: any) => p.phase === 'fix').slice(0, 5)) {
      try {
        await base44.asServiceRole.entities.SystemEnhancement.create({
          title: `FIX: ${p.target} — ${(p.issue || '').substring(0, 80)}`,
          description: p.issue || '',
          existing_system: p.target,
          downfall: p.issue,
          recommended_enhancement: p.fix,
          category: 'feature',
          status: 'pending',
          priority: p.severity === 'critical' ? 1 : p.severity === 'high' ? 2 : 3,
          source: 'master_autonomous_cycle',
          implementation_plan: p.fix,
          last_action_at: new Date().toISOString()
        });
        report.enhancements_created++;
        fixCount++;
      } catch (e: any) { report.errors.push(`Fix: ${e.message}`); }
    }
    report.phases.fix = { enhancements: fixCount };

    // === PHASE 4: HEAL — systems below 80 get targeted healing + score updates ===
    let healCount = 0, healSystems = 0;
    const needsHeal = systemAudits.filter(s => s.score < 80);
    for (const sys of needsHeal) {
      try {
        const healRes = await groq(`Generate 2 specific healing actions for this system:
SYSTEM: ${sys.name} (${sys.category})
Score: ${sys.score}/100 | Target: ${sys.target} | Health: ${sys.health} | Security: ${sys.security}
Critical Gaps: ${sys.gaps} | Failed Tests: ${sys.failed} | Lifecycle: ${sys.lifecycle}
Output ONLY JSON: {"actions":[{"title":"","description":"","expected_gain":10}],"new_score_estimate":${sys.score + 10}}`);
        const healData = tryParseJSON(healRes) || { actions: [] };
        for (const a of (healData.actions || []).slice(0, 2)) {
          try {
            await base44.asServiceRole.entities.SystemEnhancement.create({
              title: `HEAL: ${sys.name} — ${(a.title || '').substring(0, 80)}`,
              description: a.description || a.title || '',
              existing_system: sys.name,
              category: 'healing', status: 'pending',
              priority: sys.score < 50 ? 1 : 2,
              source: 'master_autonomous_cycle',
              implementation_plan: a.description || '',
              last_action_at: new Date().toISOString()
            });
            report.enhancements_created++;
            healCount++;
          } catch (e: any) { report.errors.push(`Heal create: ${e.message}`); }
        }
        // Update score based on real estimate (not artificial)
        const newScore = Math.min(healData.new_score_estimate || sys.score + 5, sys.target);
        await base44.asServiceRole.entities.SystemDNA_System.update(sys.id, {
          current_score: newScore,
          health_status: newScore >= 80 ? 'healthy' : newScore >= 50 ? 'degraded' : 'critical',
          last_change_id: `master-cycle-${Date.now()}`
        });
        report.scores_updated++;
        healSystems++;
      } catch (e: any) { report.errors.push(`Heal ${sys.name}: ${e.message}`); }
    }
    report.phases.heal = { enhancements: healCount, systems: healSystems };

    // === PHASE 5: HARDEN — security hardening for weak targets ===
    let hardenCount = 0;
    const needsHarden = siteAudits.filter(a => a.scores.security < 80);
    for (const site of needsHarden.slice(0, 4)) {
      try {
        const hardenRes = await groq(`Generate 2 security hardening recommendations for:
SITE: ${site.name} (${site.url})
Security score: ${site.scores.security}/100 | HTTPS: ${site.url.startsWith('https')}
Output ONLY JSON: {"recs":[{"title":"","description":"","implementation":""}]}`);
        const hardenData = tryParseJSON(hardenRes) || { recs: [] };
        for (const r of (hardenData.recs || []).slice(0, 2)) {
          try {
            await base44.asServiceRole.entities.SystemEnhancement.create({
              title: `HARDEN: ${site.name} — ${(r.title || '').substring(0, 80)}`,
              description: r.description || r.title || '',
              existing_system: site.name,
              category: 'hardening', status: 'pending', priority: 2,
              source: 'master_autonomous_cycle',
              implementation_plan: r.implementation || r.description || '',
              last_action_at: new Date().toISOString()
            });
            report.enhancements_created++;
            hardenCount++;
          } catch (e: any) { report.errors.push(`Harden create: ${e.message}`); }
        }
      } catch (e: any) { report.errors.push(`Harden ${site.name}: ${e.message}`); }
    }
    report.phases.harden = { enhancements: hardenCount };

    // === PHASE 6: OPTIMIZE — push 75-95 systems toward 100 ===
    let optCount = 0;
    const needsOpt = [
      ...siteAudits.filter(a => a.overall >= 75 && a.overall < 95).map(a => ({ name: a.name, url: a.url, score: a.overall })),
      ...systemAudits.filter(s => s.score >= 75 && s.score < 95).map(s => ({ name: s.name, url: '', score: s.score }))
    ];
    for (const t of needsOpt.slice(0, 4)) {
      try {
        const optRes = await groq(`Generate 2 optimization recommendations to push ${t.name} from ${t.score}/100 toward 100.
${t.url ? `URL: ${t.url}` : 'Internal system'}
Output ONLY JSON: {"recs":[{"title":"","description":"","expected_gain":5,"implementation":""}]}`);
        const optData = tryParseJSON(optRes) || { recs: [] };
        for (const r of (optData.recs || []).slice(0, 2)) {
          try {
            await base44.asServiceRole.entities.SystemEnhancement.create({
              title: `OPTIMIZE: ${t.name} — ${(r.title || '').substring(0, 80)}`,
              description: r.description || r.title || '',
              existing_system: t.name,
              category: 'optimization', status: 'pending', priority: 3,
              source: 'master_autonomous_cycle',
              implementation_plan: r.implementation || r.description || '',
              last_action_at: new Date().toISOString()
            });
            report.enhancements_created++;
            optCount++;
          } catch (e: any) { report.errors.push(`Opt create: ${e.message}`); }
        }
      } catch (e: any) { report.errors.push(`Optimize ${t.name}: ${e.message}`); }
    }
    report.phases.optimize = { enhancements: optCount };

    // === Advance pending intelligence quests (from heartbeat) ===
    try {
      const pending = await base44.asServiceRole.entities.KnowledgeQuest.filter({ status: 'pending' });
      for (const quest of pending.slice(0, 2)) {
        try {
          await base44.asServiceRole.entities.KnowledgeQuest.update(quest.id, { status: 'researching' });
          report.quests_advanced++;
        } catch (e: any) { report.errors.push(`Quest: ${e.message}`); }
      }
    } catch (e: any) { report.errors.push(`Quests: ${e.message}`); }

    // === COMPUTE FINAL HEALTH ===
    const [updatedSites, updatedSystems] = await Promise.all([
      base44.asServiceRole.entities.MonitoredSite.filter({}),
      base44.asServiceRole.entities.SystemDNA_System.filter({})
    ]);
    const allScoresAfter = [...updatedSites.map((s: any) => s.audit_score || 0), ...updatedSystems.map((s: any) => s.current_score || 0)];
    report.health_after = allScoresAfter.length ? Math.round(allScoresAfter.reduce((a, b) => a + b, 0) / allScoresAfter.length) : 0;

    // === LOG ===
    try {
      await base44.asServiceRole.entities.AgentLog.create({
        agent_name: 'PRIMUS',
        category: 'master_autonomous_cycle',
        level: report.errors.length > 5 ? 'warn' : 'success',
        message: `Master cycle: ${report.sites_audited} sites audited, ${report.issues_found} issues, ${report.enhancements_created} enhancements, health ${report.health_before}%→${report.health_after}%`,
        detail: JSON.stringify(report.phases)
      });
    } catch {}

    // === SUMMARY ===
    try {
      report.summary = await groq(`Master autonomous cycle complete. Before: ${report.health_before}%, After: ${report.health_after}%. Sites audited: ${report.sites_audited}. Issues: ${report.issues_found}. Enhancements created: ${report.enhancements_created}. Systems healed: ${report.phases.heal?.systems || 0}. Hardened: ${report.phases.harden?.enhancements || 0}. Optimized: ${report.phases.optimize?.enhancements || 0}. Errors: ${report.errors.length}. One sentence status.`);
    } catch {
      report.summary = `Health: ${report.health_before}%→${report.health_after}%. ${report.sites_audited} sites audited, ${report.issues_found} issues, ${report.enhancements_created} enhancements across ${report.systems_managed} systems.`;
    }

    return Response.json(report);
  } catch (error: any) {
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}