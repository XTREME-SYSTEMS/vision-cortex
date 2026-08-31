import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// syncProjectBrain — Cross-Project Brain Synchronization.
// Propagates the compounding brain (Doctrine + Governance) across
// every launched BuildQueue project so each inherits the latest
// validated insights. Returns a sync report. See playbook ch.22.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [doctrines, governance, builds] = await Promise.all([
      base44.entities.Doctrine.list("-created_date", 60).catch(() => []),
      base44.entities.Governance.list("rank", 30).catch(() => []),
      base44.entities.BuildQueue.list("-created_date", 50).catch(() => []),
    ]);

    const launched = builds.filter((b) => b.stage === "launched");
    const validatedDoctrines = doctrines.filter((d) => d.validated);
    const brainDigest = validatedDoctrines.map((d) => ({
      topic: d.topic,
      insight: d.insight,
      category: d.category,
      weight: d.weight,
      confidence: d.confidence,
    }));
    const governanceDigest = governance.map((g) => ({
      article: g.article,
      principle: g.principle,
      category: g.category,
    }));

    // Each launched build receives the current brain snapshot in notes.
    const updates = launched.map((b) => ({
      id: b.id,
      notes: JSON.stringify({
        brain_sync: {
          synced_at: new Date().toISOString(),
          doctrine_count: brainDigest.length,
          governance_count: governanceDigest.length,
          doctrines: brainDigest,
          governance: governanceDigest,
        },
      }),
    }));

    let synced = 0;
    if (updates.length) {
      await base44.entities.BuildQueue.bulkUpdate(updates);
      synced = updates.length;
    }

    await base44.entities.AgentLog.create({
      agent_name: "Maxwell",
      level: "success",
      category: "brain_sync",
      message: `Cross-project brain sync complete — ${synced} builds received ${brainDigest.length} doctrines + ${governanceDigest.length} governance articles.`,
    });

    return Response.json({
      status: "ok",
      synced_builds: synced,
      doctrines_propagated: brainDigest.length,
      governance_propagated: governanceDigest.length,
      builds: launched.map((b) => b.title),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}