import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// runEnhancementCycle — the Fortress Engineer.
// Drives the SystemEnhancement ledger: plan → implement → audit → fix.
// Runs on a schedule (Self Healing Cycle workflow) every 4h, and can
// also be invoked by an admin. Auto-seeds the Build Order (chapter 24)
// on first run. Bounded to N records per run for cost control.
// See public/playbook/25-self-healing-protocol.md for the full spec.
// ═══════════════════════════════════════════════════════════════

const MAX_PER_RUN = 5;

// The Build Order (chapter 24) — auto-seeded when the ledger is empty.
const BUILD_ORDER_SEED = [
  { title: "Onboarding Quest — compounding questionnaire + goal lock", category: "feature", priority: 1, build_order_step: "1.1" },
  { title: "Goal Lock — persist locked goal for downstream scoring", category: "feature", priority: 1, build_order_step: "1.2" },
  { title: "Morning Feed — 10 idea cards scored to profile (new home page)", category: "feature", priority: 2, build_order_step: "2.1" },
  { title: "scoreIdeaToProfile function — idea × profile + goal scoring", category: "feature", priority: 2, build_order_step: "2.2" },
  { title: "Simulation entity — horizons + decisions data model", category: "feature", priority: 3, build_order_step: "3.1" },
  { title: "simulateStrategy function — forecast + reverse modes", category: "feature", priority: 3, build_order_step: "3.2" },
  { title: "Simulation Studio UI — horizons, line items, live bottom line", category: "feature", priority: 3, build_order_step: "3.3" },
  { title: "Recommendation — reverse-mode pick across 10 strategies", category: "feature", priority: 3, build_order_step: "3.5" },
  { title: "generateBrand — name + logo + palette + domain availability", category: "feature", priority: 4, build_order_step: "4.1" },
  { title: "generateWebsite — build site with real market data", category: "feature", priority: 4, build_order_step: "4.2" },
  { title: "generateContent — 30-day social schedule + videos + hooks", category: "feature", priority: 4, build_order_step: "4.3" },
  { title: "Launch button — provision Drive/Git/Vercel/Supabase + payment", category: "feature", priority: 4, build_order_step: "4.4" },
  { title: "Marketer agent — social jobs via Cloud Browser", category: "integration", priority: 5, build_order_step: "5.1" },
  { title: "Revenue feedback — app_payment workflow → Council learning", category: "integration", priority: 5, build_order_step: "5.2" },
  { title: "Hide backend screens — admin-only route for War Room/Council/Ops", category: "optimization", priority: 6, build_order_step: "6.1" },
  { title: "Cloud Browser as agent tool — research capability for all agents", category: "integration", priority: 6, build_order_step: "6.2" },
  { title: "Data-broker arm — acquire + package valuable datasets", category: "feature", priority: 6, build_order_step: "6.3" },
  { title: "Multi-tenant RLS — per-owner isolation", category: "hardening", priority: 7, build_order_step: "7.1" },
  { title: "Portability — package brain for off-Base44 deployment", category: "optimization", priority: 7, build_order_step: "7.2" },
];

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  const requestId = "fe_" + Date.now();
  const now = new Date().toISOString();

  try {
    // Auth: if a user is present and not admin, deny. Scheduled runs have no user.
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_e) { /* scheduled run — no user, proceed as service role */ }

    // 1. Auto-seed the Build Order if the ledger is empty.
    const existing = await sr.entities.SystemEnhancement.list("-priority", 200);
    if (!existing || existing.length === 0) {
      await sr.entities.SystemEnhancement.bulkCreate(
        BUILD_ORDER_SEED.map((s) => ({
          title: s.title,
          description: "Auto-seeded from the Build Order (playbook chapter 24).",
          category: s.category,
          status: "pending",
          priority: s.priority,
          source: "autonomous",
          build_order_step: s.build_order_step,
          last_action_at: now,
        }))
      );
      return Response.json({ status: "seeded", request_id: requestId, seeded: BUILD_ORDER_SEED.length });
    }

    // 2. Gather active enhancements (not yet audited/optimized/blocked).
    const active = existing
      .filter((e) => !["audited", "optimized", "blocked", "failed"].includes(e.status))
      .slice(0, MAX_PER_RUN);

    const log = [];
    let planned = 0, implemented = 0, audited = 0, fixed = 0, failed = 0, blocked = 0;

    for (const enh of active) {
      const result = await processEnhancement(sr, enh, requestId);
      log.push({ id: enh.id, title: enh.title, ...result.summary });
      planned += result.planned ? 1 : 0;
      implemented += result.implemented ? 1 : 0;
      audited += result.audited ? 1 : 0;
      fixed += result.fixed ? 1 : 0;
      failed += result.failed ? 1 : 0;
      blocked += result.blocked ? 1 : 0;
    }

    // 3. Log the cycle run.
    await sr.entities.AgentLog.create({
      agent_name: "Fortress Engineer",
      level: "info",
      category: "self_healing",
      message: `Enhancement cycle ${requestId} processed ${active.length} items`,
      detail: JSON.stringify({ planned, implemented, audited, fixed, failed, blocked }),
      auto_action: "runEnhancementCycle",
    }).catch(() => {});

    return Response.json({
      status: "ok",
      request_id: requestId,
      processed: active.length,
      totals: { planned, implemented, audited, fixed, failed, blocked },
      log,
    });
  } catch (error) {
    return Response.json({ error: error.message, request_id: requestId }, { status: 500 });
  }
}

