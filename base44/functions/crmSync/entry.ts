import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normEmail, normPhone, dedupKeyCrm } from "../../shared/crmUtils.ts";

// ============================================================================
// crmSync — Aggregates all lead sources (PCU alumni directory, scraped prospects,
// new business registries, PcuLeads) into the unified XtremeCrmContact CRM.
// Deduplicates by email/phone/company. Tags each contact by source.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action = 'sync_all' } = body;

    // ── Dedup key from shared module ──
    const dedupKey = dedupKeyCrm;

    switch (action) {

      // ── SYNC ALL SOURCES INTO CRM ──────────────────────────────
      case 'sync_all': {
        const sources = body.sources || ['pcu_alumni', 'prospects', 'new_business', 'pcu_leads'];
        const stats = {
          pcu_alumni: { fetched: 0, imported: 0, skipped: 0 },
          prospects: { fetched: 0, imported: 0, skipped: 0 },
          new_business: { fetched: 0, imported: 0, skipped: 0 },
          pcu_leads: { fetched: 0, imported: 0, skipped: 0 },
        };

        // Get existing CRM contacts for dedup
        const existing = await base44.entities.XtremeCrmContact.list('-created_date', 500);
        const existingKeys = new Set(existing.map(dedupKey));
        const existingBySource = {};
        for (const c of existing) {
          const src = (c.lead_source || 'manual');
          if (!existingBySource[src]) existingBySource[src] = 0;
          existingBySource[src]++;
        }

        // ── 1. PCU Alumni (PcuDirectory) ──
        if (sources.includes('pcu_alumni')) {
          const directory = await base44.entities.PcuDirectory.list('-created_date', 500);
          stats.pcu_alumni.fetched = directory.length;

          for (const d of directory) {
            const key = dedupKey(d);
            if (existingKeys.has(key)) { stats.pcu_alumni.skipped++; continue; }

            const contact = {
              full_name: d.contact_name || d.business_name,
              email: d.email,
              phone: d.phone,
              company: d.business_name,
              industry: d.industry || 'polished_concrete',
              location: [d.city, d.state].filter(Boolean).join(', '),
              website: d.website,
              lifecycle_stage: 'lead',
              lead_source: 'pcu_alumni',
              tags: ['pcu_alumni', d.state, d.industry].filter(Boolean),
              enrichment_data: {
                source: 'pcu_alumni',
                address: d.address,
                zip: d.zip,
                services: d.services,
                certifications: d.certifications,
                years_in_business: d.years_in_business,
                employee_count: d.employee_count,
                revenue_range: d.revenue_range,
                rating: d.rating,
                review_count: d.review_count,
                social_profiles: d.social_profiles,
                directory_id: d.id,
                directory_status: d.status,
              },
            };

            try {
              await base44.entities.XtremeCrmContact.create(contact);
              existingKeys.add(key);
              stats.pcu_alumni.imported++;
            } catch (e) {
              stats.pcu_alumni.skipped++;
            }
          }
        }

        // ── 2. Prospects (ScrapedLead) ──
        if (sources.includes('prospects')) {
          const leads = await base44.entities.ScrapedLead.list('-created_date', 500);
          stats.prospects.fetched = leads.length;

          for (const l of leads) {
            const key = dedupKey(l);
            if (existingKeys.has(key)) { stats.prospects.skipped++; continue; }

            const contact = {
              full_name: l.enrichment_data?.owner_name || l.business_name,
              email: l.email || l.enrichment_data?.owner_email,
              phone: l.phone || l.enrichment_data?.owner_phone,
              company: l.business_name,
              industry: l.industry,
              location: l.location,
              website: l.website,
              lifecycle_stage: 'lead',
              lead_source: 'scraper',
              tags: ['prospect', l.industry, l.location].filter(Boolean),
              enrichment_data: {
                source: 'scraper',
                address: l.address,
                rating: l.rating,
                review_count: l.review_count,
                google_reviews: l.google_reviews,
                keyword: l.keyword,
                radius_miles: l.radius_miles,
                latitude: l.latitude,
                longitude: l.longitude,
                scraped_lead_id: l.id,
                ...l.enrichment_data,
              },
            };

            try {
              await base44.entities.XtremeCrmContact.create(contact);
              existingKeys.add(key);
              stats.prospects.imported++;
            } catch (e) {
              stats.prospects.skipped++;
            }
          }
        }

        // ── 3. New Business Registries (PcuDirectory + PcuLead where source=new_business) ──
        if (sources.includes('new_business')) {
          // From PcuDirectory where source = new_business
          const newBizDir = await base44.entities.PcuDirectory.filter({ source: 'new_business' });
          stats.new_business.fetched = newBizDir.length;

          for (const d of newBizDir) {
            const key = dedupKey(d);
            if (existingKeys.has(key)) { stats.new_business.skipped++; continue; }

            const contact = {
              full_name: d.contact_name || d.business_name,
              email: d.email,
              phone: d.phone,
              company: d.business_name,
              industry: d.industry || 'polished_concrete',
              location: [d.city, d.state].filter(Boolean).join(', '),
              website: d.website,
              lifecycle_stage: 'lead',
              lead_source: 'new_business',
              tags: ['new_business', d.state].filter(Boolean),
              enrichment_data: {
                source: 'new_business',
                address: d.address,
                services: d.services,
                years_in_business: d.years_in_business,
                employee_count: d.employee_count,
                directory_id: d.id,
              },
            };

            try {
              await base44.entities.XtremeCrmContact.create(contact);
              existingKeys.add(key);
              stats.new_business.imported++;
            } catch (e) {
              stats.new_business.skipped++;
            }
          }

          // Also from PcuLead where source = new_business
          const newBizLeads = await base44.entities.PcuLead.filter({ source: 'new_business' });
          for (const l of newBizLeads) {
            const key = dedupKey(l);
            if (existingKeys.has(key)) { stats.new_business.skipped++; continue; }

            const contact = {
              full_name: l.name,
              email: l.email,
              phone: l.phone,
              company: l.company || l.name,
              industry: l.industry || 'polished_concrete',
              location: l.location,
              lifecycle_stage: l.status === 'won' ? 'won' : l.status === 'lost' ? 'lost' : 'lead',
              lead_source: 'new_business',
              tags: ['new_business', l.industry, l.location].filter(Boolean),
              enrichment_data: {
                source: 'new_business',
                address: l.address,
                sqft: l.sqft,
                floor_condition: l.floor_condition,
                desired_finish: l.desired_finish,
                color_choice: l.color_choice,
                ai_analysis: l.ai_analysis,
                bid: l.bid,
                pcu_lead_id: l.id,
              },
            };

            try {
              await base44.entities.XtremeCrmContact.create(contact);
              existingKeys.add(key);
              stats.new_business.imported++;
            } catch (e) {
              stats.new_business.skipped++;
            }
          }
        }

        // ── 4. PcuLeads (all) ──
        if (sources.includes('pcu_leads')) {
          const pcuLeads = await base44.entities.PcuLead.list('-created_date', 500);
          stats.pcu_leads.fetched = pcuLeads.length;

          for (const l of pcuLeads) {
            const key = dedupKey(l);
            if (existingKeys.has(key)) { stats.pcu_leads.skipped++; continue; }

            const contact = {
              full_name: l.name,
              email: l.email,
              phone: l.phone,
              company: l.company || l.name,
              industry: l.industry || 'polished_concrete',
              location: l.location,
              lifecycle_stage: l.status === 'won' ? 'won' : l.status === 'lost' ? 'lost' : l.status === 'bid_sent' ? 'proposal' : 'lead',
              lead_source: l.source || 'pcu_lead',
              tags: ['pcu_lead', l.source, l.desired_finish].filter(Boolean),
              deal_value: l.bid?.total || 0,
              enrichment_data: {
                source: l.source,
                address: l.address,
                sqft: l.sqft,
                floor_condition: l.floor_condition,
                desired_finish: l.desired_finish,
                color_choice: l.color_choice,
                ai_analysis: l.ai_analysis,
                bid: l.bid,
                pcu_lead_id: l.id,
                follow_up_count: l.follow_up_count,
              },
            };

            try {
              await base44.entities.XtremeCrmContact.create(contact);
              existingKeys.add(key);
              stats.pcu_leads.imported++;
            } catch (e) {
              stats.pcu_leads.skipped++;
            }
          }
        }

        // Get final counts
        const finalContacts = await base44.entities.XtremeCrmContact.list('-created_date', 500);
        const totalImported = stats.pcu_alumni.imported + stats.prospects.imported + stats.new_business.imported + stats.pcu_leads.imported;

        return Response.json({
          ok: true,
          stats,
          total_imported: totalImported,
          total_crm_contacts: finalContacts.length,
          by_source: existingBySource,
        });
      }

      // ── SUMMARY: get CRM stats by source ──────────────────────
      case 'summary': {
        const contacts = await base44.entities.XtremeCrmContact.list('-created_date', 500);

        const bySource = {};
        const byStage = {};
        for (const c of contacts) {
          const src = c.lead_source || 'manual';
          bySource[src] = (bySource[src] || 0) + 1;
          const stage = c.lifecycle_stage || 'lead';
          byStage[stage] = (byStage[stage] || 0) + 1;
        }

        // Count available sources to sync
        const pcuDir = await base44.entities.PcuDirectory.list('-created_date', 500);
        const scraped = await base44.entities.ScrapedLead.list('-created_date', 500);
        const pcuLeads = await base44.entities.PcuLead.list('-created_date', 500);
        const newBizDir = await base44.entities.PcuDirectory.filter({ source: 'new_business' });
        const newBizLeads = await base44.entities.PcuLead.filter({ source: 'new_business' });

        return Response.json({
          ok: true,
          crm_total: contacts.length,
          by_source: bySource,
          by_stage: byStage,
          available: {
            pcu_alumni: pcuDir.length,
            prospects: scraped.length,
            new_business: newBizDir.length + newBizLeads.length,
            pcu_leads: pcuLeads.length,
          },
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}