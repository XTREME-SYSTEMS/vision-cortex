import { createClientFromRequest, requireAdminOrWebhook } from '../../runtime/index';

// ============================================================================
// PERSISTENT AUDIT CYCLE — The internal self-reflection and audit system.
// Scans all systems for issues that need: audit, analyze, fix, heal, harden,
// optimize, enhance. Creates Notification records for each issue found.
// Focused on getting all systems to 100%. Does NOT include building/creation.
// Managed by: Alpha-Inquisitor (audit), Forge-Smith (fix), Sentinel (heal),
// Aegis-Sentinel (harden/optimize), Omni-Architect (enhance).
// ============================================================================

const AUDIT_AGENTS = {
  audit: 'Alpha-Inquisitor',
  analyze: 'Alpha-Inquisitor',
  fix: 'Forge-Smith',
  heal: 'Sentinel',
  harden: 'Aegis-Sentinel',
  optimize: 'Aegis-Sentinel',
  enhance: 'Omni-Architect',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin user OR workflow context
    const authorizationError = await requireAdminOrWebhook(req);
    if (authorizationError) return authorizationError;

    const sr = base44.asServiceRole.entities;
    const issues = [];

    // 1. Scan SystemDNA_Gap for open gaps
    const gaps = await sr.SystemDNA_Gap.filter({ status: 'open' }, '-severity', 100).catch(() => []);
    for (const gap of gaps) {
      const actionType = gap.severity === 'P0' ? 'fix' : gap.category?.includes('security') ? 'harden' : gap.category?.includes('performance') ? 'optimize' : 'audit';
      issues.push({
        type: actionType,
        title: `${actionType.toUpperCase()}: ${gap.title || gap.description || 'System gap detected'}`,
        body: `Problem: ${gap.description || gap.title || 'System gap requires attention'}\nAgent: ${AUDIT_AGENTS[actionType] || 'Alpha-Inquisitor'}\nAction: ${actionType}\nSeverity: ${gap.severity || 'medium'}`,
        severity: gap.severity === 'P0' || gap.is_blocking ? 'critical' : 'warn',
      });
    }

    // 2. Scan SystemDNA_System for systems below 100%
    const systems = await sr.SystemDNA_System.list('-created_date', 20).catch(() => []);
    for (const sys of systems) {
      if ((sys.current_score || 0) < (sys.north_star_score || 100)) {
        const gap = (sys.north_star_score || 100) - (sys.current_score || 0);
        issues.push({
          type: 'optimize',
          title: `OPTIMIZE: ${sys.name} at ${sys.current_score}% — needs ${gap} points to reach 100%`,
          body: `Problem: ${sys.name} is at ${sys.current_score}/${sys.north_star_score || 100} — ${gap} points from perfection\nAgent: Aegis-Sentinel\nAction: optimize\nSeverity: ${gap > 30 ? 'critical' : 'warn'}`,
          severity: gap > 30 ? 'critical' : 'warn',
        });
      }
    }

    // 3. Scan MonitoredSite for sites with issues
    const allSites = await sr.MonitoredSite.list('-created_date', 30).catch(() => []);
    for (const site of allSites) {
      if (site.status === 'critical' || site.status === 'degraded') {
        const issueCount = site.critical_issues_count || 0;
        issues.push({
          type: 'fix',
          title: `FIX: ${site.name} — ${issueCount} critical issues detected`,
          body: `Problem: ${site.name} has ${issueCount} critical issues (score: ${site.audit_score || 0}/100)\nAgent: Forge-Smith\nAction: fix\nSeverity: critical`,
          severity: 'critical',
        });
      } else if ((site.audit_score || 0) < 80) {
        issues.push({
          type: 'enhance',
          title: `ENHANCE: ${site.name} — audit score ${site.audit_score}/100 needs improvement`,
          body: `Problem: ${site.name} audit score is below 80 (${site.audit_score}/100)\nAgent: Omni-Architect\nAction: enhance\nSeverity: warn`,
          severity: 'warn',
        });
      }
    }

    // 4. Check for agents in error state
    const errorAgents = await sr.AgentProfile.filter({ status: 'error' }, '-created_date', 20).catch(() => []);
    for (const agent of errorAgents) {
      issues.push({
        type: 'heal',
        title: `HEAL: Agent ${agent.name} is in error state`,
        body: `Problem: Agent ${agent.name} (${agent.codename}) is in error state and needs healing\nAgent: Sentinel\nAction: heal\nSeverity: critical`,
        severity: 'critical',
      });
    }

    // 5. Check for agents with conduct strikes
    const strikingAgents = await sr.AgentProfile.filter({ strike_count: { $gt: 0 } }, '-strike_count', 20).catch(() => []);
    for (const agent of strikingAgents) {
      issues.push({
        type: 'audit',
        title: `AUDIT: Agent ${agent.name} has ${agent.strike_count} conduct strikes`,
        body: `Problem: Agent ${agent.name} has ${agent.strike_count} strike(s) — 3 strikes = deletion/reprogramming\nAgent: Alpha-Inquisitor\nAction: audit\nSeverity: ${agent.strike_count >= 2 ? 'critical' : 'warn'}`,
        severity: agent.strike_count >= 2 ? 'critical' : 'warn',
      });
    }

    // 6. Check for failed AgentSchedule tasks
    const failedTasks = await sr.AgentSchedule.filter({ status: 'failed' }, '-created_date', 20).catch(() => []);
    for (const task of failedTasks.slice(0, 10)) {
      issues.push({
        type: 'fix',
        title: `FIX: Failed task — ${task.task_title}`,
        body: `Problem: Task "${task.task_title}" by ${task.agent_name} failed and needs fixing\nAgent: Forge-Smith\nAction: fix\nSeverity: warn`,
        severity: 'warn',
      });
    }

    // 7. Check for open SystemGap entities
    const systemGaps = await sr.SystemGap.filter({ status: 'open' }, '-created_date', 20).catch(() => []);
    for (const sg of systemGaps.slice(0, 10)) {
      issues.push({
        type: 'fix',
        title: `FIX: ${sg.title || sg.description || 'System gap requires fixing'}`,
        body: `Problem: ${sg.description || sg.title || 'Open system gap needs attention'}\nAgent: Forge-Smith\nAction: fix\nSeverity: ${sg.severity === 'critical' ? 'critical' : 'warn'}`,
        severity: sg.severity === 'critical' ? 'critical' : 'warn',
      });
    }

    // Deduplicate — skip if an unread notification with the same title exists
    const existingNotifs = await sr.Notification.filter({ kind: 'gate', read: false }, '-created_date', 200).catch(() => []);
    const existingTitles = new Set(existingNotifs.map(n => n.title));

    let created = 0;
    for (const issue of issues) {
      if (existingTitles.has(issue.title)) continue;
      try {
        await sr.Notification.create({
          kind: 'gate',
          title: issue.title,
          body: issue.body,
          severity: issue.severity,
          read: false,
        });
        created++;
      } catch (e) {}
    }

    return Response.json({
      ok: true,
      issues_found: issues.length,
      notifications_created: created,
      duplicates_skipped: issues.length - created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}