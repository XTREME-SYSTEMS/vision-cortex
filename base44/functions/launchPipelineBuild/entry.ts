import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Auto-launches the top council-approved (stage = strategized) build by
// provisioning a Vercel project for it. Admin or workflow invocation.
// Returns { launched: false } (200) when nothing is launch-ready so the
// cron workflow stays clean instead of erroring.

const API = 'https://api.vercel.com';
const auth = () => ({ Authorization: `Bearer ${secrets.get('VERCEL_TOKEN')}`, 'Content-Type': 'application/json' });

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'autobuilder-build';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    try {
      const u = await base44.auth.me();
      if (u && u.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context */ }

    const body = await req.json().catch(() => ({}));
    let item = null;
    if (body.id) {
      try { item = await base44.asServiceRole.entities.BuildQueue.get(body.id); } catch { item = null; }
    }
    if (!item) {
      const ready = await base44.asServiceRole.entities.BuildQueue.filter({ stage: 'strategized' }, '-priority', 1);
      item = ready[0];
    }
    if (!item) return Response.json({ launched: false, reason: 'no launch-ready (strategized) build in queue' });

    await base44.asServiceRole.entities.BuildQueue.update(item.id, { stage: 'building' });

    const name = slugify(item.title);
    const createRes = await fetch(`${API}/v10/projects`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ name }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      await base44.asServiceRole.entities.BuildQueue.update(item.id, { stage: 'failed', notes: `${String(item.notes || '').slice(0, 1500)} | Vercel create failed` });
      await base44.asServiceRole.entities.AgentLog.create({ agent_name: 'Builder', level: 'error', category: 'pipeline_launch', message: `Launch failed: ${item.title}`, detail: JSON.stringify(created).slice(0, 500), auto_action: 'auto-provision', resolved: false });
      return Response.json({ launched: false, error: 'vercel create', detail: created }, { status: 502 });
    }

    await base44.asServiceRole.entities.BuildQueue.update(item.id, {
      stage: 'launched',
      notes: `${String(item.notes || '').slice(0, 1500)} | Vercel project: ${created.id} (${name})`,
    });
    await base44.asServiceRole.entities.Notification.create({
      kind: 'info', severity: 'info', read: false,
      title: 'Pipeline build launched',
      body: `${item.title} -> Vercel project ${name} (${created.id}).`,
    });
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Builder', level: 'success', category: 'pipeline_launch',
      message: `Launched build: ${item.title} -> Vercel ${name}`,
      detail: created.id, auto_action: 'auto-provisioned', resolved: true,
    });

    return Response.json({ launched: true, build_id: item.id, vercel_project: { id: created.id, name } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}