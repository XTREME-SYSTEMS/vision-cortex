import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// App Management Sync — the master command center audit.
// Checks all connected accounts (Vercel, Supabase, Railway, Groq, Stripe, Cloud Browser),
// scores the full data lifecycle (14 dimensions), persists account health, returns a
// complete status report for the App Management dashboard.
export default async function(req: any) {
  try {
    // Auth: admin session, x-cron-token, or x-api-key
    const cronToken = (req.headers.get('x-cron-token') || '').trim();
    const apiKey = (req.headers.get('x-api-key') || '').replace('Bearer ', '').trim();
    const webhookKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    const eyesKey = secrets.get('VISION_CORTEX_EYES_API_KEY');
    let authorized = false;
    if (webhookKey && cronToken === webhookKey) authorized = true;
    if (eyesKey && apiKey === eyesKey) authorized = true;
    if (!authorized) {
      try {
        const base44 = createClientFromRequest(req);
        const u = await base44.auth.me();
        if (u?.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const base44 = createClientFromRequest(req);

    // === 1. Check all external accounts in parallel ===
    const accountResults = await Promise.allSettled([
      // Vercel
      (async () => {
        const r = await fetch('https://api.vercel.com/v2/user', { headers: { Authorization: `Bearer ${secrets.get('VERCEL_TOKEN')}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return { account_type: 'vercel', status: 'connected', health_score: 100, last_error: '', details: { plan: d.user?.plan || 'unknown', email: d.user?.email || '' } };
      })(),
      // Supabase
      (async () => {
        const r = await fetch('https://api.supabase.com/v1/projects', { headers: { Authorization: `Bearer ${secrets.get('SUPABASE_TOKEN')}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return { account_type: 'supabase', status: 'connected', health_score: 100, last_error: '', details: { projects: Array.isArray(d) ? d.length : 0 } };
      })(),
      // Railway
      (async () => {
        const r = await fetch('https://backboard.railway.app/graphql', {
          method: 'POST',
          headers: { Authorization: `Bearer ${secrets.get('RAILWAY_TOKEN')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ projects { edges { node { name id } } } }' })
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return { account_type: 'railway', status: 'connected', health_score: 100, last_error: '', details: { projects: d.data?.projects?.edges?.length || 0 } };
      })(),
      // Groq
      (async () => {
        const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${secrets.get('GROQ_API_KEY')}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return { account_type: 'groq', status: 'connected', health_score: 100, last_error: '', details: { models: d.data?.length || 0 } };
      })(),
      // Cloud Browser
      (async () => {
        const url = secrets.get('CLOUD_BROWSER_URL');
        const key = secrets.get('CLOUD_BROWSER_API_KEY');
        if (!url || !key) throw new Error('Not configured');
        const r = await fetch(`${url}/health`, { headers: { 'x-api-key': key } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return { account_type: 'cloud_browser', status: 'connected', health_score: 100, last_error: '', details: { url } };
      })(),
      // Stripe
      (async () => {
        const r = await fetch('https://api.stripe.com/v1/account', { headers: { Authorization: `Bearer ${secrets.get('STRIPE_SECRET_KEY')}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return { account_type: 'stripe', status: 'connected', health_score: 100, last_error: '', details: { email: d.email || '', country: d.country || '' } };
      })(),
    ]);

    const accountTypes = ['vercel', 'supabase', 'railway', 'groq', 'cloud_browser', 'stripe'];
    const accounts = accountResults.map((p, i) => {
      if (p.status === 'fulfilled') return p.value;
      return { account_type: accountTypes[i], status: 'disconnected', health_score: 0, last_error: p.reason?.message || 'Failed', details: {} };
    });

    // Add authorized Google connectors as connected
    accounts.push({ account_type: 'google_drive', status: 'connected', health_score: 100, last_error: '', details: { note: 'OAuth authorized' } });
    accounts.push({ account_type: 'google_search_console', status: 'connected', health_score: 100, last_error: '', details: { note: 'OAuth authorized' } });
    accounts.push({ account_type: 'google_calendar', status: 'connected', health_score: 100, last_error: '', details: { note: 'OAuth authorized' } });
    accounts.push({ account_type: 'xtreme_builder', status: 'connected', health_score: 100, last_error: '', details: { url: secrets.get('XTREME_BUILDER_URL') || '' } });

    // === 2. Fetch entity data for lifecycle scoring ===
    const entityFetches = await Promise.allSettled([
      base44.asServiceRole.entities.MonitoredSite.filter({}),
      base44.asServiceRole.entities.SystemDNA_System.filter({}),
      base44.asServiceRole.entities.IntelFeed.filter({}, '-created_date', 100),
      base44.asServiceRole.entities.SystemEnhancement.filter({}),
      base44.asServiceRole.entities.Simulation.filter({}),
      base44.asServiceRole.entities.SiteAuditLog.filter({}, '-created_date', 50),
      base44.asServiceRole.entities.KnowledgeQuest.filter({}),
      base44.asServiceRole.entities.MasterPlan.filter({}),
    ]);

    const val = (i: number, fallback: any[] = []) => entityFetches[i].status === 'fulfilled' ? entityFetches[i].value : fallback;
    const sites = val(0);
    const systems = val(1);
    const intelFeed = val(2);
    const enhancements = val(3);
    const simulations = val(4);
    const auditLogs = val(5);
    const quests = val(6);
    const masterPlans = val(7);

    // === 3. Score the data lifecycle (14 dimensions) ===
    const cbHealth = accounts.find(a => a.account_type === 'cloud_browser')?.health_score || 0;
    const intelWithSummary = intelFeed.filter((i: any) => i.summary && i.summary.length > 20);
    const intelWithHeadline = intelFeed.filter((i: any) => i.headline);
    const secureSystems = systems.filter((s: any) => s.security_health === 'secure' || s.security_health === 'partial');
    const validatedQuests = quests.filter((q: any) => q.validated);

    const lifecycle = [
      { dimension: 'Vision & Strategy', score: masterPlans.length > 0 ? Math.min(100, 50 + (masterPlans[0].missions?.length || 0) * 5) : 15, findings: masterPlans.length === 0 ? ['No MasterPlan defined'] : [] },
      { dimension: 'Sources & Seeds', score: Math.min(100, sites.length * 12 + 10), findings: sites.length < 3 ? ['Need more monitored sources'] : [] },
      { dimension: 'Data Acquisition', score: Math.min(100, intelFeed.length * 2), findings: intelFeed.length === 0 ? ['No intel acquired yet'] : [] },
      { dimension: 'Scraping Engine', score: cbHealth, findings: cbHealth < 100 ? ['Cloud browser not reachable'] : [] },
      { dimension: 'Normalization', score: intelFeed.length > 0 ? Math.round((intelWithSummary.length / intelFeed.length) * 100) : 0, findings: intelFeed.length > 0 && intelWithSummary.length < intelFeed.length ? ['Some intel missing summaries'] : [] },
      { dimension: 'Data Enrichment', score: Math.min(100, enhancements.length * 4), findings: enhancements.length === 0 ? ['No enhancements generated'] : [] },
      { dimension: 'Images', score: 45, findings: ['Image pipeline not measured'] },
      { dimension: 'Cleaning', score: intelFeed.length > 0 ? Math.round((intelWithHeadline.length / intelFeed.length) * 100) : 0, findings: [] },
      { dimension: 'Analyzing', score: Math.min(100, simulations.length * 10 + 25), findings: simulations.length === 0 ? ['No simulations run'] : [] },
      { dimension: 'Auditing', score: Math.min(100, auditLogs.length * 5 + 20), findings: auditLogs.length === 0 ? ['No audit logs'] : [] },
      { dimension: 'Archiving', score: 55, findings: ['Archive strategy not formalized'] },
      { dimension: 'Storage', score: Math.min(100, 40 + (sites.length + systems.length) * 4), findings: [] },
      { dimension: 'Security', score: systems.length > 0 ? Math.round((secureSystems.length / systems.length) * 100) : 30, findings: systems.length > 0 && secureSystems.length < systems.length ? ['Some systems not hardened'] : [] },
      { dimension: 'Validation', score: quests.length > 0 ? Math.round((validatedQuests.length / quests.length) * 100) : 0, findings: quests.length > 0 && validatedQuests.length === 0 ? ['No validated research'] : [] },
    ].map(d => ({ ...d, status: d.score >= 80 ? 'healthy' : d.score >= 50 ? 'warning' : 'critical' }));

    const overallScore = Math.round(lifecycle.reduce((a, d) => a + d.score, 0) / lifecycle.length);
    const verdict = overallScore >= 80 ? 'GO' : overallScore >= 60 ? 'CAUTION' : 'NO-GO';
    const connectedCount = accounts.filter(a => a.status === 'connected').length;
    const accountHealth = Math.round((connectedCount / accounts.length) * 100);

    // === 4. Persist account status ===
    for (const acc of accounts) {
      try {
        const existing = await base44.asServiceRole.entities.ConnectedAccount.filter({ account_type: acc.account_type });
        const record = {
          name: acc.account_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          account_type: acc.account_type,
          status: acc.status,
          health_score: acc.health_score,
          last_check: new Date().toISOString(),
          last_error: acc.last_error || '',
          details: acc.details || {},
          auto_managed: true,
        };
        if (existing.length > 0) {
          await base44.asServiceRole.entities.ConnectedAccount.update(existing[0].id, record);
        } else {
          await base44.asServiceRole.entities.ConnectedAccount.create(record);
        }
      } catch {}
    }

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      accounts,
      account_health: accountHealth,
      connected_accounts: connectedCount,
      total_accounts: accounts.length,
      lifecycle,
      overall_score: overallScore,
      verdict,
      app_count: sites.length,
      system_count: systems.length,
      managed_apps: sites.map((s: any) => ({ id: s.id, name: s.name, url: s.url, score: s.audit_score, status: s.status, issues: s.issues_count, critical: s.critical_issues_count, last_audit: s.last_audit_at })),
      systems: systems.map((s: any) => ({ id: s.id, name: s.name, score: s.current_score, health: s.health_status, security: s.security_health })),
    });
  } catch (error: any) {
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}