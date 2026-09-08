import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// ============================================================================
// batchLeadFactory — Full autonomous lead pipeline:
// 1. Scrape every business in an industry + state
// 2. Full enrichment (employees, revenue, equipment, materials)
// 3. Website audit (leaks, upsells, AI tools to offer)
// 4. Generate personalized outreach MMS message per lead
// 5. Queue leads for batch MMS outreach
// ============================================================================

const TELNYX_BASE = 'https://api.telnyx.com/v2';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action = 'run_pipeline' } = body;

  // ── LLM helper ──────────────────────────────────────────────
  const llm = async (prompt, schema = null) => {
    const payload = { prompt, model: 'gemini_3_flash', add_context_from_internet: true };
    if (schema) payload.response_json_schema = schema;
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM(payload);
    return schema ? res : (typeof res === 'string' ? res : JSON.stringify(res));
  };

  // ── Telnyx messaging profile resolver ──────────────────────
  const getMessagingProfile = async () => {
    const apiKey = secrets.get('TELNYX_API_KEY');
    if (!apiKey) return null;
    const r = await fetch(`${TELNYX_BASE}/messaging_profiles`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
    });
    const data = await r.json().catch(() => ({}));
    const profiles = data?.data || [];
    if (profiles.length > 0) return profiles[0].id;
    const cr = await fetch(`${TELNYX_BASE}/messaging_profiles`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vision Cortex Outreach', enabled: true }),
    });
    const cd = await cr.json().catch(() => ({}));
    return cd?.data?.id || null;
  };

  switch (action) {

    // ── FULL PIPELINE: scrape → enrich → audit → message ─────
    case 'run_pipeline': {
      const { industry, location, keyword = '', radius_miles = 50, campaign_id, hooks = ['free_audit', 'ai_tools', 'free_lead_gen_website'] } = body;
      if (!industry || !location) return Response.json({ error: 'industry and location required' }, { status: 400 });

      let campaign = campaign_id ? await base44.entities.OutreachCampaign.get(campaign_id) : null;

      // Step 1: SCRAPE — find every business
      let leadIds = campaign?.lead_ids || [];
      let scraped = [];

      if (!campaign || leadIds.length === 0) {
        if (campaign) await base44.entities.OutreachCampaign.update(campaign.id, { status: 'scraping', started_at: new Date().toISOString() });

        const scrapePrompt = `You are a business lead scraper. Find EVERY ${industry} company in ${location}${keyword ? ` matching "${keyword}"` : ''}.
Search Google Maps, Yelp, and business directories. Return a JSON array of ALL businesses found (aim for 50-200+).
For each business include: business_name, address, phone (E.164 if possible), website, email (if found), rating (0-5), review_count, latitude, longitude.
Be exhaustive — cover every city in ${location}. Do not skip small companies.

Return ONLY a JSON object: {"leads": [...], "errors": []}`;

        const scrapeRes = await llm(scrapePrompt, {
          type: 'object',
          properties: {
            leads: { type: 'array', items: { type: 'object', properties: {
              business_name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' },
              website: { type: 'string' }, email: { type: 'string' }, rating: { type: 'number' },
              review_count: { type: 'integer' }, latitude: { type: 'number' }, longitude: { type: 'number' }
            } } },
            errors: { type: 'array', items: { type: 'string' } }
          }
        });

        scraped = scrapeRes?.leads || [];

        // Save to ScrapedLead entity
        if (scraped.length > 0) {
          const created = await base44.entities.ScrapedLead.bulkCreate(
            scraped.map(l => ({
              business_name: l.business_name || '',
              address: l.address || '',
              phone: l.phone || '',
              website: l.website || '',
              email: l.email || '',
              industry, location, keyword,
              radius_miles,
              rating: l.rating || 0,
              review_count: l.review_count || 0,
              latitude: l.latitude,
              longitude: l.longitude,
              scraped_at: new Date().toISOString(),
            }))
          );
          leadIds = (created || []).map(l => l.id);
        }

        if (campaign) {
          await base44.entities.OutreachCampaign.update(campaign.id, {
            total_leads: leadIds.length,
            lead_ids: leadIds,
            status: 'enriching',
          });
        }
      }

      if (leadIds.length === 0) {
        if (campaign) await base44.entities.OutreachCampaign.update(campaign.id, { status: 'failed', error_message: 'No leads found' });
        return Response.json({ ok: false, error: 'No leads found', campaign_id: campaign?.id });
      }

      // Step 2 + 3 + 4: ENRICH + AUDIT + MESSAGE per lead
      const allLeads = await base44.entities.ScrapedLead.filter({ id: { $in: leadIds } });
      let enrichedCount = 0;
      let auditedCount = 0;
      const sampleMessages = [];

      for (const lead of allLeads) {
        try {
          // ── ENRICHMENT ──
          if (!lead.enriched) {
            const enrichPrompt = `Research the company "${lead.business_name}" at ${lead.address || lead.website || ''}.
Find: estimated employee count, estimated yearly revenue range, estimated equipment they use, estimated materials they use,
owner/decision maker name and phone if findable, social profiles, tech stack of their website.
Return JSON: {"employee_count": "", "estimated_revenue": "", "equipment": "", "materials": "", "owner_name": "", "owner_phone": "", "social_profiles": [], "tech_stack": []}`;

            const enrichData = await llm(enrichPrompt, {
              type: 'object',
              properties: {
                employee_count: { type: 'string' }, estimated_revenue: { type: 'string' },
                equipment: { type: 'string' }, materials: { type: 'string' },
                owner_name: { type: 'string' }, owner_phone: { type: 'string' },
                social_profiles: { type: 'array', items: { type: 'string' } },
                tech_stack: { type: 'array', items: { type: 'string' } },
              }
            });

            await base44.entities.ScrapedLead.update(lead.id, {
              enriched: true,
              enrichment_data: { ...enrichData, enriched_at: new Date().toISOString() },
            });
            enrichedCount++;
          }

          // ── WEBSITE AUDIT ──
          let auditData = lead.enrichment_data?.audit;
          if (lead.website && !auditData) {
            const auditPrompt = `Audit the website ${lead.website} for "${lead.business_name}" (a ${industry} company).
Find: website leaks (broken pages, missing SEO, slow loading, no mobile, no lead capture), potential upsells (booking system, online quotes, payment portal, CRM), and AI tools they could benefit from (AI chatbot, AI lead gen, AI scheduling, AI follow-up, AI content).
Return JSON: {"leaks": [], "upsells": [], "ai_tools": [], "overall_score": 0-100, "summary": ""}`;

            auditData = await llm(auditPrompt, {
              type: 'object',
              properties: {
                leaks: { type: 'array', items: { type: 'string' } },
                upsells: { type: 'array', items: { type: 'string' } },
                ai_tools: { type: 'array', items: { type: 'string' } },
                overall_score: { type: 'number' },
                summary: { type: 'string' },
              }
            });

            const existingEnrich = (await base44.entities.ScrapedLead.get(lead.id)).enrichment_data || {};
            await base44.entities.ScrapedLead.update(lead.id, {
              enrichment_data: { ...existingEnrich, audit: auditData },
            });
            auditedCount++;
          }

          // ── GENERATE OUTREACH MESSAGE ──
          const ownerName = lead.enrichment_data?.owner_name || 'there';
          const hookText = {
            free_audit: `FREE website audit showing you exactly where you're losing leads`,
            ai_tools: `AI tools that auto-respond to every call and text so you never miss a job`,
            free_lead_gen_website: `a FREE lead generation website for the first month — we only get paid if you get leads`,
            coupons: `an exclusive ${industry} owner discount`,
            proposal: `a custom proposal for scaling your ${industry} business`,
          };
          const hookLines = hooks.map(h => hookText[h] || h).filter(Boolean);

          const msgPrompt = `Write a short, human, conversational MMS message to ${ownerName} at ${lead.business_name}, a ${industry} company in ${location}.
We are Vision Cortex. We ran a quick audit of their website and found issues.
Include these hooks naturally: ${hookLines.join('; ')}.
Mention we found ${auditData?.leaks?.length || 'several'} website issues they're losing leads from.
Keep it under 320 chars, friendly, not salesy. End with a question inviting a quick chat.
Do NOT use placeholders — write the actual message ready to send.`;

          const message = await llm(msgPrompt);
          const cleanMsg = (typeof message === 'string' ? message : message?.message || '').trim();

          if (cleanMsg) {
            const existingEnrich = (await base44.entities.ScrapedLead.get(lead.id)).enrichment_data || {};
            await base44.entities.ScrapedLead.update(lead.id, {
              enrichment_data: { ...existingEnrich, outreach_message: cleanMsg, audit: auditData || existingEnrich.audit },
            });
            if (sampleMessages.length < 3) {
              sampleMessages.push({ business: lead.business_name, phone: lead.phone || lead.enrichment_data?.owner_phone, message: cleanMsg });
            }
          }

          // Update campaign progress
          if (campaign) {
            await base44.entities.OutreachCampaign.update(campaign.id, {
              enriched_leads: enrichedCount,
              audited_leads: auditedCount,
              progress: Math.round(((enrichedCount + auditedCount) / (allLeads.length * 2)) * 100),
            });
          }

        } catch (leadErr) {
          console.log(`Lead ${lead.business_name} failed: ${leadErr.message}`);
        }
      }

      // Finalize
      if (campaign) {
        await base44.entities.OutreachCampaign.update(campaign.id, {
          status: 'completed',
          progress: 100,
          enriched_leads: enrichedCount,
          audited_leads: auditedCount,
          completed_at: new Date().toISOString(),
          results: { ...campaign.results, sample_messages: sampleMessages },
        });
      }

      return Response.json({
        ok: true,
        campaign_id: campaign?.id,
        total_leads: leadIds.length,
        enriched: enrichedCount,
        audited: auditedCount,
        sample_messages: sampleMessages,
      });
    }

    // ── SCRAPE ONLY ───────────────────────────────────────────
    case 'scrape': {
      const { industry, location, keyword = '', radius_miles = 50 } = body;
      if (!industry || !location) return Response.json({ error: 'industry and location required' }, { status: 400 });

      const scrapePrompt = `Find EVERY ${industry} company in ${location}${keyword ? ` matching "${keyword}"` : ''}.
Return JSON: {"leads": [{"business_name":"","address":"","phone":"","website":"","email":"","rating":0,"review_count":0,"latitude":0,"longitude":0}], "errors": []}
Be exhaustive — cover every city. Aim for 50-200+ businesses.`;

      const scrapeRes = await llm(scrapePrompt, {
        type: 'object',
        properties: {
          leads: { type: 'array', items: { type: 'object', properties: {
            business_name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' },
            website: { type: 'string' }, email: { type: 'string' }, rating: { type: 'number' },
            review_count: { type: 'integer' }, latitude: { type: 'number' }, longitude: { type: 'number' }
          } } },
          errors: { type: 'array', items: { type: 'string' } }
        }
      });

      const leads = scrapeRes?.leads || [];
      let saved = [];
      if (leads.length > 0) {
        saved = await base44.entities.ScrapedLead.bulkCreate(
          leads.map(l => ({
            business_name: l.business_name || '', address: l.address || '', phone: l.phone || '',
            website: l.website || '', email: l.email || '', industry, location, keyword, radius_miles,
            rating: l.rating || 0, review_count: l.review_count || 0,
            latitude: l.latitude, longitude: l.longitude, scraped_at: new Date().toISOString(),
          }))
        );
      }
      return Response.json({ ok: true, scraped: leads.length, saved: saved.length, lead_ids: (saved || []).map(l => l.id) });
    }

    // ── ENRICH SINGLE LEAD ────────────────────────────────────
    case 'enrich_lead': {
      const { lead_id } = body;
      if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });
      const lead = await base44.entities.ScrapedLead.get(lead_id);

      const enrichPrompt = `Research "${lead.business_name}" at ${lead.address || lead.website || ''}.
Return JSON: {"employee_count":"","estimated_revenue":"","equipment":"","materials":"","owner_name":"","owner_phone":"","social_profiles":[],"tech_stack":[]}`;

      const enrichData = await llm(enrichPrompt, {
        type: 'object',
        properties: {
          employee_count: { type: 'string' }, estimated_revenue: { type: 'string' },
          equipment: { type: 'string' }, materials: { type: 'string' },
          owner_name: { type: 'string' }, owner_phone: { type: 'string' },
          social_profiles: { type: 'array', items: { type: 'string' } },
          tech_stack: { type: 'array', items: { type: 'string' } },
        }
      });

      const updated = await base44.entities.ScrapedLead.update(lead_id, { enriched: true, enrichment_data: enrichData });
      return Response.json({ ok: true, lead: updated });
    }

    // ── AUDIT SINGLE LEAD WEBSITE ─────────────────────────────
    case 'audit_lead': {
      const { lead_id } = body;
      if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });
      const lead = await base44.entities.ScrapedLead.get(lead_id);
      if (!lead.website) return Response.json({ error: 'No website to audit' }, { status: 400 });

      const auditPrompt = `Audit ${lead.website} for "${lead.business_name}" (${lead.industry}).
Return JSON: {"leaks":[],"upsells":[],"ai_tools":[],"overall_score":0,"summary":""}`;

      const auditData = await llm(auditPrompt, {
        type: 'object',
        properties: {
          leaks: { type: 'array', items: { type: 'string' } },
          upsells: { type: 'array', items: { type: 'string' } },
          ai_tools: { type: 'array', items: { type: 'string' } },
          overall_score: { type: 'number' },
          summary: { type: 'string' },
        }
      });

      const existing = lead.enrichment_data || {};
      const updated = await base44.entities.ScrapedLead.update(lead_id, {
        enrichment_data: { ...existing, audit: auditData },
      });
      return Response.json({ ok: true, audit: auditData, lead: updated });
    }

    // ── GENERATE OUTREACH MESSAGE FOR A LEAD ──────────────────
    case 'generate_message': {
      const { lead_id, hooks = ['free_audit', 'ai_tools', 'free_lead_gen_website'] } = body;
      if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });
      const lead = await base44.entities.ScrapedLead.get(lead_id);

      const ownerName = lead.enrichment_data?.owner_name || 'there';
      const leakCount = lead.enrichment_data?.audit?.leaks?.length || 'several';
      const hookText = {
        free_audit: `a FREE website audit showing exactly where you're losing leads`,
        ai_tools: `AI tools that auto-respond to every call and text so you never miss a job`,
        free_lead_gen_website: `a FREE lead generation website for the first month — we only get paid if you get leads`,
      };
      const hookLines = hooks.map(h => hookText[h] || h);

      const msgPrompt = `Write a short MMS to ${ownerName} at ${lead.business_name} (${lead.industry} in ${lead.location}).
We are Vision Cortex. We found ${leakCount} website issues losing them leads.
Hooks: ${hookLines.join('; ')}.
Under 320 chars, friendly, end with a question. No placeholders.`;

      const message = await llm(msgPrompt);
      const cleanMsg = typeof message === 'string' ? message : message?.message || '';

      const existing = lead.enrichment_data || {};
      await base44.entities.ScrapedLead.update(lead_id, { enrichment_data: { ...existing, outreach_message: cleanMsg } });
      return Response.json({ ok: true, message: cleanMsg });
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}