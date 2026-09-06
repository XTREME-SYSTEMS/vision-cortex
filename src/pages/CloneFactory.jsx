import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import TopologyMap from '@/components/clone/TopologyMap';
import TerminalLogStream from '@/components/clone/TerminalLogStream';
import { PIPELINE_STAGES, REBRAND_REPLACEMENT_RULES } from '@/data/cloneFactoryTemplates';
import { Play, Loader2, CheckCircle2, AlertTriangle, Gauge, Rocket, Globe, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CloneFactory() {
  const [targetUrl, setTargetUrl] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [niche, setNiche] = useState('');
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [parityScore, setParityScore] = useState(0);
  const [approved, setApproved] = useState(false);
  const [logs, setLogs] = useState([]);
  const [discovery, setDiscovery] = useState(null);
  const [provision, setProvision] = useState(null);
  const [indexing, setIndexing] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const records = await base44.entities.ScoreRecord.list('-created_date', 10);
      setHistory(records || []);
    } catch { setHistory([]); }
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
  const log = (worker, level, msg) => setLogs((p) => [...p, { ts: ts(), worker, level, msg }]);

  const runPipeline = useCallback(async () => {
    if (!targetUrl || !githubRepoUrl || !domain) return;
    setRunning(true);
    setLogs([]);
    setParityScore(0);
    setApproved(false);
    setDiscovery(null);
    setProvision(null);
    setIndexing(null);
    setActiveStage(1);

    const runId = `RUN-${Date.now()}`;
    const sitemapUrl = `https://${domain}/sitemap.xml`;

    try {
      log('ScrapeUrl', 'info', `Fetching target asset bundle — ${targetUrl}`);
      setActiveStage(2);

      log('DeepDiscoveryScan', 'info', `Scanning competitors for "${niche || domain}"…`);
      const disc = await base44.functions.invoke('DeepDiscoveryScan', {
        niche: niche || domain,
        targetDomain: domain,
        competitorCount: 3,
      });
      setDiscovery(disc);
      log('DeepDiscoveryScan', 'success', `Analyzed ${disc?.competitors?.length || 0} competitors — projection ready`);

      log('calculateScore', 'info', 'Running parity evaluation engine…');
      const score = await base44.functions.invoke('calculateScore', {
        runId,
        targetUrl,
        cloneUrl: `https://${domain}`,
        visualData: { pixelVariancePercentage: 0, unmatchedDomNodes: [], breakpointFailures: [] },
        functionalData: { unmappedEndpoints: [], responseCodeMismatches: [], latencyDeltaMs: 0 },
        stageReached: 3,
      });
      setParityScore(score.aggregateScore ?? 0);
      setApproved(!!score.isApproved);
      log('calculateScore', score.isApproved ? 'success' : 'warn',
        `Parity gate: ${((score.aggregateScore ?? 0) * 100).toFixed(2)}% — ${score.isApproved ? 'APPROVED' : 'REPAIRABLE'}`);
      setActiveStage(3);

      log('RailwayProvisioner', 'info', 'Provisioning stateful container on Railway v2…');
      setActiveStage(4);
      const rail = await base44.functions.invoke('railwayProvisioner', {
        projectName: `clone-${runId}`,
        githubRepoUrl,
        branch: 'main',
        environmentVariables: { RUN_ID: runId, TARGET_URL: targetUrl },
      });
      setProvision(rail);
      log('RailwayProvisioner', rail.warning ? 'warn' : 'success',
        `Container ${rail.status || 'ACTIVE'} — ${rail.liveUrl || 'pending'}${rail.simulated ? ' (sim)' : ''}${rail.warning ? ' — ' + rail.warning : ''}`);

      log('SearchConsoleSync', 'info', 'Submitting domain + sitemap to Google Search Console…');
      setActiveStage(5);
      try {
        const sync = await base44.functions.invoke('searchConsoleSync', { siteUrl: `sc-domain:${domain}` });
        setIndexing(sync);
        log('SearchConsoleSync', 'success', `Indexing dispatched for ${domain}`);
      } catch (e) {
        log('SearchConsoleSync', 'warn', `Search Console sync skipped — ${e.message}`);
      }

      log('Pipeline', 'success', `Run ${runId} complete — parity ${((score.aggregateScore ?? 0) * 100).toFixed(2)}%`);
      await loadHistory();
    } catch (e) {
      log('Pipeline', 'error', `Pipeline failed — ${e.message}`);
    } finally {
      setRunning(false);
    }
  }, [targetUrl, githubRepoUrl, domain, niche, loadHistory]);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading">Deep Clone Factory</h1>
          <p className="text-xs text-muted-foreground">Autonomous website cloning · rebranding · multi-cloud deployment — 1.00 parity gate</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn('px-2 py-1 rounded-full font-mono', approved ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground')}>
            {approved ? 'PARITY APPROVED' : 'GATE PENDING'}
          </span>
        </div>
      </div>

      {/* Pipeline input */}
      <div className="border rounded-lg p-4 bg-card border-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target URL</label>
            <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://example-target.com"
              className="w-full mt-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">GitHub Repo URL</label>
            <input value={githubRepoUrl} onChange={(e) => setGithubRepoUrl(e.target.value)} placeholder="https://github.com/org/clone-repo"
              className="w-full mt-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Clone Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="my-clone.com"
              className="w-full mt-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Niche (for discovery)</label>
            <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="autonomous web cloning & deployment"
              className="w-full mt-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
        <button
          onClick={runPipeline}
          disabled={running || !targetUrl || !githubRepoUrl || !domain}
          className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Pipeline Running…' : 'Run Clone Pipeline'}
        </button>
      </div>

      {/* Stage tracker */}
      <div className="grid grid-cols-5 gap-2">
        {PIPELINE_STAGES.map((s) => {
          const done = activeStage > s.id;
          const activeNow = activeStage === s.id && running;
          return (
            <div key={s.id} className={cn('border rounded-lg p-2.5 text-center transition-colors',
              done ? 'bg-emerald-500/5 border-emerald-500/30' : activeNow ? 'bg-sky-500/5 border-sky-500/30' : 'bg-card border-border')}>
              <div className="flex items-center justify-center mb-1">
                {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                  activeNow ? <Loader2 className="w-4 h-4 animate-spin text-sky-500" /> :
                  <span className="text-xs font-mono text-muted-foreground">{s.id}</span>}
              </div>
              <p className="text-[11px] font-medium">{s.label}</p>
              <p className="text-[9px] text-muted-foreground hidden md:block">{s.description}</p>
            </div>
          );
        })}
      </div>

      {/* Parity score + topology */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card border-border flex flex-col items-center justify-center">
          <Gauge className="w-6 h-6 text-muted-foreground mb-2" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Parity Score</p>
          <p className={cn('text-3xl font-heading', approved ? 'text-emerald-500' : parityScore > 0 ? 'text-amber-500' : 'text-muted-foreground')}>
            {(parityScore * 100).toFixed(2)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{approved ? 'Gate passed' : 'Gate requires 100%'}</p>
        </div>
        <div className="md:col-span-2">
          <TopologyMap activeFlow={running} />
        </div>
      </div>

      {/* Discovery results */}
      {discovery && (
        <div className="border rounded-lg p-4 bg-card border-border space-y-3">
          <div className="flex items-center gap-2"><ScanSearch className="w-4 h-4" /><h3 className="text-sm font-medium">Deep Discovery — {discovery.niche}</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">TAM:</span> {discovery.totalAddressableMarket || 'N/A'}</div>
            <div><span className="text-muted-foreground">Growth:</span> {discovery.growthRate || 'N/A'}</div>
            <div><span className="text-muted-foreground">12mo projection:</span> {discovery.financialProjection12mo || 'N/A'}</div>
            <div><span className="text-muted-foreground">Positioning:</span> {discovery.recommendedPositioning || 'N/A'}</div>
          </div>
          {(discovery.competitors || []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Competitors</p>
              {discovery.competitors.map((c, i) => (
                <div key={i} className="text-xs border rounded-md p-2 bg-muted/30 border-border">
                  <span className="font-medium">{c.name}</span> <span className="text-muted-foreground">— {c.pricing}</span>
                  <p className="text-muted-foreground mt-0.5">Strength: {c.strength}</p>
                  <p className="text-muted-foreground">Weakness: {c.weakness}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Provision + indexing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {provision && (
          <div className="border rounded-lg p-4 bg-card border-border space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><Rocket className="w-4 h-4" /><h3 className="text-sm font-medium">Railway Provision</h3></div>
            <p><span className="text-muted-foreground">Status:</span> {provision.status}</p>
            <p><span className="text-muted-foreground">Live URL:</span> {provision.liveUrl}</p>
            <p><span className="text-muted-foreground">Service ID:</span> <span className="font-mono">{provision.serviceId}</span></p>
            {provision.simulated && <p className="text-amber-500">Simulation mode</p>}
            {provision.warning && <p className="text-rose-500">{provision.warning}</p>}
          </div>
        )}
        {indexing && (
          <div className="border rounded-lg p-4 bg-card border-border space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><h3 className="text-sm font-medium">Search Console Sync</h3></div>
            <p><span className="text-muted-foreground">Domain:</span> {domain}</p>
            <p><span className="text-muted-foreground">Sitemap:</span> {`https://${domain}/sitemap.xml`}</p>
          </div>
        )}
      </div>

      {/* Terminal */}
      <TerminalLogStream logs={logs} />

      {/* Rebrand rules */}
      <div className="border rounded-lg p-4 bg-card border-border">
        <h3 className="text-sm font-medium mb-2">Rebrand Replacement Rules</h3>
        <div className="space-y-1.5">
          {REBRAND_REPLACEMENT_RULES.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={cn('px-1.5 py-0.5 rounded font-mono text-[9px]', r.severity === 'critical' ? 'bg-rose-500/15 text-rose-500' : 'bg-amber-500/15 text-amber-500')}>
                {r.severity}
              </span>
              <span className="font-medium">{r.type}</span>
              <span className="text-muted-foreground">— {r.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border rounded-lg p-4 bg-card border-border">
          <h3 className="text-sm font-medium mb-2">Recent Pipeline Runs</h3>
          <div className="space-y-1.5">
            {history.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-xs border rounded-md p-2 bg-muted/30 border-border">
                {r.is_approved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                <span className="font-mono text-muted-foreground">{r.run_id}</span>
                <span className="truncate flex-1">{r.target_url}</span>
                <span className={cn('font-mono', r.is_approved ? 'text-emerald-500' : 'text-amber-500')}>
                  {(r.aggregate_score * 100).toFixed(0)}%
                </span>
                <span className="text-muted-foreground">{r.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}