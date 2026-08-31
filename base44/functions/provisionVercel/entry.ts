import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const API = 'https://api.vercel.com';
const auth = () => ({ Authorization: `Bearer ${secrets.get('VERCEL_TOKEN')}`, 'Content-Type': 'application/json' });

// Autonomous Vercel provisioning for the AutoBuilder OS deployment layer.
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
      const r = await fetch(`${API}/v9/projects?limit=50`, { headers: auth() });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: 'vercel api', status: r.status, detail: data }, { status: 502 });
      const projects = (data.projects || []).map((p) => ({ id: p.id, name: p.name, framework: p.framework, link: p.link?.repo }));
      return Response.json({ projects });
    }

    // create — provisions a new Vercel project, optionally linked to a GitHub repo
    if (mode === 'create') {
      const name = String(body.name || 'autobuilder-os').slice(0, 40);
      const owner = String(body.repo_owner || '').slice(0, 80);
      const repo = String(body.repo_name || '').slice(0, 80);
      const payload = { name };
      if (owner && repo) payload.gitSource = { type: 'github', repo: `${owner}/${repo}`, ref: body.branch || 'main' };

      const createRes = await fetch(`${API}/v10/projects`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify(payload)
      });
      const created = await createRes.json();
      if (!createRes.ok) return Response.json({ error: 'vercel create', status: createRes.status, detail: created }, { status: 502 });

      // optionally set env vars
      const envVars = body.env || {};
      const envResults = [];
      for (const [key, value] of Object.entries(envVars)) {
        try {
          const er = await fetch(`${API}/v10/projects/${created.id}/env`, {
            method: 'POST', headers: auth(),
            body: JSON.stringify({ key: String(key).slice(0, 200), value: String(value).slice(0, 4000), type: 'encrypted', target: ['production', 'preview'] })
          });
          envResults.push({ key, ok: er.ok });
        } catch (e) { envResults.push({ key, ok: false, error: e.message }); }
      }

      await base44.asServiceRole.entities.Notification.create({
        kind: 'info', severity: 'info', read: false,
        title: 'Vercel project provisioned',
        body: `${name}${owner && repo ? ` linked to ${owner}/${repo}` : ' (empty, no git)'}. ${Object.keys(envVars).length} env vars set.`
      });

      return Response.json({ project: { id: created.id, name, repo: owner && repo ? `${owner}/${repo}` : null, env: envResults } });
    }

    return Response.json({ error: 'unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}