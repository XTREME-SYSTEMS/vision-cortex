import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const API = 'https://api.supabase.com/v1';
const auth = () => ({ Authorization: `Bearer ${secrets.get('SUPABASE_TOKEN')}`, 'Content-Type': 'application/json' });

// Autonomous Supabase provisioning for the AutoBuilder OS database layer.
// Admin-only. Supports a read-only "list" mode for safe testing.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'auth required' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'list';

    // list — read-only, safe
    if (mode === 'list') {
      const r = await fetch(`${API}/projects`, { headers: auth() });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: 'supabase api', status: r.status, detail: data }, { status: 502 });
      const projects = (data || []).map((p) => ({ id: p.id, name: p.name, region: p.region, status: p.status, url: `https://${p.id}.supabase.co` }));
      return Response.json({ projects });
    }

    // create — provisions a new project
    if (mode === 'create') {
      const name = String(body.name || 'autobuilder-os').slice(0, 40);
      const dbPass = String(body.db_password || '').slice(0, 60);
      if (!dbPass) return Response.json({ error: 'db_password required' }, { status: 400 });

      // resolve organization from existing projects (the /orgs endpoint is not public)
      let orgId = body.org_id;
      if (!orgId) {
        const pr = await fetch(`${API}/projects`, { headers: auth() });
        const projects = await pr.json();
        if (!pr.ok) return Response.json({ error: 'supabase projects lookup', detail: projects }, { status: 502 });
        orgId = (projects || [])[0]?.organization_id;
      }
      if (!orgId) return Response.json({ error: 'no supabase organization found' }, { status: 400 });

      const createRes = await fetch(`${API}/projects`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ name, organization_id: orgId, region: body.region || 'us-east-1', db_pass: dbPass, plan: body.plan || 'free' })
      });
      const created = await createRes.json();
      if (!createRes.ok) return Response.json({ error: 'supabase create', status: createRes.status, detail: created }, { status: 502 });

      const ref = created.id;
      // poll until ready (max ~3 min)
      let status = created.status, ready = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 6000));
        const pr = await fetch(`${API}/projects/${ref}`, { headers: auth() });
        const pj = await pr.json();
        status = pj.status;
        if (status === 'ACTIVE' || status === 'ACTIVE_HEALTHY' || status === 'READY') { ready = true; break; }
      }

      // fetch service_role key
      let serviceRoleKey = null, anonKey = null;
      try {
        const kr = await fetch(`${API}/projects/${ref}/api-keys`, { headers: auth() });
        const keys = await kr.json();
        serviceRoleKey = (keys || []).find((k) => k.name === 'service_role')?.api_key;
        anonKey = (keys || []).find((k) => k.name === 'anon')?.api_key;
      } catch {}

      await base44.asServiceRole.entities.Notification.create({
        kind: 'info', severity: 'info', read: false,
        title: 'Supabase project provisioned',
        body: `${name} (${ref}) — region ${body.region || 'us-east-1'}, ready=${ready}.`
      });

      return Response.json({ project: { ref, name, url: `https://${ref}.supabase.co`, status, ready, serviceRoleKey, anonKey } });
    }

    return Response.json({ error: 'unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}