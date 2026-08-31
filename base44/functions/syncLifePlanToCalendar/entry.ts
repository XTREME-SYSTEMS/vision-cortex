import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// syncLifePlanToCalendar — pushes the Life Plan's milestones into the user's own
// Google Calendar as all-day events (APP_USER mode — each user connects their own
// calendar). Each event carries the milestone label, target net worth, and the
// simulated event. Stores the created event IDs on the plan so re-syncs can update
// rather than duplicate.

const CONNECTOR_ID = '69ddcb305a599e0b4a1b3cff'; // workspace googlecalendar connector (APP_USER)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const planId = body.life_plan_id;
    if (!planId) return Response.json({ error: 'life_plan_id required' }, { status: 400 });

    const plan = await base44.entities.LifePlan.get(planId).catch(() => null);
    if (!plan) return Response.json({ error: 'Life plan not found' }, { status: 404 });

    // Get the current app user's Google Calendar connection.
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn?.accessToken;
    } catch {
      return Response.json({ error: 'Google Calendar not connected. Connect it in the Accountability panel first.', needs_connect: true }, { status: 412 });
    }
    if (!accessToken) return Response.json({ error: 'No access token', needs_connect: true }, { status: 412 });

    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const eventIds = Array.isArray(plan.calendar_event_ids) ? [...plan.calendar_event_ids] : [];

    // Create an all-day event for each milestone.
    for (const m of (plan.milestones || [])) {
      const endISO = new Date(new Date(m.date).getTime() + 86400000).toISOString().slice(0, 10);
      const ev = {
        summary: `🎯 ${m.label} — target ${m.target_net_worth >= 0 ? '$' : '-$'}${Math.abs(m.target_net_worth).toLocaleString()}`,
        description: `${m.event || 'Milestone checkpoint'}\n\nStrategy: ${plan.strategy?.title || ''}\nVision: ${plan.vision || ''}\nRange: $${(m.target_p10||0).toLocaleString()} → $${(m.target_p90||0).toLocaleString()}`,
        start: { date: m.date },
        end: { date: endISO },
        colorId: m.target_net_worth < 0 ? '11' : '10',
      };
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST', headers, body: JSON.stringify(ev),
      });
      const created = await res.json();
      if (created?.id) eventIds.push(created.id);
    }

    await base44.entities.LifePlan.update(planId, { calendar_synced: true, calendar_event_ids: eventIds });

    return Response.json({ synced: true, event_count: eventIds.length, calendar_event_ids: eventIds });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}