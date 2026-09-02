import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, Wrench, HeartPulse, Gauge, Sparkles, Loader2,
  ExternalLink, Github, AlertTriangle, CheckCircle2, Activity, Lock, Search, Eye, FileText,
} from 'lucide-react';

const ACTIONS = [
  { mode: 'audit',    label: 'Audit',    icon: ShieldCheck,  desc: 'Full 5-dimension site audit' },
  { mode: 'fix',      label: 'Fix',      icon: Wrench,       desc: 'Fix critical & high-severity issues' },
  { mode: 'heal',     label: 'Heal',     icon: HeartPulse,   desc: 'Systemic healing & data integrity' },
  { mode: 'optimize', label: 'Optimize', icon: Gauge,       desc: 'Performance & SEO optimization' },
  { mode: 'enhance',  label: 'Enhance',  icon: Sparkles,     desc: 'Feature & content enhancements' },
];

const SEV_STYLE = {
  critical: { badge: 'destructive', color: 'text-rose-500', bar: 'bg-rose-500' },
  high:     { badge: 'default',     color: 'text-orange-500', bar: 'bg-orange-500' },
  medium:   { badge: 'secondary',   color: 'text-amber-500', bar: 'bg-amber-500' },
  low:      { badge: 'secondary',   color: 'text-sky-500', bar: 'bg-sky-500' },
};

const STATUS_STYLE = {
  healthy:  'text-emerald-500',
  active:   'text-sky-500',
  degraded: 'text-amber-500',
  critical: 'text-rose-500',
  paused:   'text-muted-foreground',
};

