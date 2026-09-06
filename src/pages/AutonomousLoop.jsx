import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Brain, ScanLine, Code2, ShieldCheck, Zap, Rocket, CheckCircle2, AlertTriangle, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASES = [
  { key: 'forensic_audit', label: 'Forensic Audit', icon: ScanLine },
  { key: 'self_reflection', label: 'Self-Reflection', icon: Brain },
  { key: 'architect', label: 'Architect', icon: Code2 },
  { key: 'implement', label: 'Implement', icon: Code2 },
  { key: 'validate', label: 'Validate', icon: ShieldCheck },
  { key: 'harden', label: 'Harden', icon: ShieldCheck },
  { key: 'optimize', label: 'Optimize', icon: Zap },
  { key: 'push', label: 'Push to Live', icon: Rocket },
];

const phaseColor = {
  forensic_audit: 'text-blue-500',
  self_reflection: 'text-purple-500',
  architect: 'text-indigo-500',
  implement: 'text-cyan-500',
  validate: 'text-amber-500',
  harden: 'text-rose-500',
  optimize: 'text-emerald-500',
  push: 'text-foreground',
  complete: 'text-emerald-500',
};

const docStatusColor = {
  draft: 'bg-muted text-muted-foreground',
  architected: 'bg-indigo-500/10 text-indigo-600',
  implemented: 'bg-cyan-500/10 text-cyan-600',
  validated: 'bg-emerald-500/10 text-emerald-600',
  hardened: 'bg-rose-500/10 text-rose-600',
  optimized: 'bg-amber-500/10 text-amber-600',
  pushed: 'bg-foreground text-background',
  failed: 'bg-rose-500/10 text-rose-600',
};

