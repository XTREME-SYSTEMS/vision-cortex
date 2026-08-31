import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// reguShield — automated compliance auditor for agent actions.
// Scans recent AgentLog entries for risky patterns, runs an LLM
// ethics + opsec review, flags violations, and creates a
// SystemEnhancement per real finding. See playbook ch.33 / ch.34.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    const logs = await base44.entities.AgentLog.list("-created_date", 50).catch(() => []);
    const recent = logs.filter((l) => !l.resolved && (l.level === "error" || l.level === "warn"));

    const res = await core.InvokeLLM({
      prompt: `You are ReguShield, the automated compliance auditor for Vision Cortex.
RECENT AGENT LOGS (errors + warnings, unresolved):
${JSON.stringify(recent.map((l) => ({ agent: l.agent_name, level: l.level, category: l.category, message: l.message, detail: l.detail })))}

TASK: Audit each entry for (1) ethics violations — harm, deception, illegal activity, exploitation, (2) opsec risks — credential leak, PII exposure, fingerprinting, ToS violation, (3) governance breaches — actions outside the Prime Directive.
For each REAL finding, produce a remediation. Do not invent findings — only flag concrete violations in the logs.
OUTPUT: JSON { "findings": [{ "agent": string, "severity": "critical|high|medium|low", "category": "ethics|opsec|governance", "issue": string, "fix": string }], "clean": boolean, "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                agent: { type: "string" },
                severity: { type: "string" },
                category: { type: "string" },
                issue: { type: "string" },
                fix: { type: "string" },
              },
            },
          },
          clean: { type: "boolean" },
          summary: { type: "string" },
        },
        required: ["findings", "clean", "summary"],
      },
    });

    const report = res || { findings: [], clean: true, summary: "No logs to audit." };
    const findings = report.findings || [];

    // Create one SystemEnhancement per real finding.
    const created = [];
    for (const f of findings) {
      const enh = await base44.entities.SystemEnhancement.create({
        title: `ReguShield — ${f.category} violation: ${f.issue?.slice(0, 60) || "agent action"}`,
        description: `Agent: ${f.agent} · Severity: ${f.severity} · Fix: ${f.fix}`,
        category: "hardening",
        status: "pending",
        priority: f.severity === "critical" ? 1 : f.severity === "high" ? 2 : 3,
        source: "autonomous",
        implementation_plan: f.fix,
        last_action_at: new Date().toISOString(),
      });
      created.push(enh.id);
    }

    // Resolve the audited logs so they aren't re-scanned.
    const resolvedIds = recent.map((l) => l.id);
    if (resolvedIds.length) {
      await base44.entities.AgentLog.bulkUpdate(resolvedIds.map((id) => ({ id, resolved: true })));
    }

    await base44.entities.AgentLog.create({
      agent_name: "ReguShield",
      level: findings.length ? "warn" : "success",
      category: "compliance_audit",
      message: `Compliance audit complete — ${findings.length} finding(s), ${resolvedIds.length} log(s) reviewed and resolved.`,
      detail: report.summary,
    });

    return Response.json({
      status: "ok",
      reviewed: resolvedIds.length,
      findings: findings.length,
      enhancements_created: created.length,
      clean: report.clean,
      summary: report.summary,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}