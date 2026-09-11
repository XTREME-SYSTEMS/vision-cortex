import { createClientFromRequest } from '../../runtime/index';
import {
  getGoogleToken, listCalendarEvents, createCalendarEvent, updateCalendarEvent,
  deleteCalendarEvent, getOrCreateTaskList, createTask, listTasks, updateTask, completeTask,
} from "../../shared/googleHelpers.ts";

// ============================================================================
// edenSkyeScheduler — Eden Skye's Google Calendar + Tasks integration
// Schedules consultations, sends invitations, creates follow-up tasks,
// manages appointments for contractors and leads
// ============================================================================

const TASK_LIST_TITLE = 'Vision Cortex Outreach';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'list_events' } = body;

    const calToken = await getGoogleToken(base44, 'googlecalendar');
    const taskToken = await getGoogleToken(base44, 'googletasks');

    switch (action) {

      // ── LIST CALENDAR EVENTS ────────────────────────────────
      case 'list_events': {
        const { max_results = 50, time_max } = body;
        const events = await listCalendarEvents(calToken, {
          maxResults: max_results,
          timeMax: time_max,
        });
        return Response.json({
          ok: true,
          events: events.map((e: any) => ({
            id: e.id,
            summary: e.summary,
            start: e.start,
            end: e.end,
            attendees: (e.attendees || []).map((a: any) => ({ email: a.email, name: a.displayName, status: a.responseStatus })),
            location: e.location,
            hangoutLink: e.hangoutLink,
            htmlLink: e.htmlLink,
            status: e.status,
          })),
        });
      }

      // ── SCHEDULE CONSULTATION (create event + invite + task) ──
      case 'schedule_consultation': {
        const { contact_id, contact_name, contact_email, contact_phone, company, industry, scheduled_time, duration_minutes = 30, notes, campaign_id, add_meet = true } = body;

        if (!scheduled_time || !contact_name) {
          return Response.json({ error: 'scheduled_time and contact_name required' }, { status: 400 });
        }

        const start = new Date(scheduled_time);
        const end = new Date(start.getTime() + duration_minutes * 60000);

        const event = await createCalendarEvent(calToken, {
          summary: `Consultation — ${contact_name}${company ? ` (${company})` : ''}`,
          description: `Industry: ${industry || 'N/A'}\nPhone: ${contact_phone || 'N/A'}\nNotes: ${notes || ''}\n\nScheduled by Eden Skye via Vision Cortex Outreach Engine.`,
          start: { dateTime: start.toISOString(), timeZone: 'America/New_York' },
          end: { dateTime: end.toISOString(), timeZone: 'America/New_York' },
          attendees: contact_email ? [contact_email] : [],
          addMeet,
          sendUpdates: 'all',
        });

        // Create a follow-up task in Google Tasks
        const taskListId = await getOrCreateTaskList(taskToken, TASK_LIST_TITLE);
        const task = await createTask(taskToken, taskListId, {
          title: `Follow up with ${contact_name} (${company || industry || 'lead'})`,
          notes: `Consultation scheduled for ${start.toISOString()}. Contact: ${contact_phone || contact_email || 'N/A'}. Notes: ${notes || ''}`,
          due: new Date(start.getTime() + 86400000).toISOString(), // Due 1 day after consultation
        });

        // Update CRM contact if provided
        if (contact_id) {
          const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
          if (contact) {
            await base44.entities.XtremeCrmContact.update(contact_id, {
              lifecycle_stage: 'qualified',
              last_contacted_at: new Date().toISOString(),
              enrichment_data: {
                ...(contact.enrichment_data || {}),
                consultation: {
                  event_id: event.id,
                  hangout_link: event.hangoutLink,
                  scheduled_time: start.toISOString(),
                  duration_minutes,
                  task_id: task.id,
                  scheduled_by: 'eden_skye',
                },
              },
            });
          }
        }

        // Update campaign if provided
        if (campaign_id) {
          const campaign = await base44.entities.OutreachCampaign.get(campaign_id).catch(() => null);
          if (campaign) {
            await base44.entities.OutreachCampaign.update(campaign_id, {
              consultations_scheduled: (campaign.consultations_scheduled || 0) + 1,
            });
          }
        }

        return Response.json({
          ok: true,
          event_id: event.id,
          hangout_link: event.hangoutLink,
          html_link: event.htmlLink,
          task_id: task.id,
          start: start.toISOString(),
          end: end.toISOString(),
        });
      }

      // ── CREATE TASK ──────────────────────────────────────────
      case 'create_task': {
        const { title, notes, due, contact_id, campaign_id } = body;
        if (!title) return Response.json({ error: 'title required' }, { status: 400 });

        const taskListId = await getOrCreateTaskList(taskToken, TASK_LIST_TITLE);
        const task = await createTask(taskToken, taskListId, {
          title,
          notes: notes || '',
          due: due || undefined,
        });

        // Link to contact/campaign if provided
        if (contact_id) {
          const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
          if (contact) {
            await base44.entities.XtremeCrmContact.update(contact_id, {
              enrichment_data: {
                ...(contact.enrichment_data || {}),
                last_task: { id: task.id, title, created_at: new Date().toISOString() },
              },
            });
          }
        }

        return Response.json({ ok: true, task_id: task.id, title });
      }

      // ── LIST TASKS ───────────────────────────────────────────
      case 'list_tasks': {
        const { show_completed = false } = body;
        const taskListId = await getOrCreateTaskList(taskToken, TASK_LIST_TITLE);
        const tasks = await listTasks(taskToken, taskListId, { showCompleted: show_completed });
        return Response.json({
          ok: true,
          tasks: tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            notes: t.notes,
            status: t.status,
            due: t.due,
            completed: t.completed,
          })),
        });
      }

      // ── COMPLETE TASK ────────────────────────────────────────
      case 'complete_task': {
        const { task_id } = body;
        if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 });
        const taskListId = await getOrCreateTaskList(taskToken, TASK_LIST_TITLE);
        await completeTask(taskToken, taskListId, task_id);
        return Response.json({ ok: true, task_id });
      }

      // ── CANCEL / RESCHEDULE CONSULTATION ────────────────────
      case 'cancel_consultation': {
        const { event_id, contact_id, reason } = body;
        if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

        await deleteCalendarEvent(calToken, event_id, 'all');

        if (contact_id) {
          const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
          if (contact) {
            await base44.entities.XtremeCrmContact.update(contact_id, {
              enrichment_data: {
                ...(contact.enrichment_data || {}),
                consultation_cancelled: { event_id, reason, at: new Date().toISOString() },
              },
            });
          }
        }

        return Response.json({ ok: true, event_id, cancelled: true });
      }

      case 'reschedule_consultation': {
        const { event_id, new_time, duration_minutes = 30, contact_id } = body;
        if (!event_id || !new_time) return Response.json({ error: 'event_id and new_time required' }, { status: 400 });

        const start = new Date(new_time);
        const end = new Date(start.getTime() + duration_minutes * 60000);

        const updated = await updateCalendarEvent(calToken, event_id, {
          start: { dateTime: start.toISOString(), timeZone: 'America/New_York' },
          end: { dateTime: end.toISOString(), timeZone: 'America/New_York' },
          sendUpdates: 'all',
        });

        if (contact_id) {
          const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
          if (contact) {
            await base44.entities.XtremeCrmContact.update(contact_id, {
              enrichment_data: {
                ...(contact.enrichment_data || {}),
                consultation: {
                  ...(contact.enrichment_data?.consultation || {}),
                  event_id: updated.id,
                  scheduled_time: start.toISOString(),
                  rescheduled_at: new Date().toISOString(),
                },
              },
            });
          }
        }

        return Response.json({ ok: true, event_id: updated.id, new_start: start.toISOString() });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}