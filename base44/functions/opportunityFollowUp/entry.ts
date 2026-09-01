import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { str } from '../../shared/cloudBrowser.ts';

// Follow-up email system — runs daily via workflow.
// Sends a friendly follow-up to opportunities that were responded to but not replied to,
// after 3 days, then again after 7 days. Max 2 follow-ups.

const FOLLOW_UP_INTERVAL_DAYS = 3;
const MAX_FOLLOW_UPS = 2;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    // Find all opportunities that have been sent but not closed and haven't hit max follow-ups
    const sentOpps = await base44.asServiceRole.entities.Opportunity.filter(
      { response_status: 'sent' },
      '-created_date',
      50
    );

    const now = new Date();
    let followedUp = 0;
    let skipped = 0;

    for (const opp of sentOpps) {
      try {
        if (opp.follow_up_count >= MAX_FOLLOW_UPS) { skipped++; continue; }
        if (!opp.contact_email) { skipped++; continue; }

        const lastContact = opp.last_follow_up_at ? new Date(opp.last_follow_up_at) : (opp.sent_at ? new Date(opp.sent_at) : null);
        if (!lastContact) { skipped++; continue; }

        const daysSince = (now - lastContact) / (1000 * 60 * 60 * 24);
        if (daysSince < FOLLOW_UP_INTERVAL_DAYS) { skipped++; continue; }

        const followUpNumber = (opp.follow_up_count || 0) + 1;

        // Generate a warm, non-pushy follow-up
        const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Write a short, warm, humanistic follow-up email. This is follow-up #${followUpNumber} (max 2).

Context:
- Original posting: "${opp.title}" — ${str(opp.description, 500)}
- Our first email was sent ${Math.round(daysSince)} days ago
- No response yet

Rules:
- Sound like a real person, NOT a salesperson or a bot
- Be genuinely friendly and low-pressure — no guilt, no urgency tactics
- Acknowledge they're busy
- Offer value, not just a "just checking in" (mention something specific we could help with based on their posting)
- Keep it under 120 words
- Don't repeat the first email — this is a nudge, not a resend
- Sign off as "J"

Return ONLY the email body text (no subject, no JSON).`,
          model: 'gemini_3_flash'
        });

        const followUpBody = str(llm, 2000);
        const subject = `Re: ${opp.response_subject || opp.title}`;

        const fullBody = `${followUpBody}

— J
${user.full_name || ''}
${user.email || ''}`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: opp.contact_email,
          subject: subject,
          body: fullBody,
          from_name: user.full_name || 'J'
        });

        await base44.asServiceRole.entities.Opportunity.update(opp.id, {
          follow_up_count: followUpNumber,
          last_follow_up_at: now.toISOString(),
          response_status: followUpNumber >= MAX_FOLLOW_UPS ? 'closed' : 'sent',
          status: 'followed_up'
        });

        followedUp++;
      } catch (err) {
        skipped++;
      }
    }

    return Response.json({
      followed_up: followedUp,
      skipped: skipped,
      total_sent: sentOpps.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}