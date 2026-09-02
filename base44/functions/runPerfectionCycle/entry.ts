import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// runPerfectionCycle — runs the full audit → fix → heal → optimize → enhance
// sequence on a single monitored site (or all sites when site_id='all').
// Each step calls the same live web-context LLM pipeline as auditExternalSite,
// persists findings, and logs a SiteAuditLog entry.
//
// Invoke: base44.functions.invoke('runPerfectionCycle', { site_id, modes? })
// Returns: { ok, cycles: [{ site_id, url, steps: [{ mode, score, summary }] }] }

const MODE_ORDER = ['audit', 'fix', 'heal', 'optimize', 'enhance'];

const MODE_PROMPTS = {
  audit: `You are a senior site reliability engineer and web auditor. Perform a comprehensive audit of the website at {URL}.
If a GitHub repo is provided ({REPO}), also consider its codebase structure.
Analyze these 5 dimensions and score each 0-100:
1. Performance — load speed, Core Web Vitals, asset optimization, caching
2. SEO — meta tags, structured data, sitemap, robots, programmatic SEO/AEO readiness
3. Security — HTTPS, headers (CSP, HSTS, X-Frame-Options), exposed secrets, deps
4. Accessibility — WCAG 2.1 AA, semantic HTML, alt text, contrast, keyboard nav
5. Content — quality, uniqueness, relevance, conversion clarity, CTA strength
Return JSON: scores {performance,seo,security,accessibility,content}, overall_score 0-100, issues [{severity,category,title,description,recommendation}], summary.`,

  fix: `You are a senior engineer fixing critical issues on {URL} (repo: {REPO}).
Identify the TOP critical and high-severity issues needing immediate fixing. For each, provide a specific, actionable code-level fix.
Return JSON: issues [{severity,category,title,description,recommendation}], code_fixes [{file,issue,fix}], summary.`,

  heal: `You are a site healing specialist. Perform a full healing analysis of {URL} (repo: {REPO}).
Identify systemic problems — broken flows, data integrity, error states, missing error handling, dead links, inconsistent state — and prescribe a comprehensive healing plan.
Return JSON: issues [{severity,category,title,description,recommendation}], code_fixes [{file,issue,fix}], summary.`,

  optimize: `You are a performance and SEO optimization expert. Analyze {URL} (repo: {REPO}) for optimization opportunities.
Focus on: speed, Core Web Vitals, bundle size, image optimization, lazy loading, caching, meta/structured data, programmatic SEO/AEO.
Return JSON: issues [{severity,category,title,description,recommendation}], code_fixes [{file,issue,fix}], summary.`,

  enhance: `You are a product enhancement strategist. Analyze {URL} (repo: {REPO}) and recommend feature and content enhancements that increase market value, engagement, and competitive edge.
Return JSON: issues [{severity,category,title,description,recommendation}], recommendations [string], summary.`,
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'object', properties: { performance: { type: 'number' }, seo: { type: 'number' }, security: { type: 'number' }, accessibility: { type: 'number' }, content: { type: 'number' } } },
    overall_score: { type: 'number' },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, category: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, recommendation: { type: 'string' } } } },
    recommendations: { type: 'array', items: { type: 'string' } },
    code_fixes: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } } } },
    summary: { type: 'string' },
  },
  required: ['issues', 'summary'],
};

async function runStep(base44, site, mode) {
  const sr = base44.asServiceRole.entities;
  const prompt = MODE_PROMPTS[mode]
    .replace('{URL}', site.url)
    .replace('{REPO}', site.github_repo || 'N/A');

  const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: RESPONSE_SCHEMA,
  });

  const issues = llm.issues || [];
  const scores = llm.scores || {};
  const overall = llm.overall_score || 0;
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;

  const updateData = {
    last_action: mode,
    last_action_at: new Date().toISOString(),
    last_action_summary: llm.summary || '',
    issues,
    issues_count: issues.length,
    critical_issues_count: criticalCount,
  };

  if (mode === 'audit') {
    updateData.performance_score = scores.performance || 0;
    updateData.seo_score = scores.seo || 0;
    updateData.security_score = scores.security || 0;
    updateData.accessibility_score = scores.accessibility || 0;
    updateData.content_score = scores.content || 0;
    updateData.audit_score = overall;
    updateData.last_audit_at = new Date().toISOString();
    updateData.status = overall >= 85 ? 'healthy' : overall >= 60 ? 'active' : overall >= 30 ? 'degraded' : 'critical';
  }

  await sr.MonitoredSite.update(site.id, updateData);

  await sr.SiteAuditLog.create({
    site_id: site.id,
    site_url: site.url,
    action: mode,
    score: overall,
    summary: llm.summary || '',
    findings: issues,
    recommendations: llm.recommendations || [],
    code_fixes: llm.code_fixes || [],
    status: 'complete',
  });

  return { mode, score: overall, summary: llm.summary || '', issues_count: issues.length };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { site_id, modes } = body;
    const stepModes = (Array.isArray(modes) && modes.length ? modes : MODE_ORDER)
      .filter((m) => MODE_PROMPTS[m]);

    const sr = base44.asServiceRole.entities;

    let sites = [];
    if (site_id && site_id !== 'all') {
      const s = await sr.MonitoredSite.get(site_id);
      if (!s) return Response.json({ error: 'Site not found' }, { status: 404 });
      sites = [s];
    } else {
      sites = await sr.MonitoredSite.list('-updated_date', 50);
    }

    if (!sites.length) return Response.json({ error: 'No monitored sites found' }, { status: 404 });

    const cycles = [];
    for (const site of sites) {
      const steps = [];
      for (const mode of stepModes) {
        try {
          const step = await runStep(base44, site, mode);
          steps.push(step);
        } catch (e) {
          steps.push({ mode, error: e.message || 'Step failed' });
        }
      }
      // Reload final site state for the final score
      const final = await sr.MonitoredSite.get(site.id);
      cycles.push({
        site_id: site.id,
        url: site.url,
        name: site.name,
        final_score: final?.audit_score || 0,
        final_status: final?.status || 'unknown',
        steps,
      });

      await sr.AgentLog.create({
        agent_name: 'site_monitor',
        level: 'success',
        message: `Perfection cycle complete on ${site.url}: final score ${final?.audit_score || 0}/100`,
        auto_action: 'perfection_cycle',
      });
    }

    return Response.json({ ok: true, cycles });
  } catch (error) {
    console.error('runPerfectionCycle error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}