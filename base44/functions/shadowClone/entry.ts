import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ENTITIES = ['Idea', 'AgentProfile', 'AgentLog', 'ChatMessage', 'IntelFeed', 'User'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const entityName = String(body?.entity_name || '').trim();
    const query = body?.query || {};
    const copies = Math.max(1, Math.min(Number(body?.copies) || 1, 10));
    const targetEntity = String(body?.target_entity || entityName).trim();

    if (!ENTITIES.includes(entityName) || !ENTITIES.includes(targetEntity)) {
      return Response.json({ error: 'Unsupported entity', allowed: ENTITIES }, { status: 400 });
    }

    const source = base44.asServiceRole.entities[entityName];
    const records = await source.filter(query, '-created_date', 100);
    if (!records.length) return Response.json({ entity_name: entityName, cloned: 0 });

    // strip built-ins so clones get fresh ids
    const clones = [];
    for (const r of records) {
      for (let c = 0; c < copies && clones.length < 500; c++) {
        const { id, created_date, updated_date, created_by_id, ...rest } = r;
        clones.push(rest);
      }
    }

    const target = base44.asServiceRole.entities[targetEntity];
    const created = await target.bulkCreate(clones);
    return Response.json({
      entity_name: entityName,
      target_entity: targetEntity,
      source_count: records.length,
      cloned: created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}