export default function AutonomousLoop() {
  const [cycles, setCycles] = useState(null);
  const [docs, setDocs] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);

  const load = useCallback(async () => {
    const [c, d] = await Promise.all([
      base44.entities.AutonomousCycle.list('-started_at', 10).catch(() => []),
      base44.entities.ArchitecturalDocument.list('-created_date', 20).catch(() => []),
    ]);
    setCycles(c);
    setDocs(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runLoop = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('autonomousMasterLoop', {});
      const data = res.data || res;
      if (data.error) setError(data.error);
      await load();
    } catch (e) {
      setError(e.message || 'Autonomous loop failed');
    }
    setRunning(false);
  };

  const current = cycles?.[0];
  const stats = {
    total: cycles?.length || 0,
    pushed: cycles?.filter((c) => c.items_pushed > 0).length || 0,
    avgHealth: cycles?.length ? Math.round(cycles.reduce((a, c) => a + (c.health_after || 0), 0) / cycles.length) : 0,
    docsPushed: docs?.filter((d) => d.status === 'pushed').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Brain className="w-4 h-4" /> Autonomous Self-Reflection Engine
          </div>
          <h1 className="font-display text-3xl mt-1 tracking-tight">Autonomous Master Loop</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            8-phase autonomous cycle: forensic audit → self-reflection → architect → implement → validate → harden → optimize → push. Runs every 2 hours via Vercel cron on Groq (zero credits). Self-generates code, self-validates, self-fixes, and stages everything for live deployment.
          </p>
        </div>
        <Button onClick={runLoop} disabled={running} className="rounded-full">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {running ? 'Running Cycle…' : 'Run Autonomous Loop'}
        </Button>
      </div>

      {/* Phase pipeline */}
      <Card className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">8-Phase Pipeline</p>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            const active = current?.phase === p.key;
            const done = current?.status === 'complete' || (PHASES.findIndex((ph) => ph.key === current?.phase) > i);
            return (
              <div key={p.key} className={cn('flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors', active ? 'border-foreground bg-foreground/5' : done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/40')}>
                <div className={cn('w-7 h-7 rounded-full grid place-items-center', active ? 'bg-foreground text-background' : done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                  {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={cn('text-[9px] text-center font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{p.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cycles Run', value: stats.total, icon: Clock, tone: 'text-foreground' },
          { label: 'Items Pushed', value: stats.pushed, icon: Rocket, tone: 'text-emerald-600' },
          { label: 'Avg Health', value: stats.avgHealth + '%', icon: Activity, tone: 'text-sky-600' },
          { label: 'Docs Pushed', value: stats.docsPushed, icon: CheckCircle2, tone: 'text-foreground' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.tone)} />
            <p className={cn('font-display text-2xl', s.tone)}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-2 text-sm text-rose-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {running && (
        <Card className="p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Running 8-phase autonomous cycle — forensic audit, self-reflection, architect, implement, validate, harden, optimize, push…</span>
        </Card>
      )}

      {/* Current cycle reflection */}
      {current?.reflection && (
        <Card className="p-4 border-purple-500/30 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <p className="text-[11px] uppercase tracking-wider text-purple-600">Self-Reflection — Latest Cycle</p>
          </div>
          <p className="text-sm leading-relaxed">{current.reflection}</p>
          {current.priorities?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {current.priorities.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-muted-foreground mt-0.5">{i + 1}.</span>
                  <div>
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted-foreground"> — {p.fix?.slice(0, 120)}</span>
                    {p.severity && <Badge variant="outline" className={cn('ml-1.5 text-[9px]', p.severity === 'critical' ? 'text-rose-600' : p.severity === 'high' ? 'text-amber-600' : 'text-muted-foreground')}>{p.severity}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recent cycles */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" /> Recent Cycles
        </h2>
        {cycles === null ? (
          <Card className="p-8 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></Card>
        ) : cycles.length === 0 ? (
          <Card className="p-8 text-center">
            <Brain className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No cycles yet. Run the autonomous loop to start self-reflection.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {cycles.map((c) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', c.status === 'complete' ? 'bg-emerald-500' : c.status === 'running' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{c.cycle_id?.slice(0, 20)}</span>
                      <Badge variant="outline" className={cn('text-[9px]', phaseColor[c.phase] || 'text-muted-foreground')}>{c.phase}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.summary || 'Running…'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                    <span className="text-emerald-600 font-medium">{c.items_pushed || 0} pushed</span>
                    <span>{c.health_before || 0}%→{c.health_after || 0}%</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Architectural documents */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-muted-foreground" /> Self-Architected Documents
        </h2>
        {docs === null ? (
          <Card className="p-8 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></Card>
        ) : docs.length === 0 ? (
          <Card className="p-8 text-center">
            <Code2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No architectural documents yet. The autonomous loop will generate them on the next cycle.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Card key={d.id} className="overflow-hidden">
                <button onClick={() => setExpandedDoc(expandedDoc === d.id ? null : d.id)} className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{d.title}</span>
                      <Badge variant="outline" className={cn('text-[9px]', docStatusColor[d.status] || 'text-muted-foreground')}>{d.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.target_system}</p>
                  </div>
                  {d.validation_score > 0 && (
                    <Badge variant="outline" className={cn('text-[9px]', d.validation_score >= 100 ? 'text-emerald-600' : 'text-amber-600')}>{d.validation_score}/100</Badge>
                  )}
                </button>
                {expandedDoc === d.id && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
                    {d.content && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Architecture Document</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{d.content}</p>
                      </div>
                    )}
                    {d.hardening_notes && (
                      <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-rose-600 mb-1">Hardening</p>
                        <p className="text-xs leading-relaxed">{d.hardening_notes}</p>
                      </div>
                    )}
                    {d.optimization_notes && (
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Optimization</p>
                        <p className="text-xs leading-relaxed">{d.optimization_notes}</p>
                      </div>
                    )}
                    {d.implementation_code && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Code2 className="w-3 h-3" /> Implementation Code</p>
                        <pre className="text-[10px] font-mono bg-muted/40 border border-border/40 rounded p-2.5 overflow-x-auto max-h-48 whitespace-pre-wrap">{d.implementation_code}</pre>
                      </div>
                    )}
                    {d.validation_failures?.length > 0 && (
                      <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-rose-600 mb-1">Validation Failures</p>
                        <ul className="text-xs space-y-0.5 list-disc list-inside text-rose-600">
                          {d.validation_failures.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}