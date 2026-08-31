import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const str = (v, max) => String(v ?? '').slice(0, max);

// Owner digest — scans for unresolved agent errors and surfaces them as
// owner notifications. Runs hourly via the "Owner Digest" workflow, and can
// be invoked on demand. Admin-only when called by a user; workflows pass no
// user token and are allowed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context — no user token */ }

    const N = base44.asServiceRole.entities.Notification;
    const L = base44.asServiceRole.entities.AgentLog;

    // unresolved errors older than the last error notification we already sent
    const recentNotifs = await N.list('-created_date', 20);
    const lastErrorNotif = recentNotifs.find((n) => n.kind === 'error');
    const since = lastErrorNotif ? new Date(lastErrorNotif.created_date) : new Date(0);

    const errors = await L.filter({ level: 'error', resolved: false }, '-created_date', 20);
    const fresh = errors.filter((e) => new Date(e.created_date) > since);

    let alerted = 0;
    if (fresh.length) {
      // one consolidated notification per digest, not one per error
      const titles = fresh.slice(0, 5).map((e) => `${e.agent_name}: ${str(e.message, 80)}`).join(' · ');
      await N.create({
        kind: 'error',
        severity: 'warn',
        title: `${fresh.length} unresolved agent error${fresh.length === 1 ? '' : 's'}`,
        body: titles,
        read: false
      });
      alerted = 1;
    }

    return Response.json({ errors: fresh.length, alerted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}