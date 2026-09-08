import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { getNextFromNumber } from "../../shared/telnyxHelpers.ts";

// ============================================================================
// aiCallCampaign — AI voice call campaigns via Telnyx Call Control
// Uses Eden Skye persona to make outbound calls, schedule consultations,
// and set up companies with free lead gen websites.
// ============================================================================

const TELNYX_BASE = 'https://api.telnyx.com/v2';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action = 'start_campaign' } = body;

  const apiKey = secrets.get('TELNYX_API_KEY');
  if (!apiKey) return Response.json({ error: 'TELNYX_API_KEY not set' }, { status: 400 });

  const telnyxHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const normalizePhone = (phone) => {
    if (!phone) return null;
    let p = phone.replace(/[^\d+]/g, '');
    if (!p.startsWith('+')) p = '+' + p;
    if (p.length < 11) return null;
    return p;
  };

  // Generate AI call script using Eden Skye persona
  const generateCallScript = async (contact, campaign) => {
    const prompt = `You are Eden Skye, a warm humanistic AI assistant from Vision Cortex.
Generate a call script for calling ${contact.full_name || contact.company_name || 'a business owner'} at ${contact.company || contact.full_name || ''}.
They run a ${contact.industry || campaign?.industry || 'service'} business in ${contact.location || campaign?.location || ''}.

Context: We're offering ${campaign?.hooks?.join(', ') || 'a free website audit, AI tools, and a free lead generation website for the first month'}.

Write a natural, conversational call script with:
1. Greeting (warm, human, not robotic)
2. Reason for calling (we audited their website, found issues)
3. Value proposition (free audit + AI tools + free lead gen website first month)
4. Qualification question (are they the owner? how many jobs/month?)
5. Call to action: schedule a 15-min consultation
6. If they agree: collect preferred day/time
7. If they decline: offer to send info via text
8. Closing (warm, professional)

Return JSON: {"script": "the full call script", "voicemail": "short voicemail if no answer", "objection_handlers": []}`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          script: { type: 'string' },
          voicemail: { type: 'string' },
          objection_handlers: { type: 'array', items: { type: 'string' } },
        }
      }
    });
    return res;
  };

  switch (action) {

    // ── START CALL CAMPAIGN ───────────────────────────────────
    case 'start_campaign': {
      const { campaign_id, from: fromArg, max_calls = 100, contact_ids = [], webhook_url } = body;
      const from = fromArg || getNextFromNumber();

      let campaign = null;
      let contacts = [];

      if (campaign_id) {
        campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        const ids = contact_ids.length > 0 ? contact_ids : campaign.contact_ids || [];
        if (ids.length > 0) {
          contacts = await base44.entities.XtremeCrmContact.filter({ id: { $in: ids } });
        }
        // If no CRM contacts, pull from leads
        if (contacts.length === 0 && campaign.lead_ids?.length > 0) {
          const leads = await base44.entities.ScrapedLead.filter({ id: { $in: campaign.lead_ids } });
          for (const lead of leads) {
            const phone = normalizePhone(lead.phone || lead.enrichment_data?.owner_phone);
            if (phone) {
              const created = await base44.entities.XtremeCrmContact.create({
                full_name: lead.enrichment_data?.owner_name || lead.business_name,
                phone, company: lead.business_name, industry: lead.industry,
                location: lead.location, website: lead.website,
                lifecycle_stage: 'lead', lead_source: 'scraper',
                enrichment_data: lead.enrichment_data,
              });
              contacts.push(created);
            }
          }
          await base44.entities.OutreachCampaign.update(campaign_id, { contact_ids: contacts.map(c => c.id) });
        }
        await base44.entities.OutreachCampaign.update(campaign_id, { status: 'calling', from_number: from });
      } else if (contact_ids.length > 0) {
        contacts = await base44.entities.XtremeCrmContact.filter({ id: { $in: contact_ids } });
      }

      if (contacts.length === 0) return Response.json({ error: 'No contacts with phone numbers to call' }, { status: 400 });

      let callsMade = 0;
      let callsFailed = 0;
      let consultationsScheduled = 0;
      const errors = [];
      const limit = Math.min(max_calls, contacts.length);

      for (let i = 0; i < limit; i++) {
        const contact = contacts[i];
        const to = normalizePhone(contact.phone);
        if (!to) { callsFailed++; errors.push(`${contact.full_name}: no valid phone`); continue; }

        try {
          // Generate call script for this contact
          const scriptData = await generateCallScript(contact, campaign);

          // Place the call via Telnyx
          const callPayload = { to, from };
          if (webhook_url) callPayload.webhook_url = webhook_url;
          // Encode script in client_state for the webhook to use
          if (scriptData?.script) {
            callPayload.client_state = btoa(JSON.stringify({
              script: scriptData.script,
              voicemail: scriptData.voicemail,
              contact_id: contact.id,
              contact_name: contact.full_name,
              campaign_id: campaign_id,
            })).substring(0, 200);
          }

          const r = await fetch(`${TELNYX_BASE}/calls`, {
            method: 'POST', headers: telnyxHeaders,
            body: JSON.stringify(callPayload),
          });
          const data = await r.json().catch(() => ({}));

          if (r.ok && data?.data) {
            callsMade++;
            // Track the call
            await base44.entities.XtremeCrmContact.update(contact.id, {
              last_contacted_at: new Date().toISOString(),
              last_contact_channel: 'voice',
              enrichment_data: {
                ...(contact.enrichment_data || {}),
                last_call: { at: new Date().toISOString(), call_id: data.data.id, script: scriptData?.script },
              },
            });
          } else {
            callsFailed++;
            errors.push(`${contact.full_name}: ${data?.errors?.[0]?.detail || 'call failed'}`);
          }
        } catch (e) {
          callsFailed++;
          errors.push(`${contact.full_name}: ${e.message}`);
        }

        // Throttle calls — 1 call per 30 seconds to avoid issues
        if (i < limit - 1) await sleep(30000);
      }

      // Update campaign
      if (campaign_id) {
        const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        await base44.entities.OutreachCampaign.update(campaign_id, {
          calls_made: (campaign.calls_made || 0) + callsMade,
          status: 'completed',
          completed_at: new Date().toISOString(),
          results: { ...campaign.results, call_errors: errors.slice(0, 20) },
        });
      }

      return Response.json({
        ok: true,
        calls_made: callsMade,
        calls_failed: callsFailed,
        total: limit,
        errors: errors.slice(0, 10),
      });
    }

    // ── GENERATE SCRIPT ONLY (preview) ─────────────────────────
    case 'generate_script': {
      const { contact_id, campaign_id } = body;
      const contact = await base44.entities.XtremeCrmContact.get(contact_id);
      const campaign = campaign_id ? await base44.entities.OutreachCampaign.get(campaign_id) : null;
      const scriptData = await generateCallScript(contact, campaign);
      return Response.json({ ok: true, script: scriptData });
    }

    // ── SCHEDULE CONSULTATION ──────────────────────────────────
    case 'schedule_consultation': {
      const { contact_id, scheduled_time, notes, campaign_id } = body;
      const contact = await base44.entities.XtremeCrmContact.get(contact_id);

      await base44.entities.XtremeCrmContact.update(contact_id, {
        lifecycle_stage: 'qualified',
        enrichment_data: {
          ...(contact.enrichment_data || {}),
          consultation_scheduled: { time: scheduled_time, notes, scheduled_at: new Date().toISOString() },
        },
      });

      if (campaign_id) {
        const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
        await base44.entities.OutreachCampaign.update(campaign_id, {
          consultations_scheduled: (campaign.consultations_scheduled || 0) + 1,
        });
      }

      return Response.json({ ok: true, contact_id, scheduled_time });
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}