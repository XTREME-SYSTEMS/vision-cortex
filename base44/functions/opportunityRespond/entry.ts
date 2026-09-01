import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { str } from '../../shared/cloudBrowser.ts';

// Sends the pre-drafted humanistic response email to the opportunity contact.
// Called from the dashboard "Approve & Send" button.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const opportunityId = str(body?.opportunity_id, 100);
    if (!opportunityId) return Response.json({ error: 'opportunity_id is required' }, { status: 400 });

    const opp = await base44.asServiceRole.entities.Opportunity.get(opportunityId);
    if (!opp) return Response.json({ error: 'Opportunity not found' }, { status: 404 });

    if (!opp.response_draft || opp.response_draft.length < 20) {
      return Response.json({ error: 'No response draft found — run research first' }, { status: 400 });
    }

    // Determine recipient: prefer contact_email, fall back to nothing (can't send)
    const to = opp.contact_email;
    if (!to || to.length < 5) {
      return Response.json({ error: 'No contact email on this opportunity — cannot send. Check the posting for contact info.', has_email: false }, { status: 400 });
    }

    const subject = opp.response_subject || `Re: ${opp.title}`;
    const emailBody = `${opp.response_draft}

— J
${user.full_name || ''}
${user.email || ''}

P.S. If this isn't the right fit right now, no worries at all — feel free to reach out whenever the need arises.`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: to,
      subject: subject,
      body: emailBody,
      from_name: user.full_name || 'J'
    });

    await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
      response_status: 'sent',
      status: 'responded',
      sent_at: new Date().toISOString(),
      last_follow_up_at: new Date().toISOString()
    });

    return Response.json({
      sent: true,
      to: to,
      subject: subject,
      opportunity_id: opportunityId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}