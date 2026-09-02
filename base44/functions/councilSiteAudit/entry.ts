import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// councilSiteAudit — the Xtreme Vision Council reviews ALL monitored sites
// and produces a synthesized launch-readiness verdict + prioritized recommendations.
//
// The Council does NOT re-run live audits (that's runPerfectionCycle's job).
// It reviews the latest audit findings already stored on each MonitoredSite,
// deliberates, and issues a single foresight: which sites are launch-ready,
// which are blocked, and the exact prioritized action sequence to reach launch.
//
// Invoke: base44.functions.invoke('councilSiteAudit', {})
// Returns: { ok, verdict, ready_sites, blocked_sites, prioritized_actions, report }

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const sites = await sr.MonitoredSite.list('-audit_score', 50);

    if (!sites.length) return Response.json({ error: 'No monitored sites to audit' }, { status: 404 });

    const siteDigest = sites.map((s) => ({
      name: s.name,
      url: s.url,
      github_repo: s.github_repo || '',
      overall_score: s.audit_score || 0,
      scores: {
        performance: s.performance_score || 0,
        seo: s.seo_score || 0,
        security: s.security_score || 0,
        accessibility: s.accessibility_score || 0,
        content: s.content_score || 0,
      },
      status: s.status || 'unknown',
      issues_count: s.issues_count || 0,
      critical_issues_count: s.critical_issues_count || 0,
      top_issues: (s.issues || []).slice(0, 5).map((i) => ({
        severity: i.severity,
        category: i.category,
        title: i.title,
      })),
      last_action: s.last_action || '',
      last_audit_at: s.last_audit_at || '',
    }));

    const prompt = `You are the Xtreme Vision Council — an anti-hierarchical chamber of senior engineers, security experts, SEO strategists, product leads, and launch operators.
You are reviewing a portfolio of sites preparing for launch and monetization. Your job is to deliver a single, decisive launch-readiness verdict across the entire portfolio.

Here is the current state of every monitored site:
${JSON.stringify(siteDigest, null, 2)}

Produce a Council-level report with:
1. verdict — one of: "LAUNCH_READY", "NEAR_READY", "NOT_READY". Based on the worst-performing site (a portfolio is only as strong as its weakest link).
2. ready_sites — array of site names that are launch-ready (overall >= 85, no critical issues, security >= 75).
3. blocked_sites — array of { name, blockers: [strings] } for sites NOT launch-ready, with the specific blockers.
4. prioritized_actions — an ordered array of { site, action: "fix"|"heal"|"optimize"|"enhance"|"audit", reason } describing the exact sequence of work needed to get every site to launch-ready. Most critical/severe first.
5. report — a 4-6 sentence Council foresight: the overall portfolio health, the biggest risks, and the recommended path to full launch readiness and monetization.

Be rigorous and honest. Never declare a site launch-ready if it has critical security issues or an overall score below 85. UNKNOWN is legitimate — do not guess.`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          ready_sites: { type: 'array', items: { type: 'string' } },
          blocked_sites: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                blockers: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          prioritized_actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                site: { type: 'string' },
                action: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          report: { type: 'string' },
        },
        required: ['verdict', 'report'],
      },
    });

    // Persist the Council's foresight to the War Room chat
    try {
      await sr.ChatMessage.create({
        author: 'The Council',
        author_type: 'agent',
        content: `**Portfolio Launch Verdict: ${llm.verdict}**\n\n${llm.report || ''}`,
        kind: 'foresight',
        accent: '#1d4ed8',
      });
    } catch {}

    await sr.AgentLog.create({
      agent_name: 'council',
      level: 'success',
      message: `Council site audit verdict: ${llm.verdict}. Ready: ${(llm.ready_sites || []).length}/${sites.length}. Blocked: ${(llm.blocked_sites || []).length}.`,
      auto_action: 'council_site_audit',
    });

    return Response.json({
      ok: true,
      verdict: llm.verdict,
      ready_sites: llm.ready_sites || [],
      blocked_sites: llm.blocked_sites || [],
      prioritized_actions: llm.prioritized_actions || [],
      report: llm.report || '',
      sites_reviewed: sites.length,
    });
  } catch (error) {
    console.error('councilSiteAudit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}