import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { browseSession, str } from '../../shared/cloudBrowser.ts';

// deepSystemAudit — autonomous end-to-end system audit.
//
// For a single monitored site, this:
//   1. Browses the live site via Cloud Browser (the Eyes) to read real page content.
//   2. Runs a full 5-dimension audit WITH live web context — scoring performance,
//      SEO, security, accessibility, content — and simultaneously classifies the
//      system type, detects the tech stack, and researches the #1 benchmark system.
//   3. Synthesizes a full, zero-ambiguity summary and writes a specific perfection
//      prompt for EACH dimension to bring it from its current score to 100%.
//
// The report is persisted to SystemPerfectionReport and the MonitoredSite scores
// are updated. Designed to be triggered autonomously (workflow) for any new system.
//
// Invoke: base44.functions.invoke('deepSystemAudit', { site_id })
// Returns: { ok, report }

const DIMENSIONS = ['performance', 'seo', 'security', 'accessibility', 'content'];

const AUDIT_RESEARCH_PROMPT = `You are the Vision Cortex deep audit engine. Analyze the website at {URL} (repo: {REPO}).

Live page content captured by the Cloud Browser (the Eyes):
"""
{PAGE_CONTENT}
"""
(If empty or unhelpful, rely on the URL and your live web research.)

Do ALL of the following in one pass:
1. AUDIT — score these 5 dimensions 0-100 with rigorous, evidence-based judgment:
   - performance: load speed, Core Web Vitals, asset optimization, caching
   - seo: meta tags, structured data, sitemap, robots, programmatic SEO/AEO, content uniqueness
   - security: HTTPS, headers (CSP, HSTS, X-Frame-Options), exposed secrets, dependency vulnerabilities
   - accessibility: WCAG 2.1 AA, semantic HTML, alt text, contrast, keyboard nav
   - content: quality, uniqueness, relevance, conversion clarity, CTA strength
2. CLASSIFY — identify the system_type (e.g. "local-service lead-gen", "SaaS marketing site", "ecommerce storefront"), and a one-paragraph system_description of what it does and who it serves.
3. TECH STACK — detect/research the tech_stack (framework, hosting, CMS, analytics, etc.).
4. BENCHMARK — research the #1 proven benchmark_system that exemplifies this system type at its best, plus 2-4 competitor_benchmarks with their key strength and URL.
5. ISSUES — list the top issues per dimension with severity, category, title, description, recommendation.

Return strict JSON.`;

const SYNTHESIS_PROMPT = `You are the Vision Cortex synthesis engine. Below is the deep audit + research for a system. Produce a FULL, ZERO-AMBIGUITY perfection plan.

Audit + research:
{AUDIT_JSON}

For EACH of the 5 dimensions (performance, seo, security, accessibility, content), produce:
- current_score (from the audit)
- target_score: 100
- gap: a precise, evidence-based description of what is missing between current and 100
- root_cause: the underlying reason the gap exists
- perfection_prompt: a COMPLETE, self-contained, copy-paste-ready prompt that an autonomous builder agent could execute to bring THIS dimension from its current score to 100%. The prompt must include the site URL, the specific dimension, the benchmark to match, the exact issues to fix, and the acceptance criteria (score = 100, zero critical issues). No ambiguity, no placeholders.

Then produce:
- overall_summary: a full, unambiguous paragraph covering the system's identity, current state, every weakness, the benchmark it must match, and the exact path to 100% on all five dimensions.
- launch_readiness_verdict: one of "launch_ready" (all dimensions >= 90, zero critical issues), "near_ready" (all >= 75, zero critical), "not_ready" (otherwise), "unknown".

Return strict JSON.`;

const AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'object', properties: { performance: { type: 'number' }, seo: { type: 'number' }, security: { type: 'number' }, accessibility: { type: 'number' }, content: { type: 'number' } } },
    overall_score: { type: 'number' },
    system_type: { type: 'string' },
    system_description: { type: 'string' },
    tech_stack: { type: 'array', items: { type: 'string' } },
    benchmark_system: { type: 'string' },
    competitor_benchmarks: { type: 'array', items: { type: 'object', properties: { system: { type: 'string' }, strength: { type: 'string' }, url: { type: 'string' } } } },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, category: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, recommendation: { type: 'string' } } } },
    summary: { type: 'string' },
  },
  required: ['scores', 'system_type', 'issues'],
};

