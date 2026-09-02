import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Cpu, Loader2, Rocket, ShieldCheck, AlertTriangle, CheckCircle2,
  ExternalLink, Activity, Sparkles, Gauge, Lock, Search, Eye, FileText, Zap,
} from 'lucide-react';

const STATUS_STYLE = {
  healthy: 'text-emerald-500',
  active: 'text-sky-500',
  degraded: 'text-amber-500',
  critical: 'text-rose-500',
  paused: 'text-muted-foreground',
};

const VERDICT_STYLE = {
  LAUNCH_READY: { color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', icon: CheckCircle2 },
  NEAR_READY: { color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/30', icon: AlertTriangle },
  NOT_READY: { color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/30', icon: AlertTriangle },
};

function ReadinessCard({ site }) {
  const score = site.audit_score || 0;
  const ringColor = score >= 85 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-amber-500' : 'stroke-rose-500';
  return (
    <Card className={cn('p-4 border-border/60', score >= 85 ? 'border-emerald-500/30' : score < 60 ? 'border-rose-500/30' : '')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{site.name}</p>
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate">
            <ExternalLink className="w-3 h-3" /> {site.url}
          </a>
        </div>
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round" className={ringColor}
              strokeDasharray={`${(score / 100) * 264} 264`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('font-display text-base', ringColor.replace('stroke-', 'text-'))}>{score}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Badge variant="outline" className={cn('text-[9px] capitalize', STATUS_STYLE[site.status])}>{site.status}</Badge>
        {site.critical_issues_count > 0 && (
          <Badge variant="destructive" className="text-[9px]">{site.critical_issues_count} critical</Badge>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">{site.issues_count || 0} issues</span>
      </div>
      <div className="grid grid-cols-5 gap-1 mt-3">
        {[
          { label: 'Perf', val: site.performance_score, icon: Gauge },
          { label: 'SEO', val: site.seo_score, icon: Search },
          { label: 'Sec', val: site.security_score, icon: Lock },
          { label: 'A11y', val: site.accessibility_score, icon: Eye },
          { label: 'Cnt', val: site.content_score, icon: FileText },
        ].map((m) => (
          <div key={m.label} className="text-center">
            <m.icon className="w-3 h-3 mx-auto text-muted-foreground" />
            <p className="text-[10px] font-mono mt-0.5">{m.val || 0}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function XtremeAI() {
  const [sites, setSites] = useState(null);
  const [queue, setQueue] = useState([]);
  const [cycling, setCycling] = useState(false);
  const [cycleResult, setCycleResult] = useState(null);
  const [convening, setConvening] = useState(false);
  const [council, setCouncil] = useState(null);

  const load = async () => {
    const rows = await base44.entities.MonitoredSite.list('-audit_score', 50);
    setSites(rows || []);
    const q = await base44.entities.BuildQueue.filter({ stage: 'building' }, '-created_date', 10);
    setQueue(q || []);
  };

  useEffect(() => { load(); }, []);

  const runPerfection = async () => {
    setCycling(true);
    setCycleResult(null);
    try {
      const res = await base44.functions.invoke('runPerfectionCycle', { site_id: 'all' });
      setCycleResult(res);
      await load();
    } catch (e) {
      setCycleResult({ error: e.message || 'Cycle failed' });
    } finally {
      setCycling(false);
    }
  };

  const conveneCouncil = async () => {
    setConvening(true);
    setCouncil(null);
    try {
      const res = await base44.functions.invoke('councilSiteAudit', {});
      setCouncil(res);
    } catch (e) {
      setCouncil({ error: e.message || 'Council audit failed' });
    } finally {
      setConvening(false);
    }
  };

  const avgScore = sites?.length ? Math.round(sites.reduce((a, s) => a + (s.audit_score || 0), 0) / sites.length) : 0;
  const readyCount = sites?.filter((s) => (s.audit_score || 0) >= 85 && (s.critical_issues_count || 0) === 0).length || 0;

  if (sites === null) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> Xtreme AI — The Hands</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Autonomous Build & Launch Command.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Mission control for the Xtreme AI v2 builder and the launch-readiness pipeline across every site in the portfolio. Audit, fix, heal, optimize, and perfect — then convene the Council for a launch verdict.
        </p>
      </div>

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-border/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Portfolio Avg</p>
          <p className="font-display text-3xl mt-1">{avgScore}<span className="text-base text-muted-foreground">/100</span></p>
        </Card>
        <Card className="p-4 border-border/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Launch Ready</p>
          <p className="font-display text-3xl mt-1 text-emerald-500">{readyCount}<span className="text-base text-muted-foreground">/{sites.length}</span></p>
        </Card>
        <Card className="p-4 border-border/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Building</p>
          <p className="font-display text-3xl mt-1">{queue.length}</p>
        </Card>
        <Card className="p-4 border-border/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Sites</p>
          <p className="font-display text-3xl mt-1">{sites.length}</p>
        </Card>
      </div>

      {/* Command actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={runPerfection} disabled={cycling || convening} className="rounded-full">
          {cycling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {cycling ? 'Running perfection cycle…' : 'Run Full Perfection Cycle (All Sites)'}
        </Button>
        <Button onClick={conveneCouncil} disabled={cycling || convening} variant="outline" className="rounded-full">
          {convening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {convening ? 'Council deliberating…' : 'Convene Council Audit'}
        </Button>
      </div>

      {/* Council verdict */}
      {council && !council.error && (
        <Card className={cn('p-5', VERDICT_STYLE[council.verdict]?.border || 'border-border/60', VERDICT_STYLE[council.verdict]?.bg)}>
          <div className="flex items-start gap-3">
            {React.createElement(VERDICT_STYLE[council.verdict]?.icon || AlertTriangle, { className: cn('w-5 h-5 mt-0.5 shrink-0', VERDICT_STYLE[council.verdict]?.color) })}
            <div className="space-y-3 flex-1">
              <div>
                <p className={cn('text-xs uppercase tracking-widest font-medium', VERDICT_STYLE[council.verdict]?.color)}>Council Verdict</p>
                <p className="font-display text-2xl tracking-tight mt-0.5">{council.verdict?.replace('_', ' ')}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{council.report}</p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1.5">Launch Ready</p>
                  {(council.ready_sites || []).length ? (
                    <ul className="space-y-1">{council.ready_sites.map((s) => (
                      <li key={s} className="text-sm flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {s}</li>
                    ))}</ul>
                  ) : <p className="text-xs text-muted-foreground">None yet</p>}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-rose-500 mb-1.5">Blocked</p>
                  {(council.blocked_sites || []).length ? (
                    <ul className="space-y-1">{council.blocked_sites.map((b) => (
                      <li key={b.name} className="text-sm">
                        <span className="font-medium">{b.name}</span>
                        <ul className="ml-3 list-disc text-xs text-muted-foreground">{(b.blockers || []).map((bl, i) => <li key={i}>{bl}</li>)}</ul>
                      </li>
                    ))}</ul>
                  ) : <p className="text-xs text-muted-foreground">None</p>}
                </div>
              </div>
              {(council.prioritized_actions || []).length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Prioritized Action Sequence</p>
                  <ol className="space-y-1.5">
                    {council.prioritized_actions.map((a, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="font-mono text-xs text-muted-foreground mt-0.5 shrink-0">{i + 1}.</span>
                        <span><span className="font-medium">{a.site}</span> — <Badge variant="outline" className="text-[9px] capitalize mx-1">{a.action}</Badge>{a.reason}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {council?.error && (
        <Card className="p-4 border-destructive/30 bg-destructive/5"><p className="text-sm text-destructive">{council.error}</p></Card>
      )}

      {/* Perfection cycle result */}
      {cycleResult && !cycleResult.error && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="font-medium">Perfection Cycle Complete</h3>
          </div>
          <div className="space-y-2">
            {(cycleResult.cycles || []).map((c) => (
              <div key={c.site_id} className="flex items-center gap-3 border-b border-border/40 pb-2 last:border-0">
                <span className="text-sm font-medium flex-1">{c.name}</span>
                <Badge variant="outline" className={cn('text-[9px] capitalize', STATUS_STYLE[c.final_status])}>{c.final_status}</Badge>
                <span className="font-mono text-sm">{c.final_score}/100</span>
                <span className="text-[10px] text-muted-foreground">{c.steps?.length || 0} steps</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {cycleResult?.error && (
        <Card className="p-4 border-destructive/30 bg-destructive/5"><p className="text-sm text-destructive">{cycleResult.error}</p></Card>
      )}

      {/* Launch readiness grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4" />
          <h2 className="font-display text-xl tracking-tight">Launch Readiness</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sites.map((s) => <ReadinessCard key={s.id} site={s} />)}
        </div>
      </div>

      {/* Build queue */}
      {queue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" />
            <h2 className="font-display text-xl tracking-tight">Active Build Queue</h2>
          </div>
          <Card className="p-4 border-border/60 divide-y divide-border/40">
            {queue.map((q) => (
              <div key={q.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                <span className="text-sm font-medium">{q.title}</span>
                {q.business_name && <span className="text-xs text-muted-foreground">{q.business_name}</span>}
                <Badge variant="outline" className="text-[9px] capitalize ml-auto">{q.stage}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}