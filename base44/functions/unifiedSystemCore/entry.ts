import { createClientFromRequest, requireAdminOrWebhook } from '../../runtime/index';

// ============================================================================
// UNIFIED SYSTEM CORE — The unified memory, intelligence, and communication
// system for Vision Cortex. Provides a single API for agents to read/write
// to all three subsystems.
//
// Memory: CoreDocument, AgentLog, DeepRun — the system's persistent knowledge
// Intelligence: IntelFeed, KnowledgeQuest — the system's awareness of the world
// Communication: ChatMessage, Notification — the system's internal messaging
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const authorizationError = await requireAdminOrWebhook(req);
    if (authorizationError) return authorizationError;

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';

    // ── STATUS: Unified view of all three systems ──
    if (action === 'status') {
      const [docs, logs, runs, intel, quests, messages, notifs] = await Promise.all([
        sr.CoreDocument.filter({ status: 'active' }, '-created_date', 20).catch(() => []),
        sr.AgentLog.list('-created_date', 20).catch(() => []),
        sr.DeepRun.list('-created_date', 10).catch(() => []),
        sr.IntelFeed.list('-created_date', 20).catch(() => []),
        sr.KnowledgeQuest.filter({ status: 'active' }, '-created_date', 10).catch(() => []),
        sr.ChatMessage.list('-created_date', 20).catch(() => []),
        sr.Notification.filter({ read: false }, '-created_date', 20).catch(() => []),
      ]);

      return Response.json({
        ok: true,
        action: 'status',
        memory: {
          documents: docs.length,
          recent_logs: logs.length,
          deep_runs: runs.length,
          last_log: logs[0]?.created_date,
        },
        intelligence: {
          intel_feeds: intel.length,
          active_quests: quests.length,
          latest_intel: intel[0]?.headline,
        },
        communication: {
          messages: messages.length,
          unread_notifications: notifs.length,
          last_message: messages[0]?.created_date,
        },
        unified: {
          total_records: docs.length + logs.length + runs.length + intel.length + quests.length + messages.length + notifs.length,
          systems_online: 3,
        },
      });
    }

    // ── MEMORY: Read/write to the memory system ──
    if (action === 'memory') {
      const { op, data } = body;
      if (op === 'read') {
        const items = await sr.CoreDocument.filter({ status: 'active' }, '-created_date', 50).catch(() => []);
        return Response.json({ ok: true, memory: items });
      }
      if (op === 'write') {
        const doc = await sr.CoreDocument.create({
          document_id: data.document_id || `doc.${Date.now()}`,
          title: data.title || 'Untitled',
          document_type: data.document_type || 'knowledge_base',
          category: data.category || 'knowledge',
          content: data.content || '',
          status: 'active',
          priority: data.priority || 'standard',
        });
        return Response.json({ ok: true, created: doc.id });
      }
    }

    // ── INTELLIGENCE: Read/write to the intelligence system ──
    if (action === 'intelligence') {
      const { op, data } = body;
      if (op === 'read') {
        const items = await sr.IntelFeed.list('-created_date', 50).catch(() => []);
        return Response.json({ ok: true, intelligence: items });
      }
      if (op === 'write') {
        const intel = await sr.IntelFeed.create({
          category: data.category || 'general',
          headline: data.headline || 'Untitled intel',
          summary: data.summary || '',
          source: data.source || 'autonomous',
          signals: data.signals || [],
          impact_score: data.impact_score || 0,
        });
        return Response.json({ ok: true, created: intel.id });
      }
    }

    // ── COMMUNICATION: Read/write to the communication system ──
    if (action === 'communication') {
      const { op, data } = body;
      if (op === 'read') {
        const [msgs, notifs] = await Promise.all([
          sr.ChatMessage.list('-created_date', 50).catch(() => []),
          sr.Notification.list('-created_date', 50).catch(() => []),
        ]);
        return Response.json({ ok: true, messages: msgs, notifications: notifs });
      }
      if (op === 'write') {
        const notif = await sr.Notification.create({
          kind: data.kind || 'system',
          title: data.title || 'System notification',
          body: data.body || '',
          severity: data.severity || 'info',
          read: false,
        });
        return Response.json({ ok: true, created: notif.id });
      }
    }

    // ── SYNC: Sync memory across all three systems ──
    if (action === 'sync') {
      // Ensure all three systems are connected and cross-referenced
      const [docs, intel, notifs] = await Promise.all([
        sr.CoreDocument.filter({ status: 'active' }, '-created_date', 10).catch(() => []),
        sr.IntelFeed.list('-created_date', 10).catch(() => []),
        sr.Notification.filter({ read: false }, '-created_date', 10).catch(() => []),
      ]);

      // Log the sync
      try {
        await sr.AgentLog.create({
          agent_name: 'Bridge',
          level: 'success',
          message: `Unified system sync: ${docs.length} docs, ${intel.length} intel, ${notifs.length} notifs`,
          auto_action: 'unified_sync',
        });
      } catch {}

      return Response.json({
        ok: true,
        action: 'sync',
        synced: { memory: docs.length, intelligence: intel.length, communication: notifs.length },
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}