const SYNTHESIS_SCHEMA = {
  type: 'object',
  properties: {
    dimension_analysis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          current_score: { type: 'number' },
          target_score: { type: 'number' },
          gap: { type: 'string' },
          root_cause: { type: 'string' },
          perfection_prompt: { type: 'string' },
        },
      },
    },
    perfection_prompts: {
      type: 'array',
      items: { type: 'object', properties: { dimension: { type: 'string' }, prompt: { type: 'string' } } },
    },
    overall_summary: { type: 'string' },
    launch_readiness_verdict: { type: 'string' },
  },
  required: ['dimension_analysis', 'overall_summary', 'launch_readiness_verdict'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { site_id, autonomous = false } = body;
    if (!site_id) return Response.json({ error: 'site_id is required' }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const site = await sr.MonitoredSite.get(site_id);
    if (!site) return Response.json({ error: 'Site not found' }, { status: 404 });

    // ── 1. Cloud Browser: read the live page (the Eyes) — best-effort, 15s cap ──
    let pageContent = '';
    try {
      const browseP = browseSession(site.url, 20000);
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('browse timeout')), 15000));
      pageContent = await Promise.race([browseP, timeoutP]);
    } catch (e) {
      pageContent = `[Cloud Browser unavailable: ${e.message}]`;
    }

    // ── 2. Audit + research with live web context ──
    const auditPrompt = AUDIT_RESEARCH_PROMPT
      .replace('{URL}', site.url)
      .replace('{REPO}', site.github_repo || 'N/A')
      .replace('{PAGE_CONTENT}', str(pageContent, 30000));

    const audit = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: auditPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: AUDIT_SCHEMA,
    });

    const scores = audit.scores || {};
    const overall = audit.overall_score || Math.round(DIMENSIONS.reduce((a, d) => a + (scores[d] || 0), 0) / DIMENSIONS.length);
    const issues = audit.issues || [];
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;

    // ── 3. Synthesize perfection prompts (no web needed) ──
    const synth = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: SYNTHESIS_PROMPT.replace('{AUDIT_JSON}', JSON.stringify({ ...audit, site_url: site.url, site_name: site.name })),
      model: 'gemini_3_flash',
      response_json_schema: SYNTHESIS_SCHEMA,
    });

    const dimensionAnalysis = synth.dimension_analysis || [];
    const perfectionPrompts = synth.perfection_prompts || dimensionAnalysis.map((d) => ({ dimension: d.dimension, prompt: d.perfection_prompt }));

    // ── 4. Persist the report ──
    const report = await sr.SystemPerfectionReport.create({
      site_id: site.id,
      site_url: site.url,
      site_name: site.name,
      system_type: audit.system_type || 'unknown',
      system_description: audit.system_description || '',
      tech_stack: audit.tech_stack || [],
      benchmark_system: audit.benchmark_system || '',
      competitor_benchmarks: audit.competitor_benchmarks || [],
      scores,
      overall_score: overall,
      dimension_analysis: dimensionAnalysis,
      perfection_prompts: perfectionPrompts,
      overall_summary: synth.overall_summary || '',
      launch_readiness_verdict: synth.launch_readiness_verdict || 'unknown',
      autonomous: !!autonomous,
    });

    // ── 5. Update the monitored site scores ──
    await sr.MonitoredSite.update(site.id, {
      performance_score: scores.performance || 0,
      seo_score: scores.seo || 0,
      security_score: scores.security || 0,
      accessibility_score: scores.accessibility || 0,
      content_score: scores.content || 0,
      audit_score: overall,
      last_audit_at: new Date().toISOString(),
      last_action: 'deep_audit',
      last_action_at: new Date().toISOString(),
      last_action_summary: synth.overall_summary?.slice(0, 500) || audit.summary || '',
      issues,
      issues_count: issues.length,
      critical_issues_count: criticalCount,
      status: overall >= 85 ? 'healthy' : overall >= 60 ? 'active' : overall >= 30 ? 'degraded' : 'critical',
    });

    await sr.AgentLog.create({
      agent_name: 'vision_cortex',
      level: 'success',
      message: `Deep system audit on ${site.url}: ${overall}/100 — verdict ${synth.launch_readiness_verdict}`,
      auto_action: 'deep_system_audit',
    });

    return Response.json({
      ok: true,
      report_id: report.id,
      site_id: site.id,
      url: site.url,
      system_type: audit.system_type,
      overall_score: overall,
      scores,
      launch_readiness_verdict: synth.launch_readiness_verdict,
      dimension_analysis: dimensionAnalysis,
      perfection_prompts: perfectionPrompts,
      overall_summary: synth.overall_summary,
    });
  } catch (error) {
    console.error('deepSystemAudit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}