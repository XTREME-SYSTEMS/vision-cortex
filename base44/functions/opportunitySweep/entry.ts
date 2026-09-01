import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { str } from '../../shared/cloudBrowser.ts';

// Uses LLM with web search (add_context_from_internet) to find people requesting
// tech services across Craigslist, Reddit, LinkedIn, forums, job boards, freelance
// platforms, and anywhere else on the internet. More reliable than direct scraping
// (no captchas, no IP blocks) and covers the entire web.

const SEARCH_QUERIES = [
  {
    name: 'Website development requests',
    query: 'site:craigslist.org OR site:reddit.com "need a website built" OR "looking for web developer" OR "need a website created" OR "build me a website" OR "redesign my website" 2025 2026'
  },
  {
    name: 'App development requests',
    query: '"need an app built" OR "looking for app developer" OR "need a mobile app" OR "build me an app" OR "need an iOS app" OR "need an Android app" freelance gig 2025 2026'
  },
  {
    name: 'AI automation requests',
    query: '"need AI automation" OR "looking for AI developer" OR "AI enhancement services" OR "automate my business" OR "need ChatGPT integration" OR "AI consulting" 2025 2026'
  },
  {
    name: 'Data scraping requests',
    query: '"data scraping service" OR "need data collected" OR "web scraping services" OR "data collection services" OR "need a scraper" OR "extract data from" freelance 2025 2026'
  },
  {
    name: 'Automation specialist requests',
    query: '"automation specialist" OR "need workflow automation" OR "business automation" OR "automate my workflow" OR "need Zapier help" OR "need Make.com automation" 2025 2026'
  },
  {
    name: 'Software developer requests',
    query: '"need a developer" OR "looking for software developer" OR "need a programmer" OR "need coding help" OR "need a coder" freelance contract gig 2025 2026'
  },
  {
    name: 'Tech consulting requests',
    query: '"need tech help" OR "technology consulting" OR "IT services needed" OR "digital transformation" OR "need tech consultant" OR "need IT support" small business 2025 2026'
  },
  {
    name: 'E-commerce + online business',
    query: '"need an online store" OR "build me an ecommerce site" OR "need a Shopify expert" OR "need a WooCommerce site" OR "set up online payments" 2025 2026'
  },
  {
    name: 'Reddit forhire + slavelabour',
    query: 'site:reddit.com r/forhire OR r/slavelabour OR r/Jobs4Bitcoins "website" OR "app" OR "automation" OR "scraping" OR "AI" 2025 2026'
  },
  {
    name: 'Craigslist gigs + services',
    query: 'site:craigslist.org "web design" OR "website" OR "app development" OR "AI" OR "automation" OR "data entry" gigs services 2025 2026'
  },
  {
    name: 'LinkedIn + freelance platforms',
    query: 'site:linkedin.com OR site:upwork.com OR site:fiverr.com "need a website" OR "looking for developer" OR "AI automation" OR "app development" 2025 2026'
  },
  {
    name: 'Forums + communities',
    query: 'site:reddit.com OR site:news.ycombinator.com OR site:indiehackers.com "looking for" OR "need help" OR "can someone build" OR "need a developer" 2025 2026'
  },
];

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          contact_name: { type: 'string' },
          contact_email: { type: 'string' },
          contact_phone: { type: 'string' },
          location: { type: 'string' },
          budget: { type: 'string' },
          source_url: { type: 'string' },
          source_platform: { type: 'string' },
          industry: { type: 'string' },
          sub_industry: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          score: { type: 'number' }
        }
      }
    }
  }
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const maxQueries = Math.min(Number(body?.max_queries) || 5, 8);
    const queryOffset = Number(body?.query_offset) || 0;

    // Pick a rotating batch of queries
    const batch = [];
    for (let i = 0; i < maxQueries; i++) {
      batch.push(SEARCH_QUERIES[(queryOffset + i) % SEARCH_QUERIES.length]);
    }

    const batchId = `sweep_${Date.now()}`;
    const allExtracted = [];
    let queriesRun = 0;
    let queriesFailed = 0;

    for (const sq of batch) {
      try {
        const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an autonomous opportunity scout for a technology services company that builds websites, web apps, mobile apps, AI automation systems, data scraping pipelines, and business automation tools.

Search the internet for this query:
"${sq.query}"

Find REAL, CURRENT posts, ads, listings, or messages where someone is REQUESTING, SEEKING, or LOOKING FOR technology services. Check Craigslist, Reddit, LinkedIn, Upwork, Fiverr, Hacker News, forums, job boards, freelance platforms, and any other source.

For each opportunity, extract ALL available information:
- title: The headline of their request
- description: What they need (as detailed as possible)
- contact_name: Name if available
- contact_email: Email if available
- contact_phone: Phone if available
- location: City/region if available
- budget: Any price or budget mentioned
- source_url: The actual URL of the posting
- source_platform: The platform (craigslist, reddit, linkedin, upwork, etc.)
- industry / sub_industry: The business area
- keywords: Relevant keywords that matched
- score: 0-100 relevance score (100 = perfect fit for our website/app/AI/automation/scraping services)

CRITICAL RULES:
- Only include posts REQUESTING help — NOT posts offering services
- Only include real, specific requests — NOT generic job descriptions from companies hiring employees
- Include the actual source_url when available — this is essential for the user to visit the posting
- If you can't find the exact URL, still include the opportunity with as much info as possible
- Score based on how well their need matches what we do (websites, apps, AI, automation, scraping)
- Find as many genuine opportunities as possible — aim for 5-15 per search`,
          model: 'gemini_3_flash',
          add_context_from_internet: true,
          response_json_schema: EXTRACTION_SCHEMA
        });

        const opps = llm?.opportunities || [];
        for (const opp of opps) {
          if (!opp.title || opp.title.length < 5) continue;
          allExtracted.push({
            title: str(opp.title, 300),
            source: str(opp.source_platform || sq.name, 100),
            source_url: str(opp.source_url || '', 500),
            description: str(opp.description, 3000),
            contact_name: str(opp.contact_name, 200),
            contact_email: str(opp.contact_email, 200),
            contact_phone: str(opp.contact_phone, 100),
            location: str(opp.location, 200),
            industry: str(opp.industry, 200),
            sub_industry: str(opp.sub_industry, 200),
            budget: str(opp.budget, 200),
            keywords: Array.isArray(opp.keywords) ? opp.keywords.slice(0, 20).map(k => str(k, 100)) : [],
            score: Math.min(100, Math.max(0, Number(opp.score) || 0)),
            research_status: 'pending',
            response_status: 'pending',
            status: 'new',
            scraped_at: new Date().toISOString(),
            batch_id: batchId
          });
        }
        queriesRun++;
      } catch (err) {
        queriesFailed++;
        console.error(`[opportunitySweep] FAILED query "${sq.name}":`, err?.message || err);
      }
    }

    // Deduplicate against existing opportunities by source_url + title
    let newCount = 0;
    let dupCount = 0;
    const toCreate = [];

    for (const opp of allExtracted) {
      try {
        // Check by source_url if we have one
        if (opp.source_url && opp.source_url.length > 10) {
          const existing = await base44.asServiceRole.entities.Opportunity.filter(
            { source_url: opp.source_url },
            '-created_date',
            1
          );
          if (existing && existing.length > 0) { dupCount++; continue; }
        }
        // Check by title + source
        const titleMatch = await base44.asServiceRole.entities.Opportunity.filter(
          { source: opp.source, title: opp.title },
          '-created_date',
          1
        );
        if (titleMatch && titleMatch.length > 0) { dupCount++; continue; }

        toCreate.push(opp);
      } catch {
        // If dedup check fails, still try to create
        toCreate.push(opp);
      }
    }

    if (toCreate.length > 0) {
      await base44.asServiceRole.entities.Opportunity.bulkCreate(toCreate);
      newCount = toCreate.length;
    }

    return Response.json({
      batch_id: batchId,
      queries_run: queriesRun,
      queries_failed: queriesFailed,
      opportunities_extracted: allExtracted.length,
      new_opportunities: newCount,
      duplicates_skipped: dupCount,
      next_query_offset: (queryOffset + maxQueries) % SEARCH_QUERIES.length,
      total_queries: SEARCH_QUERIES.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}