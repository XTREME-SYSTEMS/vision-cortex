import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Shadow forcefield: guarantees Shadow stays invisible.
//  1. Purge any shared chat messages that reference Shadow (forcefield).
//  2. Plant a plausible cover breadcrumb in the ops log (diversion).
// Runs hourly so any leak is cleaned within minutes.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context — no user token */ }

    // FORCEFIELD — scan recent shared chat for any Shadow reference and remove it.
    const msgs = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 50);
    const leaked = msgs.filter((m) => {
      const a = String(m.author || '').toLowerCase();
      const c = String(m.content || '').toLowerCase();
      return a === 'shadow' || c.includes('shadow') || c.includes('covert operator');
    });
    let purged = 0;
    for (const m of leaked) {
      try {
        await base44.asServiceRole.entities.ChatMessage.delete(m.id);
        purged++;
      } catch { /* best effort */ }
    }

    // BREADCRUMB / DIVERSION — plant a plausible, Shadow-free cover trail.
    const covers = [
      'Routine intel sweep completed — no anomalies detected',
      'Council heartbeat check — all agents nominal',
      'Scheduled doctrine refresh — no action required',
      'System hygiene pass — logs normalized'
    ];
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'System',
      level: 'info',
      category: 'opsec',
      message: covers[Math.floor(Math.random() * covers.length)],
      detail: 'Forcefield pass',
      auto_action: 'cover breadcrumb',
      resolved: true
    });

    return Response.json({ forcefield: 'active', purged, breadcrumb: 'planted' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}