async function processEnhancement(sr, enh, requestId) {
  const summary = {};
  let planned = false, implemented = false, audited = false, fixed = false, failed = false, blocked = false;
  const now = new Date().toISOString();

  try {
    // Phase 1: PLAN (pending → in_progress)
    if (enh.status === "pending") {
      const plan = await generatePlan(sr, enh);
      await sr.entities.SystemEnhancement.update(enh.id, {
        status: "in_progress",
        implementation_plan: plan,
        last_action_at: now,
      });
      enh.status = "in_progress";
      enh.implementation_plan = plan;
      planned = true;
      summary.plan_generated = true;
    }

    // Phase 2: IMPLEMENT (in_progress → implemented)
    // Control-plane implementation: record the plan as ready-for-builder.
    if (enh.status === "in_progress") {
      const notes = `Plan audited and ready for builder execution. Request: ${requestId}`;
      await sr.entities.SystemEnhancement.update(enh.id, {
        status: "implemented",
        implementation_notes: notes,
        last_action_at: now,
      });
      enh.status = "implemented";
      enh.implementation_notes = notes;
      implemented = true;
      summary.implemented = true;
    }

    // Phase 3: AUDIT (implemented → auditing → audited/failed)
    if (enh.status === "implemented") {
      await sr.entities.SystemEnhancement.update(enh.id, { status: "auditing", last_action_at: now });
      enh.status = "auditing";
      const audit = await runAudit(sr, enh);
      if (audit.passed) {
        await sr.entities.SystemEnhancement.update(enh.id, {
          status: "audited",
          audit_result: audit,
          last_action_at: now,
        });
        enh.status = "audited";
        audited = true;
        summary.audited = audit.score;
        // Notify owner an audited plan is ready to build.
        await sr.entities.Notification.create({
          kind: "info",
          title: "Audited plan ready",
          body: `"${enh.title}" is planned, audited, and ready for the builder to execute.`,
          severity: "info",
        }).catch(() => {});
      } else {
        // Phase 4: AUTO-FIX
        const attempts = (enh.fix_attempts || 0) + 1;
        if (attempts >= (enh.max_fix_attempts || 3)) {
          await sr.entities.SystemEnhancement.update(enh.id, {
            status: "failed",
            audit_result: audit,
            fix_attempts: attempts,
            last_action_at: now,
          });
          enh.status = "failed";
          failed = true;
          summary.failed = audit.failures;
          await sr.entities.Notification.create({
            kind: "error",
            title: "Enhancement failed audit",
            body: `"${enh.title}" failed audit after ${attempts} attempts. Needs owner attention.`,
            severity: "critical",
          }).catch(() => {});
        } else {
          const fixPlan = await generatePlan(sr, enh, audit.failures);
          await sr.entities.SystemEnhancement.update(enh.id, {
            status: "in_progress",
            audit_result: audit,
            fix_attempts: attempts,
            implementation_plan: fixPlan,
            implementation_notes: (enh.implementation_notes || "") + `\n[FIX #${attempts}] regenerated plan`,
            last_action_at: now,
          });
          enh.status = "in_progress";
          fixed = true;
          summary.fixed = attempts;
        }
      }
    }
  } catch (e) {
    await sr.entities.SystemEnhancement.update(enh.id, {
      status: "blocked",
      blocked_reason: e.message || String(e),
      last_action_at: now,
    }).catch(() => {});
    blocked = true;
    summary.blocked = e.message;
  }

  return { summary, planned, implemented, audited, fixed, failed, blocked };
}

async function generatePlan(sr, enh, failures) {
  const ctx = failures
    ? `Previous attempt failed audit. Failures to correct: ${JSON.stringify(failures)}.`
    : "Generate a concrete implementation plan.";
  const prompt = `You are the Fortress Engineer for Vision Cortex, an autonomous business-building platform.
Generate a concise, concrete implementation plan for this enhancement:

Title: ${enh.title}
Category: ${enh.category || "feature"}
Build order step: ${enh.build_order_step || "n/a"}

${ctx}

Return ONLY the plan as plain text (3-6 bullet points): what to build, which entities/functions/components, and the acceptance criteria. Reference the playbook chapter if relevant.`;

  const res = await sr.integrations.Core.InvokeLLM({ prompt });
  return typeof res === "string" ? res : JSON.stringify(res);
}

async function runAudit(sr, enh) {
  const prompt = `You are auditing an implementation plan for Vision Cortex.
Audit this plan against: (1) spec alignment, (2) doctrine consistency, (3) governance/ethics compliance, (4) bounded cost, (5) no regression.

Title: ${enh.title}
Plan:
${enh.implementation_plan || "(none)"}

Return JSON: { "passed": boolean, "score": number 0-100, "failures": [string] }.
A plan passes if it is concrete, safe, and doesn't break existing flows.`;

  const res = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        passed: { type: "boolean" },
        score: { type: "number" },
        failures: { type: "array", items: { type: "string" } },
      },
      required: ["passed", "score", "failures"],
    },
  });
  return res || { passed: false, score: 0, failures: ["Audit returned no result"] };
}