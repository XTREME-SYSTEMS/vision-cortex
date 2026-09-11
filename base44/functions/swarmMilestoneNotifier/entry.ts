import { createClientFromRequest, requireAdminOrWebhook } from '../../runtime/index';

// ============================================================================
// SWARM MILESTONE NOTIFIER — Checks for completed swarm cluster milestones
// and sends email summaries to the owner when a cluster completes a major
// objective (e.g., all tasks in a playbook phase are done).
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin user OR workflow context
    const authorizationError = await requireAdminOrWebhook(req);
    if (authorizationError) return authorizationError;

    const sr = base44.asServiceRole.entities;

    // Get company orchestrator status
    const status = await base44.functions.invoke('companyOrchestrator', { action: 'status' }).catch(() => null);
    if (!status || !status.phases) {
      return Response.json({ ok: true, checked: 0, notified: 0, message: 'No status available' });
    }

    // Get the owner's email
    let ownerEmail = '';
    try {
      const users = await sr.User.list('-created_date', 10).catch(() => []);
      ownerEmail = users.find(u => u.role === 'admin')?.email || '';
    } catch {}

    // Check for completed phases that haven't been notified yet
    const phases = status.phases || {};
    const notified = [];

    for (const [phaseId, phaseData] of Object.entries(phases)) {
      // A milestone is when all tasks in a phase are completed
      if (phaseData.total > 0 && phaseData.completed === phaseData.total) {
        // Check if we've already notified about this phase completion
        const existingNotifs = await sr.Notification.filter({
          kind: 'gate',
          title: `Phase Complete: ${phaseId}`
        }, '-created_date', 1).catch(() => []);

        if (existingNotifs.length > 0) continue;

        // Get the agents that worked on this phase
        const phaseSchedules = await sr.AgentSchedule.filter({
          playbook_phase: phaseId
        }, '-created_date', 50).catch(() => []);

        const agentNames = [...new Set(phaseSchedules.map(s => s.agent_name))];
        const totalInf = phaseSchedules.reduce((s, t) => s + (t.payment_amount || 0), 0);

        // Send email notification
        if (ownerEmail) {
          const subject = `[Vision Cortex] Milestone: Phase "${phaseId.replace(/_/g, ' ')}" Complete`;
          const emailBody = `A swarm cluster has completed a major objective.\n\n` +
            `Phase: ${phaseId.replace(/_/g, ' ')}\n` +
            `Tasks Completed: ${phaseData.completed}/${phaseData.total}\n` +
            `Agents Involved: ${agentNames.join(', ')}\n` +
            `Total INF Earned: ${totalInf}\n\n` +
            `The swarm is ready to proceed to the next phase.`;

          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: ownerEmail,
              subject,
              body: emailBody
            });
          } catch (e) {}
        }

        // Create notification record to track that we've notified
        try {
          await sr.Notification.create({
            kind: 'gate',
            title: `Phase Complete: ${phaseId}`,
            body: `Phase ${phaseId} completed: ${phaseData.completed}/${phaseData.total} tasks done by ${agentNames.length} agents (${totalInf} INF earned)`,
            severity: 'info',
            read: false,
          });
        } catch (e) {}

        notified.push({
          phase: phaseId,
          completed: phaseData.completed,
          total: phaseData.total,
          agents: agentNames.length,
          inf_earned: totalInf
        });
      }
    }

    return Response.json({
      ok: true,
      checked: Object.keys(phases).length,
      notified: notified.length,
      milestones: notified
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}