import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// shadowScheduleMilestones — creates Google Calendar events for the critical
// deadlines and launch milestones of a Shadow-launched project. Schedules:
//   1. Build kickoff (today)
//   2. Launch date (based on time_to_launch_days)
//   3. First revenue checkpoint (launch + 30 days)
//   4. Scale milestone (launch + 90 days)
//   5. Quarterly review (launch + 120 days)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const queueId = body.queue_id;

    if (!queueId) return Response.json({ error: 'queue_id required' }, { status: 400 });

    const queueItem = await base44.entities.BuildQueue.get(queueId).catch(() => null);
    if (!queueItem) return Response.json({ error: 'Build queue entry not found' }, { status: 404 });

    // Get Google Calendar connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const businessName = queueItem.business_name || queueItem.title;

    // Parse time_to_launch from related intel or default to 14 days
    const intel = await base44.entities.IntelFeed.filter(
      { source: 'Shadow Money Hunt' },
      '-created_date',
      10
    ).catch(() => []);
    const relatedIntel = intel.find((i) =>
      i.headline?.toLowerCase().includes((businessName || '').toLowerCase().slice(0, 15))
    );

    let launchDays = 14;
    const match = relatedIntel?.summary?.match(/\[(?:TIME TO LAUNCH|TTL)\]\s*(\d+)/i);
    if (match) launchDays = parseInt(match[1]) || 14;

    const now = new Date();
    const launchDate = new Date(now.getTime() + launchDays * 24 * 60 * 60 * 1000);
    const firstRevenue = new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const scaleMilestone = new Date(launchDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const quarterlyReview = new Date(launchDate.getTime() + 120 * 24 * 60 * 60 * 1000);

    const milestones = [
      {
        summary: `🚀 ${businessName} — Build Kickoff`,
        date: now,
        description: `Shadow agent project build kickoff. Queue ID: ${queueItem.id}. Industry: ${queueItem.industry || 'N/A'}. Assigned: ${queueItem.assigned_agent || 'Shadow'}.`,
      },
      {
        summary: `🎯 ${businessName} — Launch Day`,
        date: launchDate,
        description: `Target launch date for ${businessName}. Verify deployment, test checkout flow, and confirm Stripe integration is live.`,
      },
      {
        summary: `💰 ${businessName} — First Revenue Checkpoint`,
        date: firstRevenue,
        description: `30 days post-launch. Verify Stripe revenue, check conversion rates, and assess if the system is generating income as projected.`,
      },
      {
        summary: `📈 ${businessName} — Scale Milestone`,
        date: scaleMilestone,
        description: `90 days post-launch. Evaluate scaling opportunities, optimize marketing, and assess expanding the system's reach.`,
      },
      {
        summary: `🔍 ${businessName} — Quarterly Review`,
        date: quarterlyReview,
        description: `120 days post-launch. Full performance review. Decide: double down, pivot, or sunset. Compare actual revenue vs. Shadow's projection.`,
      },
    ];

    const createdEvents = [];

    for (const m of milestones) {
      const eventBody = {
        summary: m.summary,
        description: m.description,
        start: {
          dateTime: m.date.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: new Date(m.date.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
        metadata: {
          base44_app_id: process.env.BASE44_APP_ID || '',
          shadow_queue_id: queueItem.id,
        },
      };

      const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(eventBody),
      });

      if (eventRes.ok) {
        const eventData = await eventRes.json();
        createdEvents.push({
          id: eventData.id,
          summary: eventData.summary,
          html_link: eventData.htmlLink,
          start: eventData.start?.dateTime,
        });
      }
    }

    // Update the BuildQueue entry with calendar event IDs
    await base44.entities.BuildQueue.update(queueId, {
      logs: [...(queueItem.logs || []), `[${new Date().toISOString()}] Scheduled ${createdEvents.length} calendar milestones`],
    });

    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'success',
      category: 'calendar',
      message: `Scheduled ${createdEvents.length} milestones for "${businessName}" on Google Calendar. Launch in ${launchDays} days.`,
    });

    return Response.json({
      scheduled: true,
      business_name: businessName,
      launch_days: launchDays,
      events: createdEvents,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}