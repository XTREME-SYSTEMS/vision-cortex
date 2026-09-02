import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// auditExternalSite — monitors an external deployed site + its GitHub repo.
// Modes: audit | fix | heal | optimize | enhance
// Uses live web context (gemini_3_flash) to inspect the real site.

const MODE_PROMPTS = {
  audit: `You are a senior site reliability engineer and web auditor. Perform a comprehensive audit of the website at {URL}.
If a GitHub repo is provided ({REPO}), also consider its codebase structure.

Analyze these 5 dimensions and score each 0-100:
1. **Performance** — load speed, Core Web Vitals signals, asset optimization, caching strategy
2. **SEO** — meta tags, structured data, sitemap, robots, programmatic SEO/AEO readiness, content uniqueness
3. **Security** — HTTPS, headers (CSP, HSTS, X-Frame-Options), exposed secrets, dependency vulnerabilities
4. **Accessibility** — WCAG 2.1 AA compliance, semantic HTML, alt text, contrast, keyboard nav
5. **Content** — content quality, uniqueness, relevance, conversion clarity, call-to-action strength

Return a JSON object with:
- scores: { performance, seo, security, accessibility, content } (each 0-100)
- overall_score: 0-100 (weighted average)
- issues: array of { severity (critical|high|medium|low), category, title, description, recommendation }
- summary: 2-3 sentence overall assessment`,

  fix: `You are a senior engineer fixing critical issues on {URL} (repo: {REPO}).
Based on the site's current state, identify the TOP critical and high-severity issues that need immediate fixing.
For each issue, provide a specific, actionable code-level fix.

Return JSON:
- issues: array of { severity, category, title, description, recommendation }
- code_fixes: array of { file, issue, fix } — concrete file-level fixes
- summary: what was identified and how to fix it`,

  heal: `You are a site healing specialist. Perform a full healing analysis of {URL} (repo: {REPO}).
Identify systemic problems — broken flows, data integrity issues, error states, missing error handling, dead links, inconsistent state — and prescribe a comprehensive healing plan.

Return JSON:
- issues: array of { severity, category, title, description, recommendation }
- code_fixes: array of { file, issue, fix }
- summary: the healing plan overview`,

  optimize: `You are a performance and SEO optimization expert. Analyze {URL} (repo: {REPO}) for optimization opportunities.
Focus on: speed improvements, Core Web Vitals, bundle size, image optimization, lazy loading, caching, meta/structured data, programmatic SEO/AEO enhancements.

Return JSON:
- issues: array of { severity, category, title, description, recommendation }
- code_fixes: array of { file, issue, fix }
- summary: optimization strategy`,

  enhance: `You are a product enhancement strategist. Analyze {URL} (repo: {REPO}) and recommend feature and content enhancements that would increase its market value, user engagement, and competitive edge.
Think about: missing features, content gaps, UX improvements, new revenue vectors, viral hooks, integrations.

Return JSON:
- issues: array of { severity, category, title, description, recommendation }
- recommendations: array of enhancement recommendation strings
- summary: enhancement roadmap`,
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { site_id, mode = 'audit' } = body;
    if (!site_id) return Response.json({ error: 'site_id is required' }, { status: 400 });
    if (!MODE_PROMPTS[mode]) return Response.json({ error: `Invalid mode: ${mode}` }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const site = await sr.MonitoredSite.get(site_id);
    if (!site) return Response.json({ error: 'Site not found' }, { status: 404 });

    const promptTemplate = MODE_PROMPTS[mode];
    const prompt = promptTemplate
      .replace('{URL}', site.url)
      .replace('{REPO}', site.github_repo || 'N/A');

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          scores: {
            type: 'object',
            properties: {
              performance: { type: 'number' },
              seo: { type: 'number' },
              security: { type: 'number' },
              accessibility: { type: 'number' },
              content: { type: 'number' },
            },
          },
          overall_score: { type: 'number' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string' },
                category: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                recommendation: { type: 'string' },
              },
            },
          },
          recommendations: { type: 'array', items: { type: 'string' } },
          code_fixes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                issue: { type: 'string' },
                fix: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
        required: ['issues', 'summary'],
      },
    });

    const issues = llm.issues || [];
    const scores = llm.scores || {};
    const overall = llm.overall_score || 0;
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;

    // Update the site record
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

    await sr.MonitoredSite.update(site_id, updateData);

    // Log the action
    await sr.SiteAuditLog.create({
      site_id,
      site_url: site.url,
      action: mode,
      score: overall,
      summary: llm.summary || '',
      findings: issues,
      recommendations: llm.recommendations || [],
      code_fixes: llm.code_fixes || [],
      status: 'complete',
    });

    // Log to agent system
    await sr.AgentLog.create({
      agent_name: 'site_monitor',
      level: 'success',
      message: `${mode.toUpperCase()} on ${site.url}: ${llm.summary?.slice(0, 120) || 'complete'}`,
      auto_action: `site_${mode}`,
    });

    return Response.json({
      ok: true,
      mode,
      site_id,
      url: site.url,
      overall_score: overall,
      scores,
      issues,
      recommendations: llm.recommendations || [],
      code_fixes: llm.code_fixes || [],
      summary: llm.summary,
    });
  } catch (error) {
    console.error('auditExternalSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}