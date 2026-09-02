import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// enhancementApprover — governed approval gate for the SystemEnhancement pipeline.
// Audited plans (status='audited') are plans that passed the Fortress Engineer audit
// but sit with no build dispatch. This function auto-approves SAFE, reversible items
// (feature / optimization / healing / doctrine) that scored >= APPROVE_THRESHOLD,
// and leaves hardening / integration / security items as 'audited' for manual review
// (spec §46: protected approval for security/infra/irreversible changes).
// Every auto-approval writes an AgentLog audit trail.

const APPROVE_THRESHOLD = 80;
const SAFE_CATEGORIES = ['feature', 'optimization', 'healing', 'doctrine'];
const GATED_CATEGORIES = ['hardening', 'integration'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();
    const runId = 'approver_' + Date.now();

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    // Fetch all audited enhancements (terminal plans awaiting dispatch).
    const audited = await sr.entities.SystemEnhancement.filter({ status: 'audited' }, '-priority', 200);
    const list = Array.isArray(audited) ? audited : (audited.items ?? []);

    const approved = [];
    const gated = [];
    const rejected = []; // audited but failed audit / low score

    for (const e of list) {
      const score = e.audit_result?.score ?? 0;
      const passed = e.audit_result?.passed === true;
      const cat = e.category || 'feature';

      if (!passed || score < APPROVE_THRESHOLD) {
        rejected.push({ id: e.id, title: e.title, score, passed });
        continue;
      }

      if (GATED_CATEGORIES.includes(cat)) {
        gated.push({ id: e.id, title: e.title, category: cat, score });
        continue;
      }

      if (SAFE_CATEGORIES.includes(cat)) {
        if (dryRun) {
          approved.push({ id: e.id, title: e.title, category: cat, score });
          continue;
        }
        await sr.entities.SystemEnhancement.update(e.id, {
          status: 'approved',
          approved: true,
          last_action_at: now,
          implementation_notes: (e.implementation_notes || '') + `\n[APPROVED ${runId}] Auto-approved safe gate (cat=${cat}, score=${score}) by ${user.email}.`,
        });
        await sr.entities.AgentLog.create({
          agent_name: 'Approval Gate',
          level: 'info',
          category: 'governance',
          message: `Auto-approved safe enhancement: "${e.title}" (${cat}, score ${score})`,
          detail: JSON.stringify({ runId, enhancement_id: e.id, category: cat, score, approver: user.email }),
          auto_action: 'enhancementApprover',
        }).catch(() => {});
        approved.push({ id: e.id, title: e.title, category: cat, score });
      } else {
        // Unknown category → treat as gated (conservative).
        gated.push({ id: e.id, title: e.title, category: cat, score });
      }
    }

    // Notify owner about gated items needing manual review.
    if (gated.length && !dryRun) {
      await sr.entities.Notification.create({
        kind: 'warning',
        title: `${gated.length} enhancements need manual approval`,
        body: `${gated.length} audited plans are in hardening/integration/unknown categories and require manual approval before build dispatch.`,
        severity: 'warning',
      }).catch(() => {});
    }

    return Response.json({
      status: 'ok',
      run_id: runId,
      dry_run: dryRun,
      audited_total: list.length,
      approved: approved.length,
      gated_manual: gated.length,
      rejected_low_score: rejected.length,
      approved_items: approved,
      gated_items: gated,
      rejected_items: rejected,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}