import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizePhone, sendTelnyxMessage, getMessagingProfile } from "../../shared/telnyxHelpers.ts";

// ============================================================================
// edenSkyeResponder — Eden Skye's intelligent inbound response handler
// Handles: SMS replies, email replies, objection handling, rebuttals,
// Q&A, follow-up sequences, appointment booking from inbound interest
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'respond' } = body;

    // Generate an intelligent response using Eden Skye's persona
    const generateResponse = async (contact, inboundMessage, context) => {
      const prompt = `You are Eden Skye, a warm humanistic AI assistant from Vision Cortex.
You received an inbound message from ${contact.full_name || contact.company || 'a lead'} at ${contact.company || ''} (${contact.industry || 'service'} business in ${contact.location || ''}).

Their message: "${inboundMessage}"

Context: ${context || 'They were previously contacted about a free website audit, AI tools, and a free lead generation website for the first month.'}
Previous interactions: ${contact.follow_up_count || 0} follow-ups sent. Last contact: ${contact.last_contact_channel || 'none'}.

Your job: Write a warm, intelligent, humanistic response that:
1. Acknowledges their message naturally
2. Addresses their question or concern directly
3. Handles any objection with empathy and a rebuttal (if applicable)
4. Moves the conversation toward scheduling a consultation or sending more info
5. Stays under 300 characters for SMS, 800 for email

If they're asking about pricing: "Free for the first month, then $499/month — you only pay if you get leads."
If they're asking what we do: "We build AI-powered lead gen systems: website, chatbot, follow-up automation, scheduling."
If they're skeptical: "I totally get it. Let me send you a free audit of your current site — no strings attached."
If they want to talk: "I'd love to chat! What day works for a 15-min call? I'll send a calendar invite."
If they say not interested: "No worries at all! Mind if I follow up in a month in case things change?"

Return JSON: {"response": "the message", "intent": "interested|skeptical|question|not_interested|schedule|objection", "suggested_action": "schedule_consultation|send_info|follow_up_later|transfer_to_human"}`;

      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            intent: { type: 'string' },
            suggested_action: { type: 'string' },
          },
        },
      });
      return res;
    };

    switch (action) {

      // ── RESPOND TO INBOUND SMS/EMAIL ─────────────────────────
      case 'respond': {
        const { contact_id, inbound_message, from, channel = 'sms', context } = body;
        if (!contact_id || !inbound_message) {
          return Response.json({ error: 'contact_id and inbound_message required' }, { status: 400 });
        }

        const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
        if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 });

        const responseData = await generateResponse(contact, inbound_message, context);
        const responseText = responseData?.response || '';
        const intent = responseData?.intent || 'question';
        const suggestedAction = responseData?.suggested_action || 'send_info';

        // Send the response via the appropriate channel
        let sent = false;
        if (channel === 'sms' || channel === 'mms') {
          if (from && contact.phone) {
            const profileId = await getMessagingProfile();
            const to = normalizePhone(contact.phone);
            if (to && profileId) {
              const result = await sendTelnyxMessage(to, from, responseText, [], profileId);
              sent = result.ok;
            }
          }
        } else if (channel === 'email') {
          if (contact.email) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: contact.email,
                subject: `Re: Your inquiry — Vision Cortex`,
                body: responseText,
              });
              sent = true;
            } catch (e) { /* email failed */ }
          }
        }

        // Update contact with the interaction
        await base44.entities.XtremeCrmContact.update(contact_id, {
          last_contacted_at: new Date().toISOString(),
          last_contact_channel: channel,
          enrichment_data: {
            ...(contact.enrichment_data || {}),
            last_inbound: {
              message: inbound_message,
              at: new Date().toISOString(),
              response: responseText,
              intent,
              suggested_action: suggestedAction,
            },
          },
        });

        // If intent is "schedule", trigger the scheduler
        let scheduleTriggered = false;
        if (suggestedAction === 'schedule_consultation' && intent === 'schedule') {
          try {
            await base44.functions.invoke('edenSkyeScheduler', {
              action: 'create_task',
              title: `Call ${contact.full_name} to schedule consultation`,
              notes: `Lead expressed interest in scheduling. Inbound: "${inbound_message}". Response sent: "${responseText}". Contact: ${contact.phone || contact.email}`,
              contact_id,
            });
            scheduleTriggered = true;
          } catch (e) { /* scheduler failed */ }
        }

        return Response.json({
          ok: true,
          response: responseText,
          intent,
          suggested_action: suggestedAction,
          sent,
          schedule_triggered: scheduleTriggered,
          contact_id,
        });
      }

      // ── HANDLE OBJECTION (rebuttal generation) ───────────────
      case 'handle_objection': {
        const { contact_id, objection_type, objection_text, from, channel = 'sms' } = body;
        if (!contact_id || !objection_text) {
          return Response.json({ error: 'contact_id and objection_text required' }, { status: 400 });
        }

        const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
        if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 });

        const objectionMap: Record<string, string> = {
          price: 'They think it costs too much. Rebut with: free first month, only pay if you get leads, ROI in 30 days.',
          time: 'They say they are too busy. Rebut with: 15 min call, we handle everything, saves them time.',
          trust: 'They do not trust AI/new tech. Rebut with: proven results, free audit first, no commitment.',
          competitor: 'They already have a provider. Rebut with: free second opinion audit, show what they are missing.',
          'not_interested': 'They are not interested. Rebut with: gentle break-up, offer to follow up in a month.',
          need_more_info: 'They need more information. Rebut with: send a detailed proposal email with case studies.',
          need_to_think: 'They need to think about it. Rebut with: no pressure, send a summary, follow up next week.',
        };

        const context = objectionMap[objection_type] || objectionMap['need_more_info'];

        const prompt = `You are Eden Skye. ${contact.full_name} at ${contact.company || ''} raised this objection:
"${objection_text}"

Objection type: ${objection_type}
Context: ${context}

Write a warm, empathetic rebuttal that:
1. Validates their concern (do not dismiss it)
2. Reframes the objection with a new perspective
3. Offers a low-commitment next step
4. Under 250 chars for SMS, 600 for email

Return ONLY the rebuttal text.`;

        const rebuttal = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
        const rebuttalText = typeof rebuttal === 'string' ? rebuttal.trim() : '';

        // Send the rebuttal
        let sent = false;
        if (channel === 'sms' || channel === 'mms') {
          if (from && contact.phone) {
            const profileId = await getMessagingProfile();
            const to = normalizePhone(contact.phone);
            if (to && profileId) {
              const result = await sendTelnyxMessage(to, from, rebuttalText, [], profileId);
              sent = result.ok;
            }
          }
        } else if (channel === 'email' && contact.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: contact.email,
              subject: `Re: ${contact.company || 'Your business'} — Vision Cortex`,
              body: rebuttalText,
            });
            sent = true;
          } catch (e) { /* email failed */ }
        }

        await base44.entities.XtremeCrmContact.update(contact_id, {
          last_contacted_at: new Date().toISOString(),
          last_contact_channel: channel,
          enrichment_data: {
            ...(contact.enrichment_data || {}),
            last_objection: { type: objection_type, text: objection_text, rebuttal: rebuttalText, at: new Date().toISOString() },
          },
        });

        return Response.json({ ok: true, rebuttal: rebuttalText, sent, contact_id });
      }

      // ── ANSWER QUESTION (intelligent Q&A) ───────────────────
      case 'answer_question': {
        const { contact_id, question, from, channel = 'sms' } = body;
        if (!contact_id || !question) {
          return Response.json({ error: 'contact_id and question required' }, { status: 400 });
        }

        const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
        if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 });

        const prompt = `You are Eden Skye from Vision Cortex. ${contact.full_name} at ${contact.company || ''} (${contact.industry || 'service'} business) asked:
"${question}"

Answer clearly, concisely, and warmly. If you do not know the exact answer, give the best general answer and offer to follow up with details.
Keep under 300 chars for SMS, 800 for email.
Return ONLY the answer text.`;

        const answer = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
        const answerText = typeof answer === 'string' ? answer.trim() : '';

        let sent = false;
        if (channel === 'sms' || channel === 'mms') {
          if (from && contact.phone) {
            const profileId = await getMessagingProfile();
            const to = normalizePhone(contact.phone);
            if (to && profileId) {
              const result = await sendTelnyxMessage(to, from, answerText, [], profileId);
              sent = result.ok;
            }
          }
        } else if (channel === 'email' && contact.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: contact.email,
              subject: `Re: Your question — Vision Cortex`,
              body: answerText,
            });
            sent = true;
          } catch (e) { /* email failed */ }
        }

        await base44.entities.XtremeCrmContact.update(contact_id, {
          last_contacted_at: new Date().toISOString(),
          last_contact_channel: channel,
          enrichment_data: {
            ...(contact.enrichment_data || {}),
            last_qa: { question, answer: answerText, at: new Date().toISOString() },
          },
        });

        return Response.json({ ok: true, answer: answerText, sent, contact_id });
      }

      // ── SEND LINK / CONTENT to a contact ────────────────────
      case 'send_link': {
        const { contact_id, link_url, link_label, from, channel = 'sms', message } = body;
        if (!contact_id || !link_url) {
          return Response.json({ error: 'contact_id and link_url required' }, { status: 400 });
        }

        const contact = await base44.entities.XtremeCrmContact.get(contact_id).catch(() => null);
        if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 });

        const text = message || `Hi ${contact.full_name?.split(' ')[0] || 'there'}! Here's the link you requested: ${link_label || 'Click here'} — ${link_url}`;

        let sent = false;
        if (channel === 'sms' || channel === 'mms') {
          if (from && contact.phone) {
            const profileId = await getMessagingProfile();
            const to = normalizePhone(contact.phone);
            if (to && profileId) {
              const result = await sendTelnyxMessage(to, from, text, [], profileId);
              sent = result.ok;
            }
          }
        } else if (channel === 'email' && contact.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: contact.email,
              subject: link_label || 'Link from Vision Cortex',
              body: `${text}\n\n— Eden Skye, Vision Cortex`,
            });
            sent = true;
          } catch (e) { /* email failed */ }
        }

        await base44.entities.XtremeCrmContact.update(contact_id, {
          last_contacted_at: new Date().toISOString(),
          last_contact_channel: channel,
        });

        return Response.json({ ok: true, sent, link_url, contact_id });
      }

      // ── BATCH INTELLIGENT RESPONSE (swarm) ───────────────────
      case 'batch_respond': {
        const { responses = [], from } = body;
        // responses: [{ contact_id, inbound_message, channel }]
        if (!Array.isArray(responses) || responses.length === 0) {
          return Response.json({ error: 'responses array required' }, { status: 400 });
        }

        let processed = 0, sent = 0, failed = 0;
        const results = [];

        for (const item of responses) {
          try {
            const contact = await base44.entities.XtremeCrmContact.get(item.contact_id).catch(() => null);
            if (!contact) { failed++; continue; }

            const responseData = await generateResponse(contact, item.inbound_message, item.context);
            const responseText = responseData?.response || '';

            let itemSent = false;
            if (item.channel === 'sms' || item.channel === 'mms') {
              if (from && contact.phone) {
                const profileId = await getMessagingProfile();
                const to = normalizePhone(contact.phone);
                if (to && profileId) {
                  const result = await sendTelnyxMessage(to, from, responseText, [], profileId);
                  itemSent = result.ok;
                }
              }
            } else if (item.channel === 'email' && contact.email) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: contact.email,
                  subject: `Re: Your message — Vision Cortex`,
                  body: responseText,
                });
                itemSent = true;
              } catch (e) { /* failed */ }
            }

            await base44.entities.XtremeCrmContact.update(item.contact_id, {
              last_contacted_at: new Date().toISOString(),
              last_contact_channel: item.channel || 'sms',
            });

            if (itemSent) sent++; else failed++;
            processed++;
            results.push({ contact_id: item.contact_id, intent: responseData?.intent, sent: itemSent });
          } catch (e) {
            failed++;
            results.push({ contact_id: item.contact_id, error: e.message });
          }
        }

        return Response.json({ ok: true, processed, sent, failed, results: results.slice(0, 50) });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}