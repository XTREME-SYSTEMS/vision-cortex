import { createClientFromRequest, secrets } from '../../runtime/index';
import { normalizePhone, sendTelnyxMessage, getMessagingProfile, sleep, getNextFromNumber } from "../../shared/telnyxHelpers.ts";

// ============================================================================
// polishedConcreteEngine — Unified autonomous pipeline for polished concrete
// Scrape directory → enrich → AI takeoff → bid generation → email/SMS/MMS
// outreach → persistent follow-up. Uses jeremy@nationalconcretepolishingnet.
// ============================================================================

const SENDER_EMAIL = 'jeremy@nationalconcretepolishingnet';
const SENDER_NAME = 'Jeremy — National Concrete Polishing';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'scrape_directory' } = body;

    // ── SCRAPE DIRECTORY: find polished concrete contractors ──
    const scrapeDirectory = async (state, city, trade) => {
      const query = `${trade || 'polished concrete contractor'} in ${city || ''} ${state || ''}`.trim();
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Search the web for ${query}. Find real polished concrete and epoxy flooring contractors in this area.
For each contractor, provide: business_name, phone, email, website, address, city, state, zip, rating, review_count.
Return up to 50 results. Focus on real, operating businesses with websites.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            contractors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  website: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  zip: { type: 'string' },
                  rating: { type: 'number' },
                  review_count: { type: 'integer' },
                },
              },
            },
          },
        },
      });
      return result?.contractors || [];
    };

    // ── ENRICH LEAD: analyze website, score, find gaps/upsells ──
    const enrichLead = async (lead) => {
      const prompt = `Analyze this polished concrete business for Vision Cortex outreach:
Business: ${lead.business_name || lead.name}
Website: ${lead.website || 'N/A'}
Location: ${lead.city || ''}, ${lead.state || ''}

Score their website (0-100) on: SEO, design, content, performance, conversion, trust.
Identify gaps (what's missing/broken) and upsells (services they could add).
Estimate: employee_count, equipment, material_usage, estimated_revenue.
Generate an ai_next_step for outreach.

Return JSON with: scores, overall_score, business_summary, gaps[], upsells[], employee_count, equipment, material_usage, estimated_revenue, ai_next_step.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            overall_score: { type: 'number' },
            business_summary: { type: 'string' },
            gaps: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, issue: { type: 'string' }, severity: { type: 'string' } } } },
            upsells: { type: 'array', items: { type: 'object', properties: { service: { type: 'string' }, benefit: { type: 'string' } } } },
            employee_count: { type: 'string' },
            equipment: { type: 'string' },
            estimated_revenue: { type: 'string' },
            ai_next_step: { type: 'string' },
          },
        },
      });
      return result;
    };

    // ── AI TAKEOFF: analyze floor photos and condition ──
    const aiTakeoff = async (lead) => {
      const prompt = `You are an expert polished concrete estimator. Analyze this lead:
Name: ${lead.name}
Address: ${lead.address}
Sqft: ${lead.sqft || 'unknown'}
Floor condition: ${lead.floor_condition || 'unknown'}
Desired finish: ${lead.desired_finish || 'flake'}
Color choice: ${lead.color_choice || 'none'}
Notes: ${lead.notes || 'none'}
${lead.photo_urls?.length > 0 ? `Photos: ${lead.photo_urls.join(', ')}` : 'No photos provided'}

Perform a takeoff:
1. Assess condition_score (0-100, lower = more prep needed)
2. List prep_required (grinding, patching, moisture barrier, etc.)
3. Estimate difficulty (easy/medium/hard)
4. If sqft unknown, estimate based on address/type
5. Generate a summary of the project

Return JSON: condition_score, summary, prep_required[], estimated_sqft, difficulty, tags[].`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            condition_score: { type: 'number' },
            summary: { type: 'string' },
            prep_required: { type: 'array', items: { type: 'string' } },
            estimated_sqft: { type: 'number' },
            difficulty: { type: 'string' },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      });
      return result;
    };

    // ── GENERATE BID: calculate costs using FloorSystem + PricingRule ──
    const generateBid = async (lead, takeoff) => {
      const sqft = lead.sqft || takeoff?.estimated_sqft || 1000;
      const finishType = lead.desired_finish || 'flake';

      // Get matching floor system
      const systems = await base44.entities.FloorSystem.filter({ finish_type: finishType, active: true });
      const system = systems[0] || {
        material_cost_per_sqft: 2.50,
        labor_cost_per_sqft: 3.00,
        prep_cost_per_sqft: 1.50,
        timeline_days_per_1000sqft: 2,
      };

      // Get pricing rules
      const rules = await base44.entities.PricingRule.filter({ active: true });
      const baseRule = rules.find(r => r.rule_type === 'base_price') || { price_per_sqft: 0 };
      const minCharge = rules.find(r => r.rule_type === 'minimum_charge') || { minimum_charge: 1500 };

      // Calculate costs
      const conditionMultiplier = takeoff?.condition_score ? (1 + (100 - takeoff.condition_score) / 200) : 1;
      const materialCost = Math.round(sqft * system.material_cost_per_sqft * 100) / 100;
      const laborCost = Math.round(sqft * system.labor_cost_per_sqft * 100) / 100;
      const prepCost = Math.round(sqft * system.prep_cost_per_sqft * conditionMultiplier * 100) / 100;
      const total = Math.max(materialCost + laborCost + prepCost, minCharge.minimum_charge || 1500);
      const pricePerSqft = Math.round((total / sqft) * 100) / 100;
      const timelineDays = Math.ceil((sqft / 1000) * (system.timeline_days_per_1000sqft || 2));

      // Generate proposal
      const proposalPrompt = `Generate a professional bid proposal for:
Customer: ${lead.name}
Project: ${sqft} sqft ${finishType} flooring
Address: ${lead.address}
Condition: ${lead.floor_condition} (score: ${takeoff?.condition_score || 'unknown'})
Prep required: ${(takeoff?.prep_required || []).join(', ') || 'standard prep'}
Material cost: $${materialCost}
Labor cost: $${laborCost}
Prep cost: $${prepCost}
Total: $${total}
Price per sqft: $${pricePerSqft}
Timeline: ${timelineDays} days

Write a warm, professional proposal email from Jeremy at National Concrete Polishing.
Include: greeting, project summary, scope of work, pricing breakdown, timeline, next steps, closing.
Make it personal and human, not robotic.`;

      const proposal = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: proposalPrompt, model: 'gemini_3_flash' });
      const proposalText = typeof proposal === 'string' ? proposal : '';

      return {
        material_cost: materialCost,
        labor_cost: laborCost,
        prep_cost: prepCost,
        total,
        price_per_sqft: pricePerSqft,
        timeline_days: timelineDays,
        proposal: proposalText,
        generated_at: new Date().toISOString(),
      };
    };

    // ── SEND OUTREACH EMAIL via Gmail ──
    const sendOutreachEmail = async (to, subject, body) => {
      try {
        // Try Gmail connector first
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const emailBody = [
          `From: ${SENDER_NAME} <${SENDER_EMAIL}>`,
          `To: ${to}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset=utf-8',
          'MIME-Version: 1.0',
          '',
          body,
        ].join('\r\n');
        const encoded = btoa(emailBody);
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw: encoded }),
        });
        if (res.ok) return { ok: true, via: 'gmail' };
        throw new Error(`Gmail API failed: ${res.status}`);
      } catch (gmailError) {
        // Fallback to Core.SendEmail
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to, subject, body,
            from_name: SENDER_NAME,
          });
          return { ok: true, via: 'core' };
        } catch (coreError) {
          return { ok: false, error: coreError.message };
        }
      }
    };

    switch (action) {

      // ── SCRAPE DIRECTORY ─────────────────────────────────────
      case 'scrape_directory': {
        const { state, city, trade = 'polished concrete contractor', max_results = 50 } = body;
        if (!state && !city) return Response.json({ error: 'state or city required' }, { status: 400 });

        const contractors = await scrapeDirectory(state, city, trade);
        const limited = contractors.slice(0, max_results);

        // Save to PcuDirectory
        const saved = await base44.entities.PcuDirectory.bulkCreate(
          limited.map(c => ({
            business_name: c.business_name || '',
            phone: c.phone || '',
            email: c.email || '',
            website: c.website || '',
            address: c.address || '',
            city: c.city || '',
            state: c.state || state || '',
            zip: c.zip || '',
            rating: c.rating || 0,
            review_count: c.review_count || 0,
            industry: 'polished_concrete',
            source: 'scraped',
            imported_at: new Date().toISOString(),
            status: 'new',
          }))
        );

        return Response.json({ ok: true, found: contractors.length, saved: saved?.length || limited.length, directory_ids: (saved || []).map(d => d.id) });
      }

      // ── ENRICH DIRECTORY ENTRY ───────────────────────────────
      case 'enrich_directory': {
        const { directory_id, directory_ids = [] } = body;
        const ids = directory_id ? [directory_id] : directory_ids;
        if (ids.length === 0) return Response.json({ error: 'directory_id or directory_ids required' }, { status: 400 });

        const entries = await base44.entities.PcuDirectory.filter({ id: { $in: ids }, enriched: false });
        let enriched = 0, failed = 0;

        for (const entry of entries) {
          try {
            const analysis = await enrichLead(entry);
            await base44.entities.PcuDirectory.update(entry.id, {
              enriched: true,
              enrichment_data: analysis,
              enrichment_data: {
                ...analysis,
                enriched_at: new Date().toISOString(),
              },
            });
            enriched++;
          } catch (e) { failed++; }
        }

        return Response.json({ ok: true, enriched, failed, total: entries.length });
      }

      // ── AI TAKEOFF (analyze floor) ───────────────────────────
      case 'ai_takeoff': {
        const { lead_id } = body;
        if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.get(lead_id);
        const takeoff = await aiTakeoff(lead);

        await base44.entities.PcuLead.update(lead_id, {
          status: 'analyzing',
          ai_analysis: takeoff,
          sqft: lead.sqft || takeoff?.estimated_sqft,
        });

        return Response.json({ ok: true, lead_id, takeoff });
      }

      // ── GENERATE BID ─────────────────────────────────────────
      case 'generate_bid': {
        const { lead_id } = body;
        if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.get(lead_id);
        const takeoff = lead.ai_analysis || {};

        const bid = await generateBid(lead, takeoff);

        await base44.entities.PcuLead.update(lead_id, {
          status: 'bid_ready',
          bid,
        });

        return Response.json({ ok: true, lead_id, bid });
      }

      // ── SEND BID EMAIL ───────────────────────────────────────
      case 'send_bid_email': {
        const { lead_id } = body;
        if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.get(lead_id);
        if (!lead.bid?.proposal) return Response.json({ error: 'Generate bid first' }, { status: 400 });
        if (!lead.email) return Response.json({ error: 'Lead has no email' }, { status: 400 });

        const subject = `Bid Proposal — ${lead.sqft || ''} sqft ${lead.desired_finish || 'flooring'} — ${lead.name}`;
        const result = await sendOutreachEmail(lead.email, subject, lead.bid.proposal);

        if (result.ok) {
          await base44.entities.PcuLead.update(lead_id, {
            status: 'bid_sent',
            last_contact: new Date().toISOString(),
            last_contact_channel: 'email',
          });
        }

        return Response.json({ ok: result.ok, lead_id, sent_via: result.via, error: result.error });
      }

      // ── SEND OUTREACH SMS/MMS ────────────────────────────────
      case 'send_outreach_sms': {
        const { lead_id, from: fromArg, message, media_urls = [] } = body;
        const from = fromArg || getNextFromNumber();
        if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.get(lead_id);
        const to = normalizePhone(lead.phone);
        if (!to) return Response.json({ error: 'Lead has no valid phone' }, { status: 400 });

        const profileId = await getMessagingProfile();
        const msg = message || `Hi ${lead.name?.split(' ')[0] || 'there'}! Jeremy from National Concrete Polishing here. We'd love to give you a free quote on your flooring project. Got 15 min to chat?`;

        const result = await sendTelnyxMessage(to, from, msg, media_urls, profileId);

        if (result.ok) {
          await base44.entities.PcuLead.update(lead_id, {
            last_contact: new Date().toISOString(),
            last_contact_channel: media_urls.length > 0 ? 'mms' : 'sms',
            follow_up_count: (lead.follow_up_count || 0) + 1,
          });
        }

        return Response.json({ ok: result.ok, lead_id, error: result.error });
      }

      // ── SEND WHATSAPP ────────────────────────────────────────
      case 'send_whatsapp': {
        const { lead_id, from: fromArg, message } = body;
        const from = fromArg || getNextFromNumber();
        if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.get(lead_id);
        const to = normalizePhone(lead.phone);
        if (!to) return Response.json({ error: 'Lead has no valid phone' }, { status: 400 });

        const profileId = await getMessagingProfile();
        const msg = message || `Hi ${lead.name?.split(' ')[0] || 'there'}! Jeremy from National Concrete Polishing. We'd love to quote your flooring project. Reply to chat!`;

        // Telnyx WhatsApp API
        const apiKey = secrets.get('TELNYX_API_KEY');
        const res = await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, text: msg, messaging_profile_id: profileId, type: 'WhatsApp' }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          await base44.entities.PcuLead.update(lead_id, {
            last_contact: new Date().toISOString(),
            last_contact_channel: 'whatsapp',
            follow_up_count: (lead.follow_up_count || 0) + 1,
          });
        }

        return Response.json({ ok: res.ok, lead_id, error: data?.errors?.[0]?.detail });
      }

      // ── FOLLOW UP ────────────────────────────────────────────
      case 'follow_up': {
        const { lead_id, from: fromArg, channel = 'email' } = body;
        const from = fromArg || getNextFromNumber();
        if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.get(lead_id);
        const sequence = (lead.follow_up_count || 0) + 1;
        if (sequence > 7) return Response.json({ ok: true, message: 'Max follow-ups reached' });

        const prompt = `Write a follow-up ${channel} message to ${lead.name} about their ${lead.desired_finish || 'flooring'} project (${lead.sqft || ''} sqft).
This is follow-up #${sequence}. They haven't responded to the previous bid.
Be warm, human, not annoying. ${sequence >= 3 ? 'Include a 10% discount offer.' : ''} ${sequence >= 5 ? 'This is the last follow-up — gentle break-up.' : ''}
Under 250 chars for SMS, 600 for email. Return ONLY the message.`;

        const msg = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
        const msgText = typeof msg === 'string' ? msg.trim() : '';

        let sent = false;
        if (channel === 'email' && lead.email) {
          const result = await sendOutreachEmail(lead.email, `Following up — ${lead.name}`, msgText);
          sent = result.ok;
        } else if ((channel === 'sms' || channel === 'mms') && lead.phone && from) {
          const profileId = await getMessagingProfile();
          const to = normalizePhone(lead.phone);
          const result = await sendTelnyxMessage(to, from, msgText, [], profileId);
          sent = result.ok;
        }

        if (sent) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 3);
          await base44.entities.PcuLead.update(lead_id, {
            follow_up_count: sequence,
            next_follow_up: nextDate.toISOString().split('T')[0],
            last_contact: new Date().toISOString(),
            last_contact_channel: channel,
            status: 'follow_up',
          });
        }

        return Response.json({ ok: sent, lead_id, sequence, message: msgText });
      }

      // ── FULL PIPELINE: scrape → enrich → takeoff → bid → email ──
      case 'full_pipeline': {
        const { state, city, trade = 'polished concrete contractor', from: fromArg, max_leads = 20 } = body;
        const from = fromArg || getNextFromNumber();
        if (!state && !city) return Response.json({ error: 'state or city required' }, { status: 400 });

        // Step 1: Scrape
        const contractors = await scrapeDirectory(state, city, trade);
        const limited = contractors.slice(0, max_leads);

        // Save to PcuDirectory and create PcuLeads
        const directoryEntries = await base44.entities.PcuDirectory.bulkCreate(
          limited.map(c => ({
            business_name: c.business_name || '',
            phone: c.phone || '', email: c.email || '', website: c.website || '',
            address: c.address || '', city: c.city || '', state: c.state || state || '',
            rating: c.rating || 0, review_count: c.review_count || 0,
            industry: 'polished_concrete', source: 'scraped',
            imported_at: new Date().toISOString(), status: 'new',
          }))
        );

        // Create PcuLeads from directory entries
        const leads = [];
        for (const entry of directoryEntries || []) {
          const lead = await base44.entities.PcuLead.create({
            name: entry.business_name,
            email: entry.email, phone: entry.phone,
            address: entry.address, location: `${entry.city}, ${entry.state}`,
            industry: 'polished_concrete',
            source: 'directory',
            directory_id: entry.id,
            status: 'new',
          });
          leads.push(lead);
        }

        // Step 2: Enrich + takeoff + bid for each lead
        const results = [];
        for (const lead of leads) {
          try {
            // Enrich
            const dirEntry = await base44.entities.PcuDirectory.get(lead.directory_id);
            const analysis = await enrichLead(dirEntry);
            await base44.entities.PcuDirectory.update(dirEntry.id, { enriched: true, enrichment_data: analysis });

            // Takeoff
            const takeoff = await aiTakeoff(lead);
            await base44.entities.PcuLead.update(lead.id, { ai_analysis: takeoff, sqft: takeoff?.estimated_sqft || 1000, status: 'analyzing' });

            // Bid
            const bid = await generateBid({ ...lead, sqft: takeoff?.estimated_sqft || 1000 }, takeoff);
            await base44.entities.PcuLead.update(lead.id, { bid, status: 'bid_ready' });

            // Send email if available
            let emailSent = false;
            if (lead.email) {
              const emailResult = await sendOutreachEmail(lead.email, `Free Quote — ${lead.name}`, bid.proposal);
              emailSent = emailResult.ok;
              if (emailSent) {
                await base44.entities.PcuLead.update(lead.id, { status: 'bid_sent', last_contact: new Date().toISOString(), last_contact_channel: 'email' });
              }
            }

            // Send SMS if available
            let smsSent = false;
            if (lead.phone && from) {
              const profileId = await getMessagingProfile();
              const to = normalizePhone(lead.phone);
              if (to) {
                const smsResult = await sendTelnyxMessage(to, from, `Hi ${lead.name?.split(' ')[0] || 'there'}! Jeremy from National Concrete Polishing. We'd love to quote your flooring project. Check your email for a free quote!`, [], profileId);
                smsSent = smsResult.ok;
              }
            }

            results.push({ lead_id: lead.id, name: lead.name, bid_total: bid.total, email_sent: emailSent, sms_sent: smsSent });
          } catch (e) {
            results.push({ lead_id: lead.id, error: e.message });
          }
        }

        return Response.json({
          ok: true,
          total_scraped: contractors.length,
          total_leads: leads.length,
          results: results.slice(0, 50),
        });
      }

      // ── CREATE LEAD (from intake form) ───────────────────────
      case 'create_lead': {
        const { name, email, phone, address, sqft, floor_condition, desired_finish, color_choice, notes, photo_urls } = body;
        if (!name) return Response.json({ error: 'name required' }, { status: 400 });

        const lead = await base44.entities.PcuLead.create({
          name, email: email || '', phone: phone || '', address: address || '',
          sqft: sqft || undefined, floor_condition: floor_condition || 'unknown',
          desired_finish: desired_finish || 'flake', color_choice: color_choice || '',
          notes: notes || '', photo_urls: photo_urls || [],
          source: 'intake_form', status: 'new', industry: 'polished_concrete',
        });

        // Auto-run AI takeoff if photos or sqft provided
        if (photo_urls?.length > 0 || sqft) {
          try {
            const takeoff = await aiTakeoff(lead);
            await base44.entities.PcuLead.update(lead.id, { ai_analysis: takeoff, status: 'analyzing' });
          } catch (e) { /* takeoff failed, still ok */ }
        }

        return Response.json({ ok: true, lead_id: lead.id, name });
      }

      // ── BATCH FOLLOW-UP (swarm) ─────────────────────────────
      case 'batch_follow_up': {
        const { from: fromArg, max_per_run = 50 } = body;
        const from = fromArg || getNextFromNumber();
        const now = new Date().toISOString();
        const leads = await base44.entities.PcuLead.filter({
          status: { $in: ['bid_sent', 'follow_up'] },
          follow_up_count: { $lt: 7 },
        });

        const dueLeads = leads.filter(l => !l.next_follow_up || new Date(l.next_follow_up) <= new Date()).slice(0, max_per_run);
        let sent = 0, failed = 0;

        for (const lead of dueLeads) {
          try {
            const channel = lead.email ? 'email' : (lead.phone && from ? 'sms' : null);
            if (!channel) { failed++; continue; }

            const result = await base44.functions.invoke('polishedConcreteEngine', {
              action: 'follow_up', lead_id: lead.id, from, channel,
            });
            if (result.data?.ok) sent++; else failed++;
            await sleep(2000);
          } catch (e) { failed++; }
        }

        return Response.json({ ok: true, sent, failed, total: dueLeads.length });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}