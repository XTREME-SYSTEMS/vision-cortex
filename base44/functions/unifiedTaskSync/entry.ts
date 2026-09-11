import { createClientFromRequest } from '../../runtime/index';

// ============================================================================
// UNIFIED TASK SYNC — Syncs all gaps, fixes, heals, hardens, optimizes,
// enhancements, and audit items to Google Tasks AND Google Calendar.
// Every task gets a validator (VALIDATOR agent) assigned.
// ============================================================================

const VALIDATOR_AGENT = 'VALIDATOR';

const CATEGORY_FROM_TITLE = (title) => {
  if (title.startsWith('AUDIT') || title.startsWith('ANALYZE')) return 'audit';
  if (title.startsWith('FIX')) return 'fix';
  if (title.startsWith('HEAL')) return 'harden';
  if (title.startsWith('HARDEN')) return 'harden';
  if (title.startsWith('OPTIMIZE')) return 'optimize';
  if (title.startsWith('ENHANCE')) return 'optimize';
  return 'audit';
};

const AGENT_FOR_CATEGORY = (cat) => ({
  audit: 'Alpha-Inquisitor',
  fix: 'Forge-Smith',
  harden: 'Aegis-Sentinel',
  optimize: 'Omni-Architect',
  heal: 'Sentinel',
}[cat] || 'Alpha-Inquisitor');

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync_all';

    if (action === 'sync_all') {
      // 1. Gather all items that need tasks
      const [dnaGaps, systemGaps, enhancements, auditNotifs] = await Promise.all([
        sr.SystemDNA_Gap.filter({ status: 'open' }, '-severity', 100).catch(() => []),
        sr.SystemGap.filter({ status: 'open' }, '-created_date', 100).catch(() => []),
        sr.SystemEnhancement.filter({ status: { $in: ['pending', 'in_progress', 'approved'] } }, '-created_date', 100).catch(() => []),
        sr.Notification.filter({ kind: 'gate', read: false }, '-created_date', 100).catch(() => []),
      ]);

      let tasksCreated = 0;

      // Helper to create a task if it doesn't already exist
      const createTask = async (title, description, category, priority, agent, systemTarget) => {
        const existing = await sr.AgentSchedule.filter({ task_title: title, status: { $in: ['scheduled', 'in_progress'] } }, '-created_date', 1).catch(() => []);
        if (existing[0]) return null;
        try {
          return await sr.AgentSchedule.create({
            agent_name: agent,
            task_title: title,
            task_description: `${description}\n\nValidator: ${VALIDATOR_AGENT}`,
            task_category: category,
            playbook_phase: category === 'audit' ? '1_audit' : category === 'fix' ? '2_fix' : category === 'harden' ? '3_harden' : '7_build_systems',
            status: 'scheduled',
            priority,
            scheduled_start: new Date().toISOString(),
            scheduled_end: new Date(Date.now() + 3600000).toISOString(),
            progress: 0,
            payment_amount: 100,
            system_target: systemTarget || 'vision_cortex',
          });
        } catch { return null; }
      };

      // SystemDNA_Gaps
      for (const gap of dnaGaps) {
        const cat = gap.severity === 'P0' ? 'fix' : gap.category?.includes('security') ? 'harden' : 'audit';
        const title = `${cat.toUpperCase()}: ${gap.title || gap.description || 'DNA Gap'}`;
        const t = await createTask(title, gap.description || gap.title || 'System DNA gap', cat, gap.severity === 'P0' ? 1 : 2, AGENT_FOR_CATEGORY(cat), 'vision_cortex');
        if (t) tasksCreated++;
      }

      // SystemGaps
      for (const gap of systemGaps) {
        const cat = 'fix';
        const title = `FIX: ${gap.title || gap.description || 'System Gap'}`;
        const t = await createTask(title, gap.description || gap.title || 'System gap requires fixing', cat, gap.severity === 'critical' ? 1 : 2, 'Forge-Smith', 'vision_cortex');
        if (t) tasksCreated++;
      }

      // SystemEnhancements
      for (const enh of enhancements) {
        const cat = 'optimize';
        const title = `ENHANCE: ${enh.title || 'System Enhancement'}`;
        const t = await createTask(title, enh.description || enh.title || 'System enhancement', cat, 3, 'Omni-Architect', 'vision_cortex');
        if (t) tasksCreated++;
      }

      // Audit notifications
      for (const notif of auditNotifs) {
        const agent = notif.body?.match(/Agent:\s*(.+)/)?.[1]?.trim() || 'Alpha-Inquisitor';
        const cat = CATEGORY_FROM_TITLE(notif.title);
        const t = await createTask(notif.title, notif.body || 'Audit item requires attention', cat, notif.severity === 'critical' ? 1 : 2, agent, 'vision_cortex');
        if (t) tasksCreated++;
      }

      // 2. Sync all unsynced scheduled tasks to Google Tasks
      let tasksSynced = 0;
      let tasksError = null;
      try {
        const tasksResult = await syncToGoogleTasks(base44, sr);
        tasksSynced = tasksResult.synced || 0;
        if (tasksResult.error) tasksError = tasksResult.error;
      } catch (e) { tasksError = e.message; }

      // 3. Sync all unsynced scheduled tasks to Google Calendar
      let calendarSynced = 0;
      let calendarError = null;
      try {
        const calResult = await syncToGoogleCalendar(base44, sr);
        calendarSynced = calResult.synced || 0;
        if (calResult.error) calendarError = calResult.error;
      } catch (e) { calendarError = e.message; }

      return Response.json({
        ok: true,
        action: 'sync_all',
        tasks_created: tasksCreated,
        tasks_synced_to_google: tasksSynced,
        calendar_events_created: calendarSynced,
        google_tasks_error: tasksError,
        google_calendar_error: calendarError,
        sources: {
          dna_gaps: dnaGaps.length,
          system_gaps: systemGaps.length,
          enhancements: enhancements.length,
          audit_notifications: auditNotifs.length,
        },
        validator: VALIDATOR_AGENT,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: Sync unsynced scheduled tasks to Google Tasks ──
async function syncToGoogleTasks(base44, sr) {
  const allScheduled = await sr.AgentSchedule.filter({ status: 'scheduled' }, '-priority', 100).catch(() => []);
  const schedules = allScheduled.filter(s => !s.google_task_id);
  if (schedules.length === 0) return { synced: 0 };

  let tasksConn;
  try {
    tasksConn = await base44.asServiceRole.connectors.getConnection('googletasks');
  } catch { return { synced: 0, error: 'Google Tasks not connected' }; }
  const accessToken = tasksConn.accessToken;
  const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // Find or create task list
  let taskListId = '';
  try {
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (listsRes.ok) {
      const listsData = await listsRes.json();
      const existing = listsData.items?.find(l => l.title === 'Vision Cortex Tasks');
      if (existing) taskListId = existing.id;
    }
  } catch {}
  if (!taskListId) {
    try {
      const createRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        method: 'POST', headers: authHeader, body: JSON.stringify({ title: 'Vision Cortex Tasks' })
      });
      if (createRes.ok) taskListId = (await createRes.json()).id;
    } catch {}
  }
  if (!taskListId) return { synced: 0, error: 'Failed to create task list' };

  let synced = 0;
  for (const task of schedules.slice(0, 40)) {
    try {
      const dueDate = task.scheduled_end || task.scheduled_start;
      const taskBody = {
        title: `[${task.agent_name}] ${task.task_title}`,
        notes: `${task.task_description || ''}\n\nValidator: ${VALIDATOR_AGENT}\nCategory: ${task.task_category}\nPriority: ${task.priority}\nSystem: ${task.system_target || 'vision_cortex'}`,
        due: dueDate ? new Date(dueDate).toISOString() : undefined,
        status: 'needsAction'
      };
      const createRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: 'POST', headers: authHeader, body: JSON.stringify(taskBody)
      });
      if (createRes.ok) {
        const created = await createRes.json();
        await sr.AgentSchedule.update(task.id, { google_task_id: created.id, task_list_id: taskListId });
        synced++;
      }
    } catch {}
  }
  return { synced, task_list_id: taskListId };
}

