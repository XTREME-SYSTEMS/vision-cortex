import { createClientFromRequest } from '../../runtime/index';
import { browseStealth, browseSession, str, arr } from '../../shared/cloudBrowser.ts';

// ============================================================================
// CLOUD BROWSER PIPELINE — The complete operational scraping orchestrator.
//
// Actions:
//   scrape_batch   — Parallel-scrape a list of seed URLs, extract intel, store
//   scrape_single  — Scrape one URL with full stealth + extraction
//   discover       — Scrape a seed page, extract sub-links, return them
//   status         — Get pipeline status (recent jobs, engine health)
// ============================================================================

const MAX_PARALLEL = 3;
const MAX_SEED_URLS = 20;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'scrape_batch';

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // ── SCRAPE_BATCH: Parallel-scrape multiple seed URLs ──
    if (action === 'scrape_batch') {
      const urls = arr(body.urls, MAX_SEED_URLS, 500);
      const category = str(body.category, 80) || 'Cloud Browser Pipeline';
      const prompt = str(body.prompt, 2000) ||
        'From the page content below, extract the most important intelligence signals. For each: a concise headline, a 2-3 sentence summary, the source name, any source URL, 2-4 key signals, 1-3 correlations to other markets/sectors, the region, and an impact score 0-100. Ignore navigation, ads, and boilerplate.';

      if (urls.length === 0) return Response.json({ error: 'urls array required' }, { status: 400 });

      const batchId = `batch_${Date.now()}`;
      const results = [];
      const errors = [];

      // Process in parallel chunks of MAX_PARALLEL
      for (let i = 0; i < urls.length; i += MAX_PARALLEL) {
        const chunk = urls.slice(i, i + MAX_PARALLEL);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (url) => {
            const startedAt = Date.now();
            try {
              // Stealth scrape with anti-detection
              const browseResult = await browseStealth(url, {
                retries: 2,
                scroll: true,
                delayMs: 500,
                antiDetect: true,
                maxChars: 40000,
              });

              if (!browseResult.text || browseResult.text.length < 50) {
                return { url, status: 'skipped', reason: 'no_content', chars: browseResult.text?.length || 0 };
              }

              // LLM extraction
              const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `${prompt}\n\nPage URL: ${url}\nPage category: ${category}\n\nPage content:\n"""\n${browseResult.text}\n"""`,
                model: 'gemini_3_flash',
                response_json_schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          headline: { type: 'string' },
                          summary: { type: 'string' },
                          source: { type: 'string' },
                          url: { type: 'string' },
                          signals: { type: 'array', items: { type: 'string' } },
                          correlations: { type: 'array', items: { type: 'string' } },
                          region: { type: 'string' },
                          impact_score: { type: 'number' },
                        },
                        required: ['headline', 'summary'],
                      },
                    },
                  },
                  required: ['items'],
                },
              });

              const records = (llm.items || []).map((it) => ({
                category,
                headline: str(it.headline, 300),
                summary: str(it.summary, 2000),
                source: str(it.source, 200),
                url: str(it.url || url, 500),
                signals: arr(it.signals, 8, 300),
                correlations: arr(it.correlations, 6, 300),
                region: str(it.region, 80) || 'Global',
                impact_score: Number(it.impact_score) || 0,
                source_agent: 'cloud_browser_pipeline',
              })).filter((r) => r.headline);

              if (records.length > 0) {
                await sr.IntelFeed.bulkCreate(records);
              }

              // Log timeclock entry to Supabase
              const latencyMs = Date.now() - startedAt;
              try {
                await fetch(`${supabaseUrl}/rest/v1/agent_timeclock_ledger`, {
                  method: 'POST',
                  headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
                  body: JSON.stringify({
                    slot_id: '0E',
                    action_signature: 'SCRAPE_INTEL_BATCH',
                    execution_depth_bytes: browseResult.text.length,
                    processing_latency_ms: latencyMs,
                    accuracy_rating: records.length > 0 ? 1.00 : 0.50,
                    stability_coefficient: 1.00,
                  }),
                });
              } catch {}

              return {
                url,
                status: 'success',
                chars: browseResult.text.length,
                intel_count: records.length,
                latency_ms: latencyMs,
                attempts: browseResult.attempts,
              };
            } catch (e) {
              return { url, status: 'error', error: str(e.message, 300), latency_ms: Date.now() - startedAt };
            }
          })
        );

        for (const r of chunkResults) {
          if (r.status === 'fulfilled') {
            results.push(r.value);
            if (r.value.status === 'error') errors.push(r.value);
          } else {
            results.push({ status: 'error', error: str(r.reason?.message || 'unknown', 300) });
            errors.push({ error: str(r.reason?.message || 'unknown', 300) });
          }
        }
      }

      const successCount = results.filter((r) => r.status === 'success').length;
      const totalIntel = results.reduce((sum, r) => sum + (r.intel_count || 0), 0);

      // Log to AgentLog
      try {
        await sr.AgentLog.create({
          agent_name: 'Nova-Cartographer',
          level: errors.length > 0 ? 'warn' : 'success',
          message: `Pipeline batch ${batchId}: ${successCount}/${urls.length} URLs scraped, ${totalIntel} intel items extracted`,
          auto_action: 'cloud_browser_pipeline',
        });
      } catch {}

      return Response.json({
        ok: true,
        action: 'scrape_batch',
        batch_id: batchId,
        total_urls: urls.length,
        succeeded: successCount,
        failed: errors.length,
        total_intel_extracted: totalIntel,
        results,
      });
    }

    // ── SCRAPE_SINGLE: Full stealth scrape of one URL ──
    if (action === 'scrape_single') {
      const url = str(body.url, 500).trim();
      const category = str(body.category, 80) || 'Cloud Browser Pipeline';
      const extract = body.extract !== false;

      if (!url) return Response.json({ error: 'url required' }, { status: 400 });

      const startedAt = Date.now();
      const result = await browseStealth(url, {
        retries: body.retries ?? 3,
        scroll: body.scroll !== false,
        delayMs: body.delayMs ?? 600,
        antiDetect: body.antiDetect !== false,
        maxChars: body.maxChars ?? 40000,
        country: body.country || null,
        sessionId: body.sessionId || null,
      });

      if (!extract) {
        return Response.json({ ok: true, url, ...result, latency_ms: Date.now() - startedAt });
      }

      // Extract intel
      const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract intelligence from this page.\n\nURL: ${url}\nCategory: ${category}\n\nContent:\n"""\n${result.text}\n"""`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  headline: { type: 'string' },
                  summary: { type: 'string' },
                  source: { type: 'string' },
                  url: { type: 'string' },
                  signals: { type: 'array', items: { type: 'string' } },
                  correlations: { type: 'array', items: { type: 'string' } },
                  region: { type: 'string' },
                  impact_score: { type: 'number' },
                },
                required: ['headline', 'summary'],
              },
            },
          },
          required: ['items'],
        },
      });

      const records = (llm.items || []).map((it) => ({
        category,
        headline: str(it.headline, 300),
        summary: str(it.summary, 2000),
        source: str(it.source, 200),
        url: str(it.url || url, 500),
        signals: arr(it.signals, 8, 300),
        correlations: arr(it.correlations, 6, 300),
        region: str(it.region, 80) || 'Global',
        impact_score: Number(it.impact_score) || 0,
        source_agent: 'cloud_browser_pipeline',
      })).filter((r) => r.headline);

      if (records.length > 0) await sr.IntelFeed.bulkCreate(records);

      return Response.json({
        ok: true,
        action: 'scrape_single',
        url,
        chars: result.text.length,
        attempts: result.attempts,
        intel_count: records.length,
        items: records,
        latency_ms: Date.now() - startedAt,
      });
    }

    // ── DISCOVER: Scrape a page and extract sub-links ──
    if (action === 'discover') {
      const url = str(body.url, 500).trim();
      if (!url) return Response.json({ error: 'url required' }, { status: 400 });

      const result = await browseStealth(url, { retries: 2, maxChars: 50000 });

      const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `From this page content, extract all interesting sub-page URLs and article links that would be valuable to scrape for business intelligence. Return them as a JSON array of URLs.\n\nPage URL: ${url}\n\nContent:\n"""\n${result.text}\n"""`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            links: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
          },
          required: ['links'],
        },
      });

      const links = arr(llm.links, 50, 500).filter((l) => l.startsWith('http'));

      return Response.json({
        ok: true,
        action: 'discover',
        url,
        discovered_links: links,
        page_chars: result.text.length,
      });
    }

    // ── STATUS: Pipeline status ──
    if (action === 'status') {
      const [recentIntel, recentLogs] = await Promise.all([
        sr.IntelFeed.filter({ source_agent: 'cloud_browser_pipeline' }, '-created_date', 20).catch(() => []),
        sr.AgentLog.filter({ auto_action: 'cloud_browser_pipeline' }, '-created_date', 10).catch(() => []),
      ]);

      return Response.json({
        ok: true,
        action: 'status',
        recent_intel_count: recentIntel.length,
        recent_intel: recentIntel.slice(0, 10).map((i) => ({
          headline: i.headline,
          category: i.category,
          url: i.url,
          impact_score: i.impact_score,
          created: i.created_date,
        })),
        recent_jobs: recentLogs.map((l) => ({
          message: l.message,
          level: l.level,
          created: l.created_date,
        })),
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}