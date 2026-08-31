import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// healDestinyEngine — self-healing pass that closes audit gaps:
//   1. Brand the top N unbranded ideas (one batched LLM call)
//   2. Link orphaned builds to ideas by title match
//   3. Validate high-confidence doctrines
// Returns a remediation report. See playbook ch.25.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;
    const body = await req.json().catch(() => ({}));
    const brandLimit = Math.min(body.brand_limit || 10, 25);

    const [ideas, builds, doctrines] = await Promise.all([
      base44.entities.Idea.list('rank', 60).catch(() => []),
      base44.entities.BuildQueue.list('-created_date', 50).catch(() => []),
      base44.entities.Doctrine.list('-created_date', 50).catch(() => []),
    ]);

    const remediation = { branded: 0, linked_builds: 0, validated_doctrines: 0, skipped: [] };

    // 1. Brand unbranded ideas — one batched LLM call
    const unbranded = (ideas || []).filter((i) => !i.branding || !i.branding.brand_name).slice(0, brandLimit);
    if (unbranded.length) {
      const res = await core.InvokeLLM({
        prompt: `You are the Brand agent. Generate a concise brand kit for each opportunity. Return a JSON array of exactly ${unbranded.length} objects, one per idea, in order.
IDEAS: ${JSON.stringify(unbranded.map((i) => ({ id: i.id, title: i.title, industry: i.industry, one_liner: i.one_liner, target_users: i.target_users })))}
Each object: { "id": <idea id>, "brand_name": <str>, "tagline": <str>, "voice": <str>, "palette": [<hex> x4], "viral_hooks": [<str> x3] }
Names must be unique, pronounceable, and domain-likely.`,
        response_json_schema: {
          type: "object",
          properties: {
            brands: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  brand_name: { type: "string" },
                  tagline: { type: "string" },
                  voice: { type: "string" },
                  palette: { type: "array", items: { type: "string" } },
                  viral_hooks: { type: "array", items: { type: "string" } },
                },
                required: ["id", "brand_name", "tagline", "voice", "palette", "viral_hooks"],
              },
            },
          },
          required: ["brands"],
        },
      });
      const brands = res?.brands || [];
      if (brands.length) {
        const updates = brands
          .map((b) => ({ id: b.id, branding: { brand_name: b.brand_name, tagline: b.tagline, voice: b.voice, palette: b.palette, viral_hooks: b.viral_hooks }, stage: 'branded' }))
          .filter((u) => u.id);
        if (updates.length) {
          await base44.entities.Idea.bulkUpdate(updates);
          remediation.branded = updates.length;
        }
      }
    }

    // 2. Link orphaned builds to ideas by title containment
    const orphans = (builds || []).filter((b) => !b.idea_id);
    for (const b of orphans) {
      const match = (ideas || []).find(
        (i) => i.id && (b.title?.toLowerCase().includes(i.title?.toLowerCase()) || i.title?.toLowerCase().includes(b.title?.toLowerCase()))
      );
      if (match) {
        await base44.entities.BuildQueue.update(b.id, { idea_id: match.id });
        remediation.linked_builds++;
      } else {
        remediation.skipped.push(`No idea match for build "${b.title}"`);
      }
    }

    // 3. Validate high-confidence doctrines (confidence >= 0.7)
    const toValidate = (doctrines || []).filter((d) => !d.validated && (d.confidence ?? 0) >= 0.7).map((d) => d.id);
    if (toValidate.length) {
      await base44.entities.Doctrine.bulkUpdate(
        toValidate.map((id) => ({ id, validated: true, validation_count: 1 }))
      );
      remediation.validated_doctrines = toValidate.length;
    }

    await base44.entities.AgentLog.create({
      agent_name: 'Fortress Engineer',
      level: 'success',
      category: 'self_healing',
      message: `Healing pass complete: branded ${remediation.branded} ideas, linked ${remediation.linked_builds} builds, validated ${remediation.validated_doctrines} doctrines.`,
    });

    return Response.json({ remediation });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}