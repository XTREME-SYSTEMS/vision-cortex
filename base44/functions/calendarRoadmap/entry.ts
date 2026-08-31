import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// calendarRoadmap — fetches the app user's upcoming Google Calendar events
// (their daily routine) so the roadmap view can show milestones alongside
// real calendar commitments. APP_USER mode — each user connects their own
// calendar. Returns { connected, events } or { connected: false, needs_connect }.

const CONNECTOR_ID = '69ddcb305a599e0b4a1b3cff'; // workspace googlecalendar (APP_USER)

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const daysAhead = body.days || 365;

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn?.accessToken;
    } catch {
      return Response.json({ connected: false, needs_connect: true, events: [] });
    }
    if (!accessToken) return Response.json({ connected: false, needs_connect: true, events: [] });

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return Response.json({ connected: false, needs_connect: true, events: [], error: `Calendar API error: ${res.status}` }, { status: 412 });
    }
    const data = await res.json();

    const events = (data.items || []).map((ev) => ({
      id: ev.id,
      summary: ev.summary || '(untitled)',
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      all_day: !!ev.start?.date,
      location: ev.location || null,
    })).filter((e) => e.start);

    return Response.json({ connected: true, events });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}