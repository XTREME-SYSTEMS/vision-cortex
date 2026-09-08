import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getMessagingProfile, normalizePhone, sendTelnyxMessage, sleep, getNextFromNumber } from "../../shared/telnyxHelpers.ts";

// ============================================================================
// batchMmsOutreach — Batch MMS/SMS outreach to all leads in a campaign
// Sends personalized messages via Telnyx with rate limiting
// ============================================================================

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action = 'send_batch' } = body;

  switch (action) {

    // ── SEND BATCH MMS/SMS ────────────────────────────────────
    case 'send_batch': {
      const { campaign_id, from: fromArg, channel = 'mms', media_urls = [], batch_size = 50, delay_seconds = 3, lead_ids = [] } = body;
      const from = fromArg || getNextFromNumber();
      if (!from) return Response.json({ error: 'from number required' }, { status: 400 });

      const profileId = await getMessagingProfile();
      if (!profileId) return Response.json({ error: 'No messaging profile available' }, { status: 400 });

      // Get leads
      let leads = [];
      if (campaign_id) {
        const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        const ids = lead_ids.length > 0 ? lead_ids : campaign.lead_ids || [];
        if (ids.length > 0) {
          leads = await base44.entities.ScrapedLead.filter({ id: { $in: ids } });
        }
        await base44.entities.OutreachCampaign.update(campaign_id, { status: 'sending', from_number: from });
      } else if (lead_ids.length > 0) {
        leads = await base44.entities.ScrapedLead.filter({ id: { $in: lead_ids } });
      }

      if (leads.length === 0) return Response.json({ error: 'No leads to message' }, { status: 400 });

      let sent = 0;
      let failed = 0;
      const errors = [];
      const limit = Math.min(batch_size, leads.length);

      for (let i = 0; i < limit; i++) {
        const lead = leads[i];
        const to = normalizePhone(lead.phone || lead.enrichment_data?.owner_phone);
        const message = lead.enrichment_data?.outreach_message || body.message_template;

        if (!to || !message) {
          failed++;
          errors.push(`${lead.business_name}: no phone or message`);
          continue;
        }

        try {
          const result = await sendTelnyxMessage(to, from, message, channel === 'mms' ? media_urls : [], profileId);
          if (result.ok) {
            sent++;
            // Mark as ingested to CRM + track
            const existing = lead.enrichment_data || {};
            await base44.entities.ScrapedLead.update(lead.id, {
              enrichment_data: { ...existing, last_mms_sent: new Date().toISOString(), mms_status: 'sent' },
            });
          } else {
            failed++;
            errors.push(`${lead.business_name}: ${result.error || 'send failed'}`);
          }
        } catch (e) {
          failed++;
          errors.push(`${lead.business_name}: ${e.message}`);
        }

        // Rate limit
        if (delay_seconds > 0 && i < limit - 1) await sleep(delay_seconds * 1000);
      }

      // Update campaign
      if (campaign_id) {
        const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        await base44.entities.OutreachCampaign.update(campaign_id, {
          messages_sent: (campaign.messages_sent || 0) + sent,
          status: sent > 0 ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          results: { ...campaign.results, send_errors: errors.slice(0, 20) },
        });
      }

      return Response.json({ ok: true, sent, failed, total: limit, errors: errors.slice(0, 10) });
    }

    // ── SEND TO CRM CONTACTS (follow-up batch) ────────────────
    case 'send_to_contacts': {
      const { contact_ids = [], from: fromArg2, channel = 'sms', message_template, media_urls = [], delay_seconds = 3, campaign_id } = body;
      const from = fromArg2 || getNextFromNumber();
      if (!from) return Response.json({ error: 'from number required' }, { status: 400 });

      const profileId = await getMessagingProfile();
      let contacts = [];
      if (contact_ids.length > 0) {
        contacts = await base44.entities.XtremeCrmContact.filter({ id: { $in: contact_ids } });
      } else if (campaign_id) {
        const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        const ids = campaign.contact_ids || [];
        if (ids.length > 0) contacts = await base44.entities.XtremeCrmContact.filter({ id: { $in: ids } });
      }

      if (contacts.length === 0) return Response.json({ error: 'No contacts found' }, { status: 400 });

      let sent = 0, failed = 0;
      const errors = [];

      for (const contact of contacts) {
        const to = normalizePhone(contact.phone);
        if (!to) { failed++; errors.push(`${contact.full_name}: no phone`); continue; }

        const message = message_template || `Hi ${contact.full_name?.split(' ')[0] || 'there'}, following up from Vision Cortex. Got a minute to chat?`;

        try {
          const result = await sendTelnyxMessage(to, from, message, channel === 'mms' ? media_urls : [], profileId);
          if (result.ok) {
            sent++;
            await base44.entities.XtremeCrmContact.update(contact.id, {
              last_contacted_at: new Date().toISOString(),
              last_contact_channel: channel,
              follow_up_count: (contact.follow_up_count || 0) + 1,
            });
          } else {
            failed++;
            errors.push(`${contact.full_name}: ${result.error}`);
          }
        } catch (e) {
          failed++;
          errors.push(`${contact.full_name}: ${e.message}`);
        }
        if (delay_seconds > 0) await sleep(delay_seconds * 1000);
      }

      return Response.json({ ok: true, sent, failed, total: contacts.length, errors: errors.slice(0, 10) });
    }

    // ── PREVIEW: get all messages ready to send ────────────────
    case 'preview': {
      const { campaign_id, lead_ids = [] } = body;
      let leads = [];
      if (campaign_id) {
        const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        const ids = lead_ids.length > 0 ? lead_ids : campaign.lead_ids || [];
        if (ids.length > 0) leads = await base44.entities.ScrapedLead.filter({ id: { $in: ids } });
      } else if (lead_ids.length > 0) {
        leads = await base44.entities.ScrapedLead.filter({ id: { $in: lead_ids } });
      }

      const preview = leads.map(l => ({
        id: l.id,
        business_name: l.business_name,
        phone: l.phone || l.enrichment_data?.owner_phone,
        has_message: !!l.enrichment_data?.outreach_message,
        message: l.enrichment_data?.outreach_message,
        enriched: l.enriched,
        audited: !!l.enrichment_data?.audit,
      }));

      return Response.json({ ok: true, total: preview.length, ready: preview.filter(p => p.has_message && p.phone).length, leads: preview });
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}