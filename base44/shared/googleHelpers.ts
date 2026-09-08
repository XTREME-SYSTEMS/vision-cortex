// ============================================================================
// googleHelpers.ts — Shared helpers for Google Calendar + Tasks API calls
// Used by edenSkyeScheduler and any function that needs Google integration
// ============================================================================

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
const TASKS_BASE = 'https://tasks.googleapis.com/tasks/v1';

export async function getGoogleToken(base44, integrationType: string): Promise<string> {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection(integrationType);
  if (!accessToken) throw new Error(`No ${integrationType} connection found`);
  return accessToken;
}

// ── CALENDAR ──────────────────────────────────────────────

export async function listCalendarEvents(token: string, opts: any = {}) {
  const params = new URLSearchParams({
    maxResults: String(opts.maxResults || 50),
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: opts.timeMin || new Date().toISOString(),
  });
  if (opts.timeMax) params.set('timeMax', opts.timeMax);
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Calendar list failed: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent(token: string, event: any) {
  const body: any = {
    summary: event.summary,
    description: event.description || '',
    start: event.start,
    end: event.end,
    location: event.location || '',
    conferenceData: event.addMeet ? {
      createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
    } : undefined,
  };
  if (event.attendees && event.attendees.length > 0) {
    body.attendees = event.attendees.map((a: string) => ({ email: a }));
  }
  if (event.reminders) {
    body.reminders = event.reminders;
  } else {
    body.reminders = { useDefault: true };
  }

  const params = new URLSearchParams({ sendUpdates: event.sendUpdates || 'all' });
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events?${params}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Calendar create failed: ${await res.text()}`);
  return await res.json();
}

export async function updateCalendarEvent(token: string, eventId: string, updates: any) {
  const params = new URLSearchParams({ sendUpdates: updates.sendUpdates || 'all' });
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}?${params}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Calendar update failed: ${await res.text()}`);
  return await res.json();
}

export async function deleteCalendarEvent(token: string, eventId: string, sendUpdates = 'all') {
  const params = new URLSearchParams({ sendUpdates });
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}?${params}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Calendar delete failed: ${await res.text()}`);
  return { ok: true };
}

// ── TASKS ──────────────────────────────────────────────────

export async function listTaskLists(token: string) {
  const res = await fetch(`${TASKS_BASE}/users/@me/lists`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Task lists failed: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

export async function getOrCreateTaskList(token: string, title: string): Promise<string> {
  const lists = await listTaskLists(token);
  const existing = lists.find((l: any) => l.title === title);
  if (existing) return existing.id;
  const res = await fetch(`${TASKS_BASE}/users/@me/lists`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Task list create failed: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function createTask(token: string, taskListId: string, task: any) {
  const body: any = {
    title: task.title,
    notes: task.notes || '',
    due: task.due || undefined,
  };
  if (task.parent) body.parent = task.parent;
  const res = await fetch(`${TASKS_BASE}/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Task create failed: ${await res.text()}`);
  return await res.json();
}

export async function listTasks(token: string, taskListId: string, opts: any = {}) {
  const params = new URLSearchParams({
    maxResults: String(opts.maxResults || 100),
    showCompleted: String(opts.showCompleted || false),
  });
  if (opts.completedMin) params.set('completedMin', opts.completedMin);
  const res = await fetch(`${TASKS_BASE}/lists/${taskListId}/tasks?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Task list failed: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

export async function updateTask(token: string, taskListId: string, taskId: string, updates: any) {
  const res = await fetch(`${TASKS_BASE}/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Task update failed: ${await res.text()}`);
  return await res.json();
}

export async function completeTask(token: string, taskListId: string, taskId: string) {
  return updateTask(token, taskListId, taskId, { status: 'completed' });
}