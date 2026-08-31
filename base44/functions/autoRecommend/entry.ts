import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  ENHANCEMENT_DISCOVER,
  ENHANCEMENT_AUDIT,
} from "../../shared/promptLibrary.ts";

// ═══════════════════════════════════════════════════════════════
// autoRecommend — the Auto-Recommendation Engine.
// Reflects on the system's own state, generates concrete enhancement
// recommendations, pre-validates them through the audit gate, and queues
// the validated ones as pending SystemEnhancement records for the
// runEnhancementCycle to implement. Runs on a schedule (Self Reflection
// & Recommendation workflow) and can be invoked on demand with context.
// See public/playbook/36-vision-and-auto-recommendation.md.
// ═══════════════════════════════════════════════════════════════

const MAX_RECS = 5;

// A condensed build order so the LLM knows what's planned (ch.24).
const BUILD_ORDER = [
  { step: "1.1", title: "Onboarding Quest — compounding questionnaire + goal lock", priority: 1 },
  { step: "1.2", title: "Goal Lock — persist locked goal for downstream scoring", priority: 1 },
  { step: "2.1", title: "Morning Feed — 10 life-path cards scored to profile (home)", priority: 2 },
  { step: "2.2", title: "scoreIdeaToProfile function", priority: 2 },
  { step: "3.1", title: "Simulation entity — horizons + decisions data model", priority: 3 },
  { step: "3.2", title: "simulateStrategy function — forecast + reverse", priority: 3 },
  { step: "3.3", title: "Simulation Studio UI", priority: 3 },
  { step: "3.5", title: "Recommendation — reverse-mode pick across strategies", priority: 3 },
  { step: "4.1", title: "generateBrand — name + logo + palette + domain", priority: 4 },
  { step: "4.2", title: "generateWebsite — site with real market data", priority: 4 },
  { step: "4.3", title: "generateContent — 30-day social schedule", priority: 4 },
  { step: "4.4", title: "Launch button — provision + payment + arm Marketer", priority: 4 },
  { step: "5.1", title: "Marketer agent — social jobs via Cloud Browser", priority: 5 },
  { step: "5.2", title: "Revenue feedback — app_payment → Council learning", priority: 5 },
  { step: "6.1", title: "Hide backend screens — admin-only route", priority: 6 },
  { step: "6.2", title: "Cloud Browser as agent tool", priority: 6 },
  { step: "7.1", title: "Multi-tenant RLS — per-owner isolation", priority: 7 },
  { step: "7.2", title: "Portability — package brain for off-Base44", priority: 7 },
];

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  const requestId = "ar_" + Date.now();
  const now = new Date().toISOString();

  try {
    // Auth: if a user is present and not admin, deny. Scheduled runs have no user.
    let context = null;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== "admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    } catch (_e) { /* scheduled run — no user */ }

    // Parse optional context payload (what's being discussed / current focus).
    try {
      const body = await req.json();
      if (body && typeof body.context === "string") context = body.context;
    } catch (_e) { /* no body or not JSON — fine */ }

    // 1. Read system state.
    const [ledger, logs, doctrine] = await Promise.all([
      sr.entities.SystemEnhancement.list("-priority", 100).catch(() => []),
      sr.entities.AgentLog.list("-created_date", 20).catch(() => []),
      sr.entities.Doctrine.list("-weight", 20).catch(() => []),
    ]);

    // Build-order progress: which steps are already done/audited.
    const doneSteps = (ledger || [])
      .filter((e) => ["audited", "optimized", "implemented"].includes(e.status))
      .map((e) => e.build_order_step)
      .filter(Boolean);
    const pendingSteps = (ledger || [])
      .filter((e) => ["pending", "in_progress", "auditing"].includes(e.status))
      .map((e) => e.build_order_step)
      .filter(Boolean);
    const buildOrder = BUILD_ORDER.map((s) => ({
      ...s,
      status: doneSteps.includes(s.step)
        ? "done"
        : pendingSteps.includes(s.step)
        ? "in_progress"
        : "not_started",
    }));

    // Recent issues from logs.
    const recentIssues = (logs || [])
      .filter((l) => l.level === "error" || l.level === "warn")
      .slice(0, 8)
      .map((l) => ({ level: l.level, message: l.message, category: l.category }));

    // Existing ledger titles (to avoid duplicates).
    const existingTitles = (ledger || []).map((e) => e.title);

    // 2. Generate recommendations via the ENHANCEMENT_DISCOVER prompt.
    const discoverPrompt = ENHANCEMENT_DISCOVER(buildOrder, ledger, doctrine);
    const contextLine = context
      ? `\n\nADDITIONAL CONTEXT FROM THE OWNER: "${context}". Weight recommendations toward this focus where relevant.`
      : "";
    const recsRes = await sr.integrations.Core.InvokeLLM({
      prompt: discoverPrompt + contextLine,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" },
                priority: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["title", "category", "priority", "rationale"],
            },
          },
        },
        required: ["recommendations"],
      },
    });

    const recs = (recsRes && recsRes.recommendations) || [];
    if (!recs.length) {
      return Response.json({
        status: "ok",
        request_id: requestId,
        generated: 0,
        queued: 0,
        message: "No new recommendations generated.",
      });
    }

    // 3. Pre-validate each recommendation through the audit gate.
    const validated = [];
    const needsReview = [];
    for (const rec of recs.slice(0, MAX_RECS)) {
      // Skip duplicates of existing ledger items.
      if (existingTitles.some((t) => t && rec.title && t.toLowerCase() === rec.title.toLowerCase())) {
        continue;
      }
      const auditPrompt = ENHANCEMENT_AUDIT(rec.title, rec.rationale);
      let audit;
      try {
        audit = await sr.integrations.Core.InvokeLLM({
          prompt: auditPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              score: { type: "number" },
              failures: { type: "array", items: { type: "string" } },
              fix_directives: { type: "array", items: { type: "string" } },
            },
            required: ["passed", "score", "failures"],
          },
        });
      } catch (_e) {
        audit = { passed: false, score: 0, failures: ["audit error"] };
      }
      if (audit && audit.passed) {
        validated.push({ ...rec, audit });
      } else {
        needsReview.push({ ...rec, audit });
      }
    }

    // 4. Queue validated recommendations as pending SystemEnhancement records.
    let queued = 0;
    if (validated.length) {
      await sr.entities.SystemEnhancement.bulkCreate(
        validated.map((v) => ({
          title: v.title,
          description: v.rationale,
          category: v.category,
          status: "pending",
          priority: v.priority,
          source: "autonomous",
          implementation_plan: v.rationale,
          audit_result: { passed: true, score: v.audit.score, failures: [] },
          last_action_at: now,
        }))
      );
      queued = validated.length;
    }

    // 5. Log the cycle run.
    await sr.entities.AgentLog.create({
      agent_name: "Auto-Recommendation Engine",
      level: "info",
      category: "self_reflection",
      message: `Auto-recommendation cycle ${requestId}: generated ${recs.length}, validated ${validated.length}, needs review ${needsReview.length}`,
      detail: JSON.stringify({
        generated: recs.length,
        queued,
        needs_review: needsReview.length,
        context: context || null,
      }),
      auto_action: "autoRecommend",
    }).catch(() => {});

    return Response.json({
      status: "ok",
      request_id: requestId,
      generated: recs.length,
      queued,
      needs_review: needsReview.length,
      validated: validated.map((v) => ({ title: v.title, category: v.category, priority: v.priority, score: v.audit.score })),
      needs_review_items: needsReview.map((v) => ({ title: v.title, failures: v.audit?.failures })),
    });
  } catch (error) {
    return Response.json({ error: error.message, request_id: requestId }, { status: 500 });
  }
}