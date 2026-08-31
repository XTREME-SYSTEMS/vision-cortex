import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// auditDestinyEngine — the zero-failure audit layer.
// Gathers engine stats, runs an LLM audit over pipeline integrity,
// data integrity, loop closure, and security posture, persists the
// result as a SystemEnhancement (audited), and returns the report.
// See playbook ch.25 / ch.28.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    const [ideas, sims, builds, doctrines, enh, profiles] = await Promise.all([
      base44.entities.Idea.list('-created_date', 50).catch(() => []),
      base44.entities.Simulation.list('-created_date', 20).catch(() => []),
      base44.entities.BuildQueue.list('-created_date', 30).catch(() => []),
      base44.entities.Doctrine.list('-created_date', 30).catch(() => []),
      base44.entities.SystemEnhancement.list('-created_date', 30).catch(() => []),
      base44.entities.UserProfile.list('-created_date', 10).catch(() => []),
    ]);

    const stats = {
      ideas: ideas.length,
      ideas_branded: ideas.filter((i) => i.stage === 'branded').length,
      ideas_without_branding: ideas.filter((i) => !i.branding || !i.branding.brand_name).length,
      simulations: sims.length,
      sims_with_forecast: sims.filter((s) => (s.forecast || []).length > 0).length,
      builds: builds.length,
      builds_launched: builds.filter((b) => b.stage === 'launched').length,
      builds_without_idea: builds.filter((b) => !b.idea_id).length,
      doctrines: doctrines.length,
      doctrines_marketer: doctrines.filter((d) => d.source === 'marketer').length,
      doctrines_validated: doctrines.filter((d) => d.validated).length,
      enhancements: enh.length,
      enhancements_implemented: enh.filter((e) => e.status === 'implemented' || e.status === 'audited').length,
      enhancements_failed: enh.filter((e) => e.status === 'failed').length,
      profiles: profiles.length,
      profiles_completed: profiles.filter((p) => p.completed).length,
    };

    const res = await core.InvokeLLM({
      prompt: `You are the Audit layer for the Vision Cortex Destiny Engine. Audit the engine's integrity end-to-end.
ENGINE STATS: ${JSON.stringify(stats)}
PIPELINE: Onboarding → Morning Feed → Simulation → Approvals → Build → Marketer, with a revenue→doctrine feedback loop and a 24/7 autonomous cycle.

Audit for: (1) pipeline completeness, (2) data integrity — orphaned builds (builds_without_idea), unbranded ideas, simulations missing forecasts, (3) loop closure — revenue→doctrine doctrines present and validated, (4) security posture — admin-gated writes (RLS), (5) operational readiness — onboarding completion, launched builds.
Return JSON:
{
  "score": <int 0-100>,
  "passed": <bool>,
  "failures": [ <concrete string with entity/field affected> ],
  "recommendations": [ <string> ],
  "verdict": <one-line string>
}
Be rigorous and specific. Only set passed=true if score >= 85 AND no critical failures.`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          passed: { type: "boolean" },
          failures: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          verdict: { type: "string" },
        },
        required: ["score", "passed", "failures", "recommendations", "verdict"],
      },
    });

    const report = res || {};
    const score = report.score ?? 0;
    const passed = !!report.passed;

    const enh_rec = await base44.entities.SystemEnhancement.create({
      title: `Destiny Engine audit — score ${score}/100`,
      description: report.verdict || 'Automated engine audit',
      category: 'hardening',
      status: 'audited',
      priority: passed ? 3 : 1,
      source: 'autonomous',
      audit_result: { passed, score, failures: report.failures || [] },
      last_action_at: new Date().toISOString(),
    });

    await base44.entities.AgentLog.create({
      agent_name: 'Auditor',
      level: passed ? 'success' : 'warn',
      category: 'engine_audit',
      message: `Destiny Engine audit complete — score ${score}/100, ${passed ? 'PASSED' : `${(report.failures || []).length} failures`}.`,
    });

    return Response.json({ report, stats, enhancement_id: enh_rec.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}