function ScoreRing({ score, label, icon: Icon }) {
  const color = score >= 85 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-amber-500' : 'stroke-rose-500';
  const textColor = score >= 85 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" className="stroke-muted" />
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" strokeLinecap="round"
            className={color}
            strokeDasharray={`${(score / 100) * 264} 264`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={cn('w-4 h-4 mb-0.5', textColor)} />
          <span className={cn('font-display text-lg', textColor)}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export default function SiteMonitor() {
  const [sites, setSites] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState({});

  const load = async () => {
    const rows = await base44.entities.MonitoredSite.list('-updated_date', 50);
    setSites(rows || []);
    if (rows?.length && !selectedId) setSelectedId(rows[0].id);
  };

  const loadLogs = async (siteId) => {
    const l = await base44.entities.SiteAuditLog.filter({ site_id: siteId }, '-created_date', 10);
    setLogs((prev) => ({ ...prev, [siteId]: l || [] }));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedId) loadLogs(selectedId); }, [selectedId]);

  const site = sites?.find((s) => s.id === selectedId);

  const runAction = async (mode) => {
    setRunning(mode);
    setResult(null);
    try {
      const res = await base44.functions.invoke('auditExternalSite', { site_id: selectedId, mode });
      setResult(res);
      await load();
      await loadLogs(selectedId);
    } catch (e) {
      setResult({ error: e.message || 'Action failed' });
    } finally {
      setRunning(null);
    }
  };

  if (sites === null) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!sites.length) {
    return (
      <Card className="p-8 text-center border-border/60">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
        <p className="text-sm font-medium">No monitored sites yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Add a site to begin auditing.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">External Site Monitor</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Audit. Fix. Heal. Optimize. Enhance.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Autonomous monitoring of deployed sites and their codebases. Each action inspects the live site via web context and produces actionable findings.
        </p>
      </div>

      {/* Site selector */}
      <div className="flex flex-wrap gap-2">
        {sites.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSelectedId(s.id); setResult(null); }}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-left transition-colors',
              s.id === selectedId ? 'border-foreground bg-foreground/5' : 'border-border/60 hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{s.name}</span>
              <span className={cn('w-2 h-2 rounded-full', s.status === 'healthy' ? 'bg-emerald-500' : s.status === 'critical' ? 'bg-rose-500' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-sky-500')} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.url}</p>
          </button>
        ))}
      </div>

      {site && (
        <>
          {/* Site header */}
          <Card className="p-5 border-border/60">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl tracking-tight">{site.name}</h2>
                  <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_STYLE[site.status])}>
                    {site.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="w-3.5 h-3.5" /> {site.url}
                  </a>
                  {site.github_repo && (
                    <a href={site.github_repo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                      <Github className="w-3.5 h-3.5" /> Repo
                    </a>
                  )}
                </div>
                {site.last_audit_at && (
                  <p className="text-[11px] text-muted-foreground">
                    Last audit: {new Date(site.last_audit_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-display text-4xl">{site.audit_score || '—'}<span className="text-lg text-muted-foreground">/100</span></p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall Score</p>
              </div>
            </div>
          </Card>

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const isRunning = running === a.mode;
              return (
                <button
                  key={a.mode}
                  onClick={() => runAction(a.mode)}
                  disabled={!!running}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all hover:border-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed',
                    running === a.mode ? 'border-foreground bg-foreground/5' : 'border-border/60 hover:bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                    <span className="text-sm font-medium">{a.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{a.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Score breakdown (after audit) */}
          {site.last_audit_at && (
            <Card className="p-6 border-border/60">
              <h3 className="font-medium mb-4">Score breakdown</h3>
              <div className="flex flex-wrap justify-around gap-4">
                <ScoreRing score={site.performance_score || 0} label="Performance" icon={Gauge} />
                <ScoreRing score={site.seo_score || 0} label="SEO" icon={Search} />
                <ScoreRing score={site.security_score || 0} label="Security" icon={Lock} />
                <ScoreRing score={site.accessibility_score || 0} label="A11y" icon={Eye} />
                <ScoreRing score={site.content_score || 0} label="Content" icon={FileText} />
              </div>
            </Card>
          )}

          {/* Result panel */}
          {result && !result.error && (
            <div className="space-y-4">
              {result.summary && (
                <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium capitalize">{running || result.mode || 'Action'} complete</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.summary}</p>
                    </div>
                  </div>
                </Card>
              )}

              {result.recommendations?.length > 0 && (
                <Card className="p-5 border-border/60">
                  <h3 className="font-medium mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                        <span className="font-mono text-xs text-muted-foreground mt-0.5">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {result.code_fixes?.length > 0 && (
                <Card className="p-5 border-border/60">
                  <h3 className="font-medium mb-3">Code fixes</h3>
                  <div className="space-y-3">
                    {result.code_fixes.map((f, i) => (
                      <div key={i} className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-mono text-muted-foreground">{f.file}</p>
                        <p className="text-sm font-medium mt-1">{f.issue}</p>
                        <p className="text-sm text-muted-foreground mt-1">{f.fix}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {result.issues?.length > 0 && (
                <Card className="p-5 border-border/60">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="font-medium">Issues found ({result.issues.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {result.issues.map((iss, i) => {
                      const sev = SEV_STYLE[iss.severity] || SEV_STYLE.low;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className={cn('w-1 self-stretch rounded-full', sev.bar)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <Badge variant={sev.badge} className="text-[9px] capitalize">{iss.severity}</Badge>
                              <Badge variant="outline" className="text-[9px] capitalize">{iss.category}</Badge>
                              <span className="text-sm font-medium">{iss.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{iss.description}</p>
                            {iss.recommendation && (
                              <p className="text-xs text-muted-foreground/80 mt-1">
                                <span className="text-foreground/60">Fix: </span>{iss.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {result?.error && (
            <Card className="p-4 border-destructive/30 bg-destructive/5">
              <p className="text-sm text-destructive">{result.error}</p>
            </Card>
          )}

          {/* Action history */}
          {logs[selectedId]?.length > 0 && (
            <Card className="p-5 border-border/60">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" />
                <h3 className="font-medium">Action history</h3>
              </div>
              <div className="space-y-2">
                {logs[selectedId].map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border/40 pb-2 last:border-0">
                    <Badge variant="outline" className="text-[9px] capitalize">{log.action}</Badge>
                    {log.score > 0 && <span className="text-xs text-muted-foreground">Score: {log.score}/100</span>}
                    <span className="text-xs text-muted-foreground flex-1 truncate">{log.summary}</span>
                    <span className="text-[11px] text-muted-foreground/70 shrink-0">
                      {new Date(log.created_date).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}