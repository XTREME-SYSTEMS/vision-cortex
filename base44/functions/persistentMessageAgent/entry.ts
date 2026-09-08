import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getMessagingProfile, normalizePhone, sendTelnyxMessage, sleep } from "../../shared/telnyxHelpers.ts";

// ============================================================================
// persistentMessageAgent — Autonomous persistent follow-up agent
// Handles: follow-ups, marketing messages, coupons, emails, proposals
// Runs on a schedule to persistently message CRM contacts
// ============================================================================

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action = 'run_follow_ups' } = body;

  // Generate a follow-up message via LLM
  const generateFollowUp = async (contact, sequence, channel) => {
    const prompt = `You are a persistent but respectful sales follow-up agent for Vision Cortex.
Write a ${channel} follow-up message to ${contact.full_name} at ${contact.company || ''} (${contact.industry || 'service'} business).
This is follow-up #${sequence}. They haven't responded yet.
Previous contact was ${contact.last_contact_channel || 'none'} on ${contact.last_contacted_at || 'unknown'}.

Rules:
- Be human, warm, not annoying
- Reference value: free audit, AI tools, free lead gen website
- ${sequence >= 3 ? 'Include a coupon: 20% off first 3 months' : 'Keep it short, add a new angle'}
- ${sequence >= 5 ? 'This is the last follow-up — make it a gentle break-up message' : ''}
- Under 200 chars for SMS, 500 for email
- No placeholders

Return ONLY the message text.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
    return typeof res === 'string' ? res.trim() : '';
  };

  // Generate a marketing coupon message
  const generateCoupon = async (contact, offer) => {
    const prompt = `Write a short MMS marketing message to ${contact.full_name} at ${contact.company || ''}.
Offer: ${offer}
Make it exciting but professional. Include a clear call to action.
Under 200 chars. No placeholders.`;
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
    return typeof res === 'string' ? res.trim() : '';
  };

  // Generate a proposal email for a contractor
  const generateProposal = async (contact, services) => {
    const prompt = `Write a professional proposal email to ${contact.full_name} at ${contact.company || ''}.
Services to propose: ${services}
From: Vision Cortex — we build AI-powered lead generation systems for ${contact.industry || 'service'} businesses.
Include: executive summary, scope, timeline (4-week implementation), pricing (free first month, then $499/mo), next steps.
Professional but warm tone. Format as email with subject line.`;
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
    return typeof res === 'string' ? res.trim() : '';
  };

  switch (action) {

    // ── RUN FOLLOW-UPS (scheduled) ────────────────────────────
    case 'run_follow_ups': {
      const { from, max_per_run = 50, delay_seconds = 5 } = body;
      if (!from) return Response.json({ error: 'from number required' }, { status: 400 });

      const profileId = await getMessagingProfile();
      if (!profileId) return Response.json({ error: 'No messaging profile' }, { status: 400 });

      // Find all contacts with follow_up_enabled and due for follow-up
      const now = new Date().toISOString();
      const contacts = await base44.entities.XtremeCrmContact.filter({
        follow_up_enabled: true,
        lifecycle_stage: { $in: ['lead', 'contacted', 'qualified'] },
      });

      const dueContacts = contacts.filter(c => {
        if (!c.next_follow_up_at) return true;
        return new Date(c.next_follow_up_at) <= new Date();
      }).slice(0, max_per_run);

      let sent = 0, failed = 0;
      const errors = [];

      for (const contact of dueContacts) {
        const to = normalizePhone(contact.phone);
        if (!to) { failed++; errors.push(`${contact.full_name}: no phone`); continue; }

        const sequence = (contact.follow_up_count || 0) + 1;
        if (sequence > 7) continue; // Max 7 follow-ups

        try {
          const channel = contact.follow_up_method || 'sms';
          const message = await generateFollowUp(contact, sequence, channel);

          if (message) {
          const result = await sendTelnyxMessage(to, from, message, profileId);
            if (result.ok) {
              sent++;
              const nextDate = new Date();
              nextDate.setDate(nextDate.getDate() + (contact.follow_up_frequency_days || 3));
              await base44.entities.XtremeCrmContact.update(contact.id, {
                last_contacted_at: now,
                last_contact_channel: channel,
                follow_up_count: sequence,
                next_follow_up_at: nextDate.toISOString(),
              });
            } else {
              failed++;
              errors.push(`${contact.full_name}: ${result.error}`);
            }
          }
        } catch (e) {
          failed++;
          errors.push(`${contact.full_name}: ${e.message}`);
        }
        if (delay_seconds > 0) await sleep(delay_seconds * 1000);
      }

      return Response.json({ ok: true, sent, failed, total: dueContacts.length, errors: errors.slice(0, 10) });
    }

    // ── SEND MARKETING MESSAGE (coupon/promo) ─────────────────
    case 'send_marketing': {
      const { contact_ids = [], from, offer, delay_seconds = 3 } = body;
      if (!from || !offer) return Response.json({ error: 'from and offer required' }, { status: 400 });

      const profileId = await getMessagingProfile();
      const contacts = contact_ids.length > 0
        ? await base44.entities.XtremeCrmContact.filter({ id: { $in: contact_ids } })
        : await base44.entities.XtremeCrmContact.filter({ lifecycle_stage: { $in: ['lead', 'contacted', 'qualified'] } }, '-created_date', 100);

      let sent = 0, failed = 0;
      const errors = [];

      for (const contact of contacts) {
        const to = normalizePhone(contact.phone);
        if (!to) { failed++; continue; }

        try {
          const message = await generateCoupon(contact, offer);
          if (message) {
            const result = await sendTelnyxMessage(to, from, message, profileId);
            if (result.ok) {
              sent++;
              await base44.entities.XtremeCrmContact.update(contact.id, {
                last_contacted_at: new Date().toISOString(),
                last_contact_channel: 'mms',
              });
            } else { failed++; errors.push(result.error); }
          }
        } catch (e) { failed++; errors.push(e.message); }
        if (delay_seconds > 0) await sleep(delay_seconds * 1000);
      }

      return Response.json({ ok: true, sent, failed, total: contacts.length, errors: errors.slice(0, 10) });
    }

    // ── SEND EMAIL TO COMPANIES ───────────────────────────────
    case 'send_emails': {
      const { contact_ids = [], subject, body: emailBody, delay_seconds = 2 } = body;

      const contacts = contact_ids.length > 0
        ? await base44.entities.XtremeCrmContact.filter({ id: { $in: contact_ids } })
        : await base44.entities.XtremeCrmContact.filter({ lifecycle_stage: { $in: ['lead', 'contacted', 'qualified'] } }, '-created_date', 50);

      let sent = 0, failed = 0;
      const errors = [];

      for (const contact of contacts) {
        if (!contact.email) { failed++; errors.push(`${contact.full_name}: no email`); continue; }
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contact.email,
            subject: subject || `Vision Cortex — AI tools for ${contact.company || contact.full_name}`,
            body: emailBody || `Hi ${contact.full_name?.split(' ')[0] || 'there'},\n\nWe'd love to show you how Vision Cortex can help ${contact.company || 'your business'} grow with AI-powered lead generation.\n\nWould you be open to a quick 15-minute chat this week?\n\nBest,\nEden Skye\nVision Cortex`,
          });
          sent++;
          await base44.entities.XtremeCrmContact.update(contact.id, {
            last_contacted_at: new Date().toISOString(),
            last_contact_channel: 'email',
          });
        } catch (e) { failed++; errors.push(`${contact.full_name}: ${e.message}`); }
        if (delay_seconds > 0) await sleep(delay_seconds * 1000);
      }

      return Response.json({ ok: true, sent, failed, total: contacts.length, errors: errors.slice(0, 10) });
    }

    // ── SEND PROPOSAL TO CONTRACTOR ───────────────────────────
    case 'send_proposal': {
      const { contact_id, services } = body;
      if (!contact_id) return Response.json({ error: 'contact_id required' }, { status: 400 });
      const contact = await base44.entities.XtremeCrmContact.get(contact_id);

      const proposal = await generateProposal(contact, services || 'AI lead generation website, AI chatbot, AI follow-up system, AI scheduling');

      if (contact.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: contact.email,
          subject: `Proposal for ${contact.company || contact.full_name} — Vision Cortex`,
          body: proposal,
        });
      }

      await base44.entities.XtremeCrmContact.update(contact_id, {
        lifecycle_stage: 'proposal',
        last_contacted_at: new Date().toISOString(),
        last_contact_channel: 'email',
        enrichment_data: { ...(contact.enrichment_data || {}), proposal_sent: proposal, proposal_sent_at: new Date().toISOString() },
      });

      return Response.json({ ok: true, proposal, contact_id });
    }

    // ── SETUP FREE LEAD GEN WEBSITE ───────────────────────────
    case 'setup_free_website': {
      const { contact_id } = body;
      if (!contact_id) return Response.json({ error: 'contact_id required' }, { status: 400 });
      const contact = await base44.entities.XtremeCrmContact.get(contact_id);

      // Generate a website spec for this company
      const prompt = `Generate a lead generation website spec for ${contact.company || contact.full_name}, a ${contact.industry || 'service'} business in ${contact.location || ''}.
Include: site name, tagline, hero copy, services list, lead capture form fields, color scheme, SEO keywords.
Return JSON: {"site_name":"","tagline":"","hero_copy":"","services":[],"form_fields":[],"colors":{"primary":"","secondary":""},"seo_keywords":[]}`;

      const spec = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt, model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            site_name: { type: 'string' }, tagline: { type: 'string' }, hero_copy: { type: 'string' },
            services: { type: 'array', items: { type: 'string' } },
            form_fields: { type: 'array', items: { type: 'string' } },
            colors: { type: 'object', properties: { primary: { type: 'string' }, secondary: { type: 'string' } } },
            seo_keywords: { type: 'array', items: { type: 'string' } },
          }
        }
      });

      await base44.entities.XtremeCrmContact.update(contact_id, {
        lifecycle_stage: 'won',
        enrichment_data: { ...(contact.enrichment_data || {}), free_website_spec: spec, website_setup_at: new Date().toISOString() },
      });

      return Response.json({ ok: true, spec, contact_id });
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}