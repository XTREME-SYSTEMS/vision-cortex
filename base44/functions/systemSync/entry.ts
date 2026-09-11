import { createClientFromRequest, secrets } from '../../runtime/index';

// Bi-directional sync endpoint for all connected systems.
// Other apps authenticate with VISION_CORTEX_EYES_API_KEY and use actions:
//   status       — get health scores for all systems + sites
//   instructions — pull pending SystemEnhancements for a specific system
//   report       — mark an enhancement as implemented/failed with notes
//   register     — register a new site to be monitored by the master cycle
//   heartbeat    — ping/health check
export default async function(req: any) {
  try {
    // Auth: x-api-key (other apps) or x-cron-token (cron) or admin session
    const apiKey = (req.headers.get('x-api-key') || '').replace('Bearer ', '').trim();
    const cronToken = (req.headers.get('x-cron-token') || '').trim();
    const eyesKey = secrets.get('VISION_CORTEX_EYES_API_KEY');
    const webhookKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');

    let authorized = false;
    if (eyesKey && apiKey === eyesKey) authorized = true;
    if (webhookKey && cronToken === webhookKey) authorized = true;
    if (!authorized) {
      try {
        const base44 = createClientFromRequest(req);
        const u = await base44.auth.me();
        if (u?.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized — valid x-api-key required' }, { status: 401 });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, system_name, enhancement_id, status, notes, site_data } = body;

    switch (action) {
      // === STATUS: return all system + site health scores ===
      case 'status': {
        const [sites, systems, pendingEnhancements] = await Promise.all([
          base44.asServiceRole.entities.MonitoredSite.filter({}),
          base44.asServiceRole.entities.SystemDNA_System.filter({}),
          base44.asServiceRole.entities.SystemEnhancement.filter({ status: { $in: ['pending', 'approved', 'in_progress'] } }, '-created_date', 50)
        ]);
        return Response.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          sites: sites.map((s: any) => ({ id: s.id, name: s.name, url: s.url, score: s.audit_score, status: s.status, issues: s.issues_count, critical: s.critical_issues_count, last_audit: s.last_audit_at })),
          systems: systems.map((s: any) => ({ id: s.id, name: s.name, category: s.category, score: s.current_score, target: s.north_star_score, health: s.health_status, security: s.security_health, lifecycle: s.lifecycle_state })),
          pending_enhancements: pendingEnhancements.length,
          overall_health: Math.round([...sites.map((s: any) => s.audit_score || 0), ...systems.map((s: any) => s.current_score || 0)].reduce((a, b) => a + b, 0) / (sites.length + systems.length || 1))
        });
      }

      // === INSTRUCTIONS: pull pending enhancements for a specific system ===
      case 'instructions': {
        if (!system_name) return Response.json({ error: 'system_name required' }, { status: 400 });
        const enhancements = await base44.asServiceRole.entities.SystemEnhancement.filter(
          { existing_system: system_name, status: { $in: ['pending', 'approved'] } },
          '-created_date', 20
        );
        return Response.json({
          status: 'ok',
          system: system_name,
          pending_count: enhancements.length,
          instructions: enhancements.map((e: any) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            priority: e.priority,
            description: e.description,
            recommended_enhancement: e.recommended_enhancement,
            implementation_plan: e.implementation_plan,
            implementation_code: e.implementation_code,
            status: e.status
          }))
        });
      }

      // === REPORT: mark an enhancement as implemented/failed ===
      case 'report': {
        if (!enhancement_id) return Response.json({ error: 'enhancement_id required' }, { status: 400 });
        const enhancement = await base44.asServiceRole.entities.SystemEnhancement.get(enhancement_id);
        if (!enhancement) return Response.json({ error: 'Enhancement not found' }, { status: 404 });

        const validStatuses = ['implemented', 'validating', 'failed', 'blocked'];
        const newStatus = validStatuses.includes(status) ? status : 'implemented';

        await base44.asServiceRole.entities.SystemEnhancement.update(enhancement_id, {
          status: newStatus,
          implementation_notes: notes || '',
          last_action_at: new Date().toISOString(),
          audit_result: newStatus === 'implemented' ? { passed: true, score: 100, failures: [] } : enhancement.audit_result
        });

        // Log the report
        try {
          await base44.asServiceRole.entities.AgentLog.create({
            agent_name: 'SYSTEM_SYNC',
            category: 'implementation_report',
            level: newStatus === 'failed' ? 'warn' : 'success',
            message: `${enhancement.title} → ${newStatus}${notes ? ': ' + notes.substring(0, 200) : ''}`,
            detail: JSON.stringify({ enhancement_id, system: enhancement.existing_system, status: newStatus })
          });
        } catch {}

        return Response.json({ status: 'ok', enhancement_id, new_status: newStatus, message: `Enhancement marked as ${newStatus}` });
      }

      // === REGISTER: register a new site to be monitored ===
      case 'register': {
        if (!site_data?.name || !site_data?.url) return Response.json({ error: 'site_data.name and site_data.url required' }, { status: 400 });
        const existing = await base44.asServiceRole.entities.MonitoredSite.filter({ url: site_data.url });
        if (existing.length > 0) {
          return Response.json({ status: 'exists', site_id: existing[0].id, message: 'Site already registered' });
        }
        const site = await base44.asServiceRole.entities.MonitoredSite.create({
          name: site_data.name,
          url: site_data.url,
          github_repo: site_data.github_repo || '',
          status: 'active',
          audit_score: 0
        });
        return Response.json({ status: 'ok', site_id: site.id, message: `${site_data.name} registered — master cycle will audit it next run` });
      }

      // === HEARTBEAT: simple ping ===
      case 'heartbeat': {
        return Response.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'Vision Cortex sync endpoint is live' });
      }

      default:
        return Response.json({ error: 'Unknown action. Use: status, instructions, report, register, heartbeat' }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}