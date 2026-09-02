import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// searchConsoleSync — pulls search performance, top queries/pages, and sitemap
// indexing status from Google Search Console for a tracked site, then persists
// a daily snapshot to the SearchConsoleMetrics entity.
//
// Uses the SHARED google_search_console connector (builder's account).
// Invoke: base44.functions.invoke('searchConsoleSync', { site_url, period_days, autonomous })
// Returns: { ok, metrics_id, site_url, clicks, impressions, ctr, position }

const GSC_API = 'https://www.googleapis.com/webmasters/v3';

function encodeSiteUrl(siteUrl) {
  return encodeURIComponent(siteUrl);
}

async function gscFetch(token, path, method = 'GET', body) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${GSC_API}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`GSC ${res.status}: ${json.error?.message || text}`);
  return json;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const requestedSite = (body.site_url || 'thevisioncortex.com').trim().toLowerCase().replace(/\/+$/, '');
    const periodDays = Math.min(Math.max(body.period_days || 7, 1), 90);
    const autonomous = !!body.autonomous;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');
    if (!accessToken) return Response.json({ error: 'Google Search Console not connected' }, { status: 400 });

    // ── 1. Resolve the exact GSC siteUrl identifier ──
    const sitesList = await gscFetch(accessToken, '/sites');
    const allSites = sitesList.siteEntry || [];
    if (allSites.length === 0) return Response.json({ error: 'No sites found in your Google Search Console account' }, { status: 404 });

    // Match by hostname (strip sc-domain: prefix and https://)
    const normalize = (s) => s.toLowerCase().replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    let matched = allSites.find((s) => normalize(s.siteUrl) === requestedSite)
      || allSites.find((s) => normalize(s.siteUrl).includes(requestedSite))
      || allSites.find((s) => requestedSite.includes(normalize(s.siteUrl)));
    if (!matched) {
      return Response.json({
        error: `Site "${requestedSite}" not found in Search Console`,
        available_sites: allSites.map((s) => s.siteUrl),
      }, { status: 404 });
    }
    const rawSiteUrl = matched.siteUrl;
    const sitePath = `/sites/${encodeSiteUrl(rawSiteUrl)}`;
    const siteType = rawSiteUrl.startsWith('sc-domain:') ? 'sc-domain' : 'url-prefix';
    const displayUrl = normalize(rawSiteUrl);

    // ── 2. Date range (last N days, GSC data has ~2-day lag) ──
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date(end);
    start.setDate(start.getDate() - (periodDays - 1));
    const fmt = (d) => d.toISOString().slice(0, 10);
    const startDate = fmt(start);
    const endDate = fmt(end);

    // ── 3. Search analytics: aggregate, by query, by page ──
    const [aggRes, queryRes, pageRes, sitemapRes] = await Promise.all([
      gscFetch(accessToken, `${sitePath}/searchAnalytics/query`, 'POST', {
        startDate, endDate, rowLimit: 1,
      }),
      gscFetch(accessToken, `${sitePath}/searchAnalytics/query`, 'POST', {
        startDate, endDate, dimensions: ['query'], rowLimit: 50,
      }),
      gscFetch(accessToken, `${sitePath}/searchAnalytics/query`, 'POST', {
        startDate, endDate, dimensions: ['page'], rowLimit: 50,
      }),
      gscFetch(accessToken, `${sitePath}/sitemaps`).catch(() => ({ sitemap: [] })),
    ]);

    const aggRow = (aggRes.rows || [])[0] || {};
    const clicks = aggRow.clicks || 0;
    const impressions = aggRow.impressions || 0;
    const ctr = aggRow.ctr || 0;
    const position = aggRow.position || 0;

    const topQueries = (queryRes.rows || []).map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    const topPages = (pageRes.rows || []).map((r) => ({
      url: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    const sitemaps = (sitemapRes.sitemap || []).map((s) => ({
      path: s.path || '',
      last_submitted: s.lastSubmitted || '',
      last_downloaded: s.lastDownloaded || '',
      is_pending: !!s.isPending,
      is_sitemaps_index: !!s.isSitemapsIndex,
      submitted: s.submitted || 0,
      indexed: s.indexed || 0,
      errors: s.errors || 0,
      warnings: s.warnings || 0,
    }));

    // ── 4. Persist the snapshot ──
    const sr = base44.asServiceRole.entities;
    const metrics = await sr.SearchConsoleMetrics.create({
      site_url: displayUrl,
      report_date: endDate,
      period_days: periodDays,
      clicks,
      impressions,
      ctr,
      position,
      top_queries: topQueries,
      top_pages: topPages,
      sitemaps,
      site_type: siteType,
      raw_site_url: rawSiteUrl,
      synced_at: new Date().toISOString(),
      autonomous,
    });

    await sr.AgentLog.create({
      agent_name: 'vision_cortex',
      level: 'success',
      message: `Search Console sync for ${displayUrl}: ${clicks} clicks, ${impressions} impressions, pos ${position.toFixed(1)}`,
      auto_action: 'search_console_sync',
    });

    return Response.json({
      ok: true,
      metrics_id: metrics.id,
      site_url: displayUrl,
      report_date: endDate,
      period_days: periodDays,
      clicks,
      impressions,
      ctr,
      position,
      top_queries: topQueries,
      top_pages: topPages,
      sitemaps,
    });
  } catch (error) {
    console.error('searchConsoleSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}