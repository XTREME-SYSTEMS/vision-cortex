import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Timeclock Manager — tracks agent work time via Google Tasks integration.
// When a task starts: clock_in creates a TimeClockEntry + Google Task.
// When a task completes: clock_out closes the entry, marks Google Task done,
//   calculates duration and payment.
// sync_from_tasks: polls Google Tasks for completed tasks and auto-clocks-out.
// process_payments: pays agents for completed entries.

const TASK_LIST_NAME = 'Vision Cortex Agents';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: cron token OR admin
    const cronToken = req.headers.get('x-cron-token') || '';
    const expectedKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    let authorized = false;
    if (cronToken && expectedKey && cronToken === expectedKey) {
      authorized = true;
    } else {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';
    const sr = base44.asServiceRole;

    // ─── STATUS ─────────────────────────────────────────────────────────
    if (action === 'status') {
      const active = await sr.entities.TimeClockEntry.filter({ status: 'active' }, '-clock_in', 50);
      const recent = await sr.entities.TimeClockEntry.list('-created_date', 100);
      const completed = recent.filter(c => c.status === 'completed');
      const totalMin = completed.reduce((s, c) => s + (c.duration_minutes || 0), 0);
      const totalPay = completed.reduce((s, c) => s + (c.payment_amount || 0), 0);
      const unpaid = completed.filter(c => c.payment_status === 'unpaid' || c.payment_status === 'pending');

      // Per-agent breakdown
      const agentMap = {};
      for (const c of completed) {
        if (!agentMap[c.agent_name]) {
          agentMap[c.agent_name] = { entries: 0, minutes: 0, inf_earned: 0, unpaid: 0 };
        }
        agentMap[c.agent_name].entries++;
        agentMap[c.agent_name].minutes += (c.duration_minutes || 0);
        agentMap[c.agent_name].inf_earned += (c.payment_amount || 0);
        if (c.payment_status === 'unpaid' || c.payment_status === 'pending') {
          agentMap[c.agent_name].unpaid++;
        }
      }

      return Response.json({
        active_count: active.length,
        total_entries: recent.length,
        completed_entries: completed.length,
        total_hours: Math.round((totalMin / 60) * 10) / 10,
        total_inf_payments: totalPay,
        unpaid_count: unpaid.length,
        active_entries: active.map(c => ({
          id: c.id,
          agent_name: c.agent_name,
          task_type: c.task_type,
          clock_in: c.clock_in,
          google_task_id: c.google_task_id || null,
          source: c.source
        })),
        agent_breakdown: Object.entries(agentMap).map(([name, data]) => ({
          agent_name: name,
          entries: data.entries,
          hours: Math.round((data.minutes / 60) * 10) / 10,
          inf_earned: data.inf_earned,
          unpaid_entries: data.unpaid
        }))
      });
    }

    // ─── CLOCK IN ──────────────────────────────────────────────────────
    if (action === 'clock_in') {
      const { agent_name, task_type, task_title, source_page, schedule_id, create_google_task, create_calendar_event } = body;
      if (!agent_name || !task_type) {
        return Response.json({ error: 'agent_name and task_type required' }, { status: 400 });
      }

      // Check for existing active entry for this agent+task
      const existing = await sr.entities.TimeClockEntry.filter({
        agent_name,
        task_type,
        status: 'active'
      }, '-clock_in', 1);
      if (existing.length > 0) {
        return Response.json({
          ok: false,
          message: 'Agent already has an active clock entry for this task type',
          entry_id: existing[0].id
        });
      }

      // Look up task registry for payment info
      const registry = await sr.entities.SystemTaskRegistry.filter({ task_type }, '-created_date', 1);
      const taskReg = registry[0];
      const paymentAmount = taskReg?.payment_amount || 0;

      // Look up agent codename
      const agents = await sr.entities.AgentProfile.filter({ name: agent_name }, '-created_date', 1);
      const agent = agents[0];
      const codename = agent?.codename || '';

      let googleTaskId = null;
      let taskListId = null;
      let calendarEventId = null;

      // Create Google Calendar event for real-time activity tracking
      if (create_calendar_event !== false) {
        try {
          const { accessToken: calToken } = await sr.connectors.getConnection('googlecalendar');
          const eventBody = {
            summary: `[${agent_name}] ${task_title || task_type}`,
            description: `Agent: ${agent_name}${codename ? ' (' + codename + ')' : ''}\nTask type: ${task_type}\nSource: ${source_page || 'system'}\nPayment: ${paymentAmount} INF\n\nAuto-logged by Vision Cortex Timeclock`,
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            colorId: '2'
          };
          const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${calToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(eventBody)
          });
          if (calRes.ok) {
            const calData = await calRes.json();
            calendarEventId = calData.id;
          }
        } catch (e) {
          // Calendar creation failed — continue without it
        }
      }

      // Create Google Task if requested
      if (create_google_task !== false) {
        try {
          const { accessToken } = await sr.connectors.getConnection('googletasks');
          const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

          // Find or create task list
          let listId = '';
          const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (listsRes.ok) {
            const listsData = await listsRes.json();
            const existing_list = listsData.items?.find(l => l.title === TASK_LIST_NAME);
            if (existing_list) listId = existing_list.id;
          }
          if (!listId) {
            const createListRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify({ title: TASK_LIST_NAME })
            });
            if (createListRes.ok) {
              listId = (await createListRes.json()).id;
            }
          }

          if (listId) {
            taskListId = listId;
            const taskRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify({
                title: `[${agent_name}] ${task_title || task_type}`,
                notes: `Task type: ${task_type}\nAgent: ${agent_name}${codename ? ' (' + codename + ')' : ''}\nPayment: ${paymentAmount} INF\nSource: ${source_page || 'system'}\nClock-in: ${new Date().toISOString()}`,
                due: new Date(Date.now() + 3600000).toISOString()
              })
            });
            if (taskRes.ok) {
              googleTaskId = (await taskRes.json()).id;
            }
          }
        } catch (e) {
          // Google Task creation failed — continue without it
        }
      }

      const entry = await sr.entities.TimeClockEntry.create({
        agent_name,
        agent_codename: codename,
        task_type,
        task_registry_id: taskReg?.id || '',
        schedule_id: schedule_id || '',
        google_task_id: googleTaskId || '',
        task_list_id: taskListId || '',
        clock_in: new Date().toISOString(),
        status: 'active',
        payment_amount: paymentAmount,
        payment_status: 'unpaid',
        source: body.source || 'manual',
        source_page: source_page || '',
        calendar_event_id: calendarEventId || ''
      });

      return Response.json({
        ok: true,
        action: 'clock_in',
        entry_id: entry.id,
        agent_name,
        task_type,
        google_task_created: !!googleTaskId,
        google_task_id: googleTaskId,
        calendar_event_created: !!calendarEventId,
        calendar_event_id: calendarEventId,
        payment_amount: paymentAmount
      });
    }

    // ─── CLOCK OUT ─────────────────────────────────────────────────────
    if (action === 'clock_out') {
      const { entry_id, result, mark_google_task_done } = body;
      if (!entry_id) {
        return Response.json({ error: 'entry_id required' }, { status: 400 });
      }

      const entry = await sr.entities.TimeClockEntry.get(entry_id);
      if (!entry) {
        return Response.json({ error: 'Time clock entry not found' }, { status: 404 });
      }
      if (entry.status === 'completed') {
        return Response.json({ ok: false, message: 'Entry already completed' });
      }

      const clockOut = new Date().toISOString();
      const clockIn = new Date(entry.clock_in);
      const durationMin = Math.round((Date.now() - clockIn.getTime()) / 60000);

      // Update Google Calendar event with actual end time
      if (entry.calendar_event_id) {
        try {
          const { accessToken: calToken } = await sr.connectors.getConnection('googlecalendar');
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${entry.calendar_event_id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${calToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              end: { dateTime: clockOut },
              description: `Agent: ${entry.agent_name}\nTask type: ${entry.task_type}\nDuration: ${durationMin} min\nPayment: ${entry.payment_amount} INF\nResult: ${result || 'Completed'}\n\nAuto-logged by Vision Cortex Timeclock`
            })
          });
        } catch (e) {
          // Non-fatal
        }
      }

      // Mark Google Task as done
      if (mark_google_task_done !== false && entry.google_task_id && entry.task_list_id) {
        try {
          const { accessToken } = await sr.connectors.getConnection('googletasks');
          await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${entry.task_list_id}/tasks/${entry.google_task_id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
          });
        } catch (e) {
          // Non-fatal
        }
      }

      const updated = await sr.entities.TimeClockEntry.update(entry_id, {
        clock_out: clockOut,
        duration_minutes: durationMin,
        status: 'completed',
        result: result || 'Task completed',
        payment_status: 'pending'
      });

      // Update agent profile stats
      try {
        const agents = await sr.entities.AgentProfile.filter({ name: entry.agent_name }, '-created_date', 1);
        if (agents[0]) {
          const agent = agents[0];
          await sr.entities.AgentProfile.update(agent.id, {
            tasks_completed: (agent.tasks_completed || 0) + 1,
            inf_balance: (agent.inf_balance || 0) + (entry.payment_amount || 0),
            inf_earned_total: (agent.inf_earned_total || 0) + (entry.payment_amount || 0),
            last_run: clockOut
          });
        }
      } catch (e) {
        // Non-fatal
      }

      // Update task registry stats
      if (entry.task_registry_id) {
        try {
          const taskReg = await sr.entities.SystemTaskRegistry.get(entry.task_registry_id);
          if (taskReg) {
            await sr.entities.SystemTaskRegistry.update(entry.task_registry_id, {
              last_run: clockOut,
              last_status: 'success',
              last_duration_minutes: durationMin,
              run_count: (taskReg.run_count || 0) + 1
            });
          }
        } catch (e) {
          // Non-fatal
        }
      }

      return Response.json({
        ok: true,
        action: 'clock_out',
        entry_id,
        agent_name: entry.agent_name,
        task_type: entry.task_type,
        duration_minutes: durationMin,
        payment_amount: entry.payment_amount || 0,
        payment_status: 'pending',
        google_task_marked_done: mark_google_task_done !== false && !!entry.google_task_id
      });
    }

    // ─── SYNC FROM GOOGLE TASKS ───────────────────────────────────────
    if (action === 'sync_from_tasks') {
      // Poll Google Tasks for completed tasks and auto-clock-out matching entries
      const { accessToken } = await sr.connectors.getConnection('googletasks');
      const authHeader = { 'Authorization': `Bearer ${accessToken}` };

      // Find task list
      let listId = '';
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        const existing = listsData.items?.find(l => l.title === TASK_LIST_NAME);
        if (existing) listId = existing.id;
      }
      if (!listId) {
        return Response.json({ ok: false, message: 'Vision Cortex task list not found in Google Tasks' });
      }

      // Get completed tasks
      const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&maxResults=100`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!tasksRes.ok) {
        return Response.json({ ok: false, error: 'Failed to fetch Google Tasks' });
      }
      const tasksData = await tasksRes.json();
      const completedTasks = (tasksData.items || []).filter(t => t.status === 'completed');

      // Find active time entries with google_task_ids
      const activeEntries = await sr.entities.TimeClockEntry.filter({ status: 'active' }, '-clock_in', 50);
      const entriesWithTasks = activeEntries.filter(e => e.google_task_id);

      let synced = 0;
      for (const task of completedTasks) {
        const matchingEntry = entriesWithTasks.find(e => e.google_task_id === task.id);
        if (matchingEntry) {
          // Auto clock-out
          const completedDate = task.completed ? new Date(task.completed) : new Date();
          const clockIn = new Date(matchingEntry.clock_in);
          const durationMin = Math.max(1, Math.round((completedDate.getTime() - clockIn.getTime()) / 60000));

          await sr.entities.TimeClockEntry.update(matchingEntry.id, {
            clock_out: completedDate.toISOString(),
            duration_minutes: durationMin,
            status: 'completed',
            result: 'Completed via Google Tasks sync',
            payment_status: 'pending'
          });

          // Update agent stats
          try {
            const agents = await sr.entities.AgentProfile.filter({ name: matchingEntry.agent_name }, '-created_date', 1);
            if (agents[0]) {
              const agent = agents[0];
              await sr.entities.AgentProfile.update(agent.id, {
                tasks_completed: (agent.tasks_completed || 0) + 1,
                inf_balance: (agent.inf_balance || 0) + (matchingEntry.payment_amount || 0),
                inf_earned_total: (agent.inf_earned_total || 0) + (matchingEntry.payment_amount || 0),
                last_run: completedDate.toISOString()
              });
            }
          } catch (e) {}

          // Update task registry
          if (matchingEntry.task_registry_id) {
            try {
              const taskReg = await sr.entities.SystemTaskRegistry.get(matchingEntry.task_registry_id);
              if (taskReg) {
                await sr.entities.SystemTaskRegistry.update(matchingEntry.task_registry_id, {
                  last_run: completedDate.toISOString(),
                  last_status: 'success',
                  last_duration_minutes: durationMin,
                  run_count: (taskReg.run_count || 0) + 1
                });
              }
            } catch (e) {}
          }

          synced++;
        }
      }

      return Response.json({
        ok: true,
        action: 'sync_from_tasks',
        completed_tasks_found: completedTasks.length,
        active_entries_checked: entriesWithTasks.length,
        entries_clocked_out: synced
      });
    }

    // ─── PROCESS PAYMENTS ──────────────────────────────────────────────
    if (action === 'process_payments') {
      // Find all pending/unpaid completed entries and mark them as paid
      const pending = await sr.entities.TimeClockEntry.filter({ payment_status: 'pending' }, '-created_date', 100);
      const unpaid = await sr.entities.TimeClockEntry.filter({ payment_status: 'unpaid' }, '-created_date', 100);
      const allPending = [...pending, ...unpaid].filter(e => e.status === 'completed');

      let totalPaid = 0;
      let count = 0;
      const paymentRecords = [];

      for (const entry of allPending) {
        await sr.entities.TimeClockEntry.update(entry.id, { payment_status: 'paid' });
        totalPaid += entry.payment_amount || 0;
        count++;

        // Create AgentPayment record if entity exists
        try {
          await sr.entities.AgentPayment.create({
            agent_name: entry.agent_name,
            agent_codename: entry.agent_codename || '',
            amount: entry.payment_amount || 0,
            currency: 'INF',
            payment_type: 'task_completion',
            task_type: entry.task_type,
            timeclock_entry_id: entry.id,
            status: 'paid',
            paid_at: new Date().toISOString(),
            description: `Payment for ${entry.task_type} (${entry.duration_minutes}m)`
          });
        } catch (e) {
          // AgentPayment entity may not exist — non-fatal
        }

        paymentRecords.push({
          entry_id: entry.id,
          agent_name: entry.agent_name,
          amount: entry.payment_amount || 0,
          task_type: entry.task_type
        });
      }

      return Response.json({
        ok: true,
        action: 'process_payments',
        entries_paid: count,
        total_inf_paid: totalPaid,
        payments: paymentRecords
      });
    }

    // ─── BULK CLOCK IN FROM SCHEDULE ───────────────────────────────────
    if (action === 'clock_in_scheduled') {
      // Find all scheduled AgentSchedule tasks and create timeclock entries for in_progress ones
      const inProgress = await sr.entities.AgentSchedule.filter({ status: 'in_progress' }, '-actual_start', 50);
      let created = 0;
      const results = [];

      for (const sched of inProgress) {
        // Check if already has active timeclock entry
        const existing = await sr.entities.TimeClockEntry.filter({
          schedule_id: sched.id,
          status: 'active'
        }, '-clock_in', 1);
        if (existing.length > 0) continue;

        const entry = await sr.entities.TimeClockEntry.create({
          agent_name: sched.agent_name,
          agent_codename: sched.agent_codename || '',
          task_type: sched.task_category || 'other',
          schedule_id: sched.id,
          clock_in: sched.actual_start || new Date().toISOString(),
          status: 'active',
          payment_amount: sched.payment_amount || 0,
          payment_status: 'unpaid',
          source: 'schedule',
          source_page: 'company'
        });

        results.push({ schedule_id: sched.id, entry_id: entry.id, agent: sched.agent_name });
        created++;
      }

      return Response.json({
        ok: true,
        action: 'clock_in_scheduled',
        entries_created: created,
        results
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}