// ── Helper: Sync unsynced scheduled tasks to Google Calendar ──
async function syncToGoogleCalendar(base44, sr) {
  const allScheduled = await sr.AgentSchedule.filter({ status: 'scheduled' }, '-priority', 100).catch(() => []);
  const schedules = allScheduled.filter(s => !s.calendar_event_id);
  if (schedules.length === 0) return { synced: 0 };

  let calConn;
  try {
    calConn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  } catch { return { synced: 0, error: 'Google Calendar not connected' }; }
  const accessToken = calConn.accessToken;

  let synced = 0;
  for (const task of schedules.slice(0, 30)) {
    try {
      const event = {
        summary: `[${task.agent_name}] ${task.task_title}`,
        description: `${task.task_description || ''}\n\nValidator: ${VALIDATOR_AGENT}\nCategory: ${task.task_category}\nPriority: ${task.priority}`,
        start: { dateTime: task.scheduled_start },
        end: { dateTime: task.scheduled_end },
        colorId: task.task_category === 'audit' ? '11' : task.task_category === 'fix' ? '5' : task.task_category === 'harden' ? '4' : '1'
      };
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      if (res.ok) {
        const data = await res.json();
        await sr.AgentSchedule.update(task.id, { calendar_event_id: data.id, calendar_event_url: data.htmlLink });
        synced++;
      }
    } catch {}
  }
  return { synced };
}