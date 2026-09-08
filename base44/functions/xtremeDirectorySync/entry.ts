import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normEmail, normPhone, dedupKeyCrm, dedupKeyDirectory } from "../../shared/crmUtils.ts";

// ============================================================================
// xtremeDirectorySync — Ported from Xtreme OS. Scrapes PCU alumni, prospects,
// and new business registrations across all 50 states using LLM + web search.
// Stores everything in PcuDirectory, then syncs into the CRM (XtremeCrmContact).
// ============================================================================

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const TRADES = [
  'epoxy flooring contractor', 'polished concrete contractor', 'concrete coatings contractor',
  'garage floor coating contractor', 'decorative concrete contractor', 'stained concrete contractor',
  'epoxy coatings contractor', 'concrete staining contractor',
];

const INDUSTRY_KEYWORDS = [
  'epoxy flooring', 'polished concrete', 'concrete coatings', 'concrete polishing',
  'garage floor coating', 'decorative concrete', 'concrete resurfacing',
  'floor coating', 'industrial flooring', 'concrete staining', 'stained concrete',
];

const dedupKey = dedupKeyDirectory;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action = 'full_sync' } = body;

    // ── Scrape prospects (contractors) ──
    const scrapeProspects = async (states, maxPerState) => {
      const targetStates = states && states.length > 0 ? states : ALL_STATES;
      const max = maxPerState || 20;
      const stateList = targetStates.join(', ');
      const tradeList = TRADES.join(', ');

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a business intelligence scraper. Search the web and Google Maps comprehensively for concrete flooring, epoxy flooring, and polished concrete contractors.

Target states: ${stateList}
Trades to search: ${tradeList}

For EACH target state, find up to ${max} real businesses. Search Google Maps, Yelp, Google Business Profiles, BBB, and industry directories.

For each business, extract:
- business_name, owner_name, phone, email, website, address, city, state
- specialty_trade (epoxy flooring, polished concrete, concrete coatings, etc.)
- years_in_business, google_business_rating (0-5), google_review_count

Spread results across ALL target states. Return JSON: { "businesses": [...] }
Only include REAL businesses you can verify exist. Do not fabricate.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            businesses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  owner_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  website: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  specialty_trade: { type: 'string' },
                  years_in_business: { type: 'number' },
                  google_business_rating: { type: 'number' },
                  google_review_count: { type: 'number' },
                },
              },
            },
          },
        },
      });

      return result.businesses || [];
    };

    // ── Scrape new business registrations ──
    const scrapeNewBusinesses = async (states, maxPerState) => {
      const targetStates = states && states.length > 0 ? states : ALL_STATES;
      const max = maxPerState || 15;
      const stateList = targetStates.join(', ');
      const keywordList = INDUSTRY_KEYWORDS.join(', ');

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a business intelligence scraper. Search the web for NEWLY REGISTERED or recently started businesses in the concrete and epoxy flooring industry.

Target states: ${stateList}
Industry keywords: ${keywordList}

For EACH target state, find up to ${max} businesses that were recently registered or newly established (within the last 1-3 years). Search:
1. Secretary of State business entity search portals and new filing announcements
2. Google Maps for recently added business listings with few reviews
3. Yelp new business listings in the flooring/concrete category
4. Press releases and local news about new business openings
5. Industry directories
6. Facebook business pages recently created
7. LinkedIn company pages recently created

For each business, extract:
- business_name, owner_name, phone, email, website, address, city, state
- specialty_trade, years_in_business (0 for brand new), registration_date
- google_business_rating, google_review_count, discovery_source

Prioritize businesses that appear to be NEW (low review count, recent registration dates).

Return JSON: { "businesses": [...] }
Only include REAL businesses. Do not fabricate.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            businesses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  owner_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  website: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  specialty_trade: { type: 'string' },
                  years_in_business: { type: 'number' },
                  registration_date: { type: 'string' },
                  google_business_rating: { type: 'number' },
                  google_review_count: { type: 'number' },
                  discovery_source: { type: 'string' },
                },
              },
            },
          },
        },
      });

      return result.businesses || [];
    };

    // ── Scrape PCU alumni (Polished Concrete University alumni) ──
    const scrapePcuAlumni = async () => {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a business intelligence scraper. Search the web comprehensively for Polished Concrete University (PCU) alumni and graduates.

Polished Concrete University is a training/certification program for polished concrete and epoxy flooring contractors. Search for:
1. PCU alumni directories and graduate lists
2. Polished Concrete University Facebook groups and member lists
3. LinkedIn profiles mentioning "Polished Concrete University" or "PCU" in education
4. Contractor directories that list PCU-certified contractors
5. Industry association member directories (e.g., National Concrete Polishing Network, Concrete Polishing Association)
6. Google searches for "polished concrete university alumni", "PCU graduate", "PCU certified contractor"
7. Social media groups, forums, and industry communities
8. Trade show attendee lists and contractor registries

For each PCU alumni contractor found, extract:
- business_name: their business name
- contact_name: the individual alumni name
- phone, email, website, address, city, state, zip
- services: array of services they offer
- certifications: array of certifications (PCU, etc.)
- years_in_business, employee_count, rating, review_count
- social_profiles: { facebook, instagram, linkedin, youtube }

Find as many as possible — aim for 100+ real PCU alumni businesses across all states.

Return JSON: { "alumni": [...] }
Only include REAL businesses you can verify. Do not fabricate.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            alumni: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  contact_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  website: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  zip: { type: 'string' },
                  services: { type: 'array', items: { type: 'string' } },
                  certifications: { type: 'array', items: { type: 'string' } },
                  years_in_business: { type: 'number' },
                  employee_count: { type: 'number' },
                  rating: { type: 'number' },
                  review_count: { type: 'number' },
                  facebook: { type: 'string' },
                  instagram: { type: 'string' },
                  linkedin: { type: 'string' },
                  youtube: { type: 'string' },
                },
              },
            },
          },
        },
      });

      return result.alumni || [];
    };

    // ── Dedup and create in PcuDirectory ──
    const dedupAndCreate = async (businesses, sourceType) => {
      if (!businesses || businesses.length === 0) return { found: 0, imported: 0, duplicates: 0 };

      // Get existing for dedup
      const orConditions = businesses.flatMap(b => {
        const c = [];
        if (b.business_name) c.push({ business_name: b.business_name });
        if (b.phone) c.push({ phone: b.phone });
        return c;
      });

      let existing = [];
      if (orConditions.length > 0) {
        existing = await base44.asServiceRole.entities.PcuDirectory.filter({ $or: orConditions });
      }

      const existingKeys = new Set(existing.map(e =>
        dedupKey(e.business_name, e.phone, e.city, e.state)
      ));

      const newRecords = businesses
        .filter(b => !existingKeys.has(dedupKey(b.business_name, b.phone, b.city, b.state)))
        .map(b => {
          const base = {
            business_name: b.business_name || 'Unknown',
            phone: b.phone || '',
            email: b.email || '',
            address: b.address || '',
            city: b.city || '',
            state: b.state || '',
            zip: b.zip || '',
            website: b.website || '',
            industry: 'polished_concrete',
            services: b.services || (b.specialty_trade ? [b.specialty_trade] : []),
            certifications: b.certifications || [],
            years_in_business: b.years_in_business,
            employee_count: b.employee_count,
            rating: b.rating || b.google_business_rating || 0,
            review_count: b.review_count || b.google_review_count || 0,
            source: sourceType,
            status: 'new',
            imported_at: new Date().toISOString(),
            tags: [sourceType, b.state, b.specialty_trade].filter(Boolean),
          };

          if (sourceType === 'pcu_alumni') {
            base.contact_name = b.contact_name || '';
            base.social_profiles = {
              facebook: b.facebook || '',
              instagram: b.instagram || '',
              linkedin: b.linkedin || '',
              youtube: b.youtube || '',
            };
          } else {
            base.contact_name = b.owner_name || '';
            base.enrichment_data = {
              specialty_trade: b.specialty_trade,
              registration_date: b.registration_date,
              discovery_source: b.discovery_source,
            };
          }

          return base;
        });

      let created = [];
      if (newRecords.length > 0) {
        created = await base44.asServiceRole.entities.PcuDirectory.bulkCreate(newRecords);
      }

      return {
        found: businesses.length,
        imported: created.length,
        duplicates: businesses.length - newRecords.length,
      };
    };

    // ── Sync PcuDirectory into XtremeCrmContact CRM ──
    const syncToCrm = async () => {
      const directory = await base44.asServiceRole.entities.PcuDirectory.list('-created_date', 5000);
      const existingCrm = await base44.asServiceRole.entities.XtremeCrmContact.list('-created_date', 5000);

      const crmKeys = new Set(existingCrm.map(c => dedupKeyCrm(c)));

      let imported = 0;
      const toCreate = [];

      for (const d of directory) {
        const key = dedupKeyCrm(d);

        if (crmKeys.has(key)) continue;

        toCreate.push({
          full_name: d.contact_name || d.business_name,
          email: d.email,
          phone: d.phone,
          company: d.business_name,
          industry: d.industry || 'polished_concrete',
          location: [d.city, d.state].filter(Boolean).join(', '),
          website: d.website,
          lifecycle_stage: 'lead',
          lead_source: d.source,
          tags: [d.source, d.state].filter(Boolean),
          enrichment_data: {
            source: d.source,
            address: d.address,
            services: d.services,
            certifications: d.certifications,
            years_in_business: d.years_in_business,
            employee_count: d.employee_count,
            rating: d.rating,
            review_count: d.review_count,
            directory_id: d.id,
          },
        });
        crmKeys.add(key);
      }

      if (toCreate.length > 0) {
        // Bulk create in batches of 100
        for (let i = 0; i < toCreate.length; i += 100) {
          await base44.asServiceRole.entities.XtremeCrmContact.bulkCreate(toCreate.slice(i, i + 100));
        }
        imported = toCreate.length;
      }

      return { imported, total_directory: directory.length, total_crm: existingCrm.length + imported };
    };

    switch (action) {

      // ── SCRAPE PCU ALUMNI ──
      case 'scrape_pcu_alumni': {
        const alumni = await scrapePcuAlumni();
        const res = await dedupAndCreate(alumni, 'pcu_alumni');
        return Response.json({ ok: true, action: 'pcu_alumni', ...res });
      }

      // ── SCRAPE PROSPECTS ──
      case 'scrape_prospects': {
        const states = body.states || null;
        const maxPerState = body.max_per_state || 20;
        const prospects = await scrapeProspects(states, maxPerState);
        const res = await dedupAndCreate(prospects, 'scraped');
        return Response.json({ ok: true, action: 'prospects', ...res });
      }

      // ── SCRAPE NEW BUSINESSES ──
      case 'scrape_new_businesses': {
        const states = body.states || null;
        const maxPerState = body.max_per_state || 15;
        const newBiz = await scrapeNewBusinesses(states, maxPerState);
        const res = await dedupAndCreate(newBiz, 'new_business');
        return Response.json({ ok: true, action: 'new_businesses', ...res });
      }

      // ── FULL SYNC: scrape all sources + sync to CRM ──
      case 'full_sync': {
        const results = {
          pcu_alumni: { found: 0, imported: 0, duplicates: 0 },
          prospects: { found: 0, imported: 0, duplicates: 0 },
          new_businesses: { found: 0, imported: 0, duplicates: 0 },
        };

        // Scrape PCU alumni
        try {
          const alumni = await scrapePcuAlumni();
          results.pcu_alumni = await dedupAndCreate(alumni, 'pcu_alumni');
        } catch (e) {
          results.pcu_alumni = { error: e.message };
        }

        // Scrape prospects
        try {
          const prospects = await scrapeProspects(body.states, body.max_per_state || 20);
          results.prospects = await dedupAndCreate(prospects, 'scraped');
        } catch (e) {
          results.prospects = { error: e.message };
        }

        // Scrape new businesses
        try {
          const newBiz = await scrapeNewBusinesses(body.states, body.max_per_state || 15);
          results.new_businesses = await dedupAndCreate(newBiz, 'new_business');
        } catch (e) {
          results.new_businesses = { error: e.message };
        }

        // Sync everything to CRM
        let crmSync;
        try {
          crmSync = await syncToCrm();
        } catch (e) {
          crmSync = { error: e.message };
        }

        return Response.json({
          ok: true,
          scrape_results: results,
          crm_sync: crmSync,
          total_imported_to_directory:
            (results.pcu_alumni.imported || 0) +
            (results.prospects.imported || 0) +
            (results.new_businesses.imported || 0),
        });
      }

      // ── SYNC TO CRM ONLY (no scraping) ──
      case 'sync_crm': {
        const res = await syncToCrm();
        return Response.json({ ok: true, ...res });
      }

      // ── DIRECTORY STATS ──
      case 'stats': {
        const directory = await base44.asServiceRole.entities.PcuDirectory.list('-created_date', 5000);
        const bySource = {};
        const byState = {};
        for (const d of directory) {
          bySource[d.source] = (bySource[d.source] || 0) + 1;
          byState[d.state] = (byState[d.state] || 0) + 1;
        }
        const crm = await base44.asServiceRole.entities.XtremeCrmContact.list('-created_date', 5000);
        return Response.json({
          ok: true,
          directory_total: directory.length,
          by_source: bySource,
          by_state: byState,
          crm_total: crm.length,
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}