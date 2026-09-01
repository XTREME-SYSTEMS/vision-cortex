import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Radar, Globe, Wrench, CheckCircle2, XCircle, AlertTriangle,
  Shield, Zap, TrendingUp, Trophy, Loader2, FileCode, Brain, Eye
} from 'lucide-react';

const SYSTEMS = [
  {
    id: 'vision_cortex',
    label: 'Vision Cortex',
    icon: Brain,
    desc: 'Autonomous multi-agent intelligence ecosystem',
    benchmark: 'Microsoft AutoGen + SuperAGI',
    benchmark_note: 'The #1 rated open-source multi-agent orchestration frameworks — AutoGen for multi-agent collaboration, SuperAGI for autonomous agent deployment at scale.',
    accent: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    id: 'cloud_browser',
    label: 'Cloud Browser',
    icon: Globe,
    desc: 'Stealth web automation & anti-bot bypass engine',
    benchmark: 'Scrapfly + Bright Data',
    benchmark_note: 'Scrapfly Cloud Browser API (#1 managed stateful stealth browser) + Bright Data (4.6/5 Trustpilot, residential proxies, AI-powered extraction, captcha solving).',
    accent: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  {
    id: 'auto_builder',
    label: 'Auto Builder',
    icon: Wrench,
    desc: 'Autonomous vision-to-launch build pipeline',
    benchmark: 'Base44 + Emergent',
    benchmark_note: 'Base44 (prompt-to-app with built-in backend, $20/mo) + Emergent (prompt to deployable app with code you own) — the top-rated autonomous AI app builders.',
    accent: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
];

const SEVERITY_STYLE = {
  none: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

function StatusIcon({ on, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}: ${on ? 'Yes' : 'No'}`}>
      {on
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />}
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

function scoreColor(s) {
  if (s >= 90) return 'text-emerald-500';
  if (s >= 70) return 'text-lime-500';
  if (s >= 50) return 'text-amber-500';
  if (s >= 25) return 'text-orange-500';
  return 'text-rose-500';
}

function scoreBg(s) {
  if (s >= 90) return 'bg-emerald-500';
  if (s >= 70) return 'bg-lime-500';
  if (s >= 50) return 'bg-amber-500';
  if (s >= 25) return 'bg-orange-500';
  return 'bg-rose-500';
}

function SystemOverview({ sys, caps }) {
  const total = caps.length;
  const implemented = caps.filter((c) => c.implemented).length;
  const tested = caps.filter((c) => c.tested).length;
  const hardened = caps.filter((c) => c.hardened).length;
  const launchReady = caps.filter((c) => c.launch_ready).length;
  const optimized = caps.filter((c) => c.optimized).length;
  const avgScore = total ? Math.round(caps.reduce((a, c) => a + (c.score || 0), 0) / total) : 0;
  const gaps = caps.filter((c) => c.gap_severity === 'high' || c.gap_severity === 'critical').length;

  const stats = [
    { label: 'Avg Score', value: `${avgScore}`, sub: '/ 100', icon: Trophy },
    { label: 'Implemented', value: `${implemented}/${total}`, icon: CheckCircle2 },
    { label: 'Tested', value: `${tested}/${total}`, icon: FileCode },
    { label: 'Hardened', value: `${hardened}/${total}`, icon: Shield },
    { label: 'Launch Ready', value: `${launchReady}/${total}`, icon: Zap },
    { label: 'Optimized', value: `${optimized}/${total}`, icon: TrendingUp },
    { label: 'Critical Gaps', value: `${gaps}`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {/* Benchmark reference card */}
      <Card className="p-5 border-border/60">
        <div className="flex items-start gap-4">
          <div className={cn('h-12 w-12 rounded-xl grid place-items-center shrink-0', sys.bg)}>
            <sys.icon className={cn('w-6 h-6', sys.accent)} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl tracking-tight">{sys.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{sys.desc}</p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2.5">
              <Trophy className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Benchmark — #1 rated proven system</p>
                <p className="text-sm font-medium">{sys.benchmark}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sys.benchmark_note}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-3 border-border/60">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn('text-xl font-semibold', s.label === 'Avg Score' && scoreColor(avgScore))}>
                {s.value}<span className="text-xs text-muted-foreground font-normal">{s.sub}</span>
              </p>
            </Card>
          );
        })}
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0">System Score</span>
        <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', scoreBg(avgScore))} style={{ width: `${avgScore}%` }} />
        </div>
        <span className={cn('text-sm font-semibold', scoreColor(avgScore))}>{avgScore}/100</span>
      </div>
    </div>
  );
}

function CapabilityRow({ cap }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-accent/40 transition-colors"
      >
        <div className={cn('flex-shrink-0 w-1.5 h-14 rounded-full', scoreBg(cap.score || 0))} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{cap.module}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', SEVERITY_STYLE[cap.gap_severity])}>
              {cap.gap_severity} gap
            </span>
          </div>
          <h4 className="mt-0.5 text-sm font-medium leading-snug">{cap.capability}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{cap.current_state || 'Not yet built'}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn('text-lg font-bold', scoreColor(cap.score || 0))}>{cap.score || 0}</span>
        </div>
      </button>

      {open && (
        <div className="border-t px-3.5 py-3.5 space-y-3 bg-muted/30">
          {/* Status flags */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <StatusIcon on={cap.implemented} label="Built" />
              <StatusIcon on={cap.tested} label="Tested" />
              <StatusIcon on={cap.hardened} label="Hardened" />
              <StatusIcon on={cap.launch_ready} label="Launch" />
              <StatusIcon on={cap.optimized} label="Optimized" />
              <StatusIcon on={cap.enhanced} label="Enhanced" />
            </div>
          </div>

          {/* Benchmark vs Current */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Benchmark Target
              </p>
              <p className="text-xs leading-relaxed">{cap.benchmark_state || '—'}</p>
              {cap.benchmark_reference && (
                <p className="text-[10px] text-muted-foreground mt-1.5">Ref: {cap.benchmark_reference}</p>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Current State
              </p>
              <p className="text-xs leading-relaxed">{cap.current_state || 'Not yet implemented'}</p>
            </div>
          </div>

          {/* Gap */}
          {cap.gap_description && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Gap
              </p>
              <p className="text-xs leading-relaxed">{cap.gap_description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Capabilities() {
  const [caps, setCaps] = useState(null);
  const [activeSystem, setActiveSystem] = useState('vision_cortex');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const list = await base44.entities.CapabilityMatrix.list('-score', 200);
    setCaps(list || []);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.CapabilityMatrix?.subscribe?.(() => load());
    return () => unsub && unsub();
  }, []);

  const systemCaps = useMemo(
    () => (caps || []).filter((c) => c.system === activeSystem),
    [caps, activeSystem]
  );

  const filteredCaps = useMemo(() => {
    if (filter === 'all') return systemCaps;
    if (filter === 'gaps') return systemCaps.filter((c) => c.gap_severity === 'high' || c.gap_severity === 'critical');
    if (filter === 'implemented') return systemCaps.filter((c) => c.implemented);
    if (filter === 'untested') return systemCaps.filter((c) => c.implemented && !c.tested);
    return systemCaps;
  }, [systemCaps, filter]);

  const activeSys = SYSTEMS.find((s) => s.id === activeSystem);

  const overallScore = useMemo(() => {
    if (!caps?.length) return 0;
    return Math.round(caps.reduce((a, c) => a + (c.score || 0), 0) / caps.length);
  }, [caps]);

  if (caps === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">System Heart · Capability Matrix</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          The Benchmark Map.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Side-by-side comparison of what Vision Cortex, Cloud Browser, and Auto Builder <span className="font-medium text-foreground">should be</span> (the benchmark — the #1 rated proven systems in the world) versus <span className="font-medium text-foreground">what they are today</span>. Every capability is scored, tracked, and gap-mapped. This is the map the AI refers back to for building, hardening, and optimizing.
        </p>
      </div>

      {/* Overall score */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-foreground text-background grid place-items-center shrink-0">
            <Radar className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trio Overall Score</p>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn('text-3xl font-bold', scoreColor(overallScore))}>{overallScore}</span>
              <span className="text-lg text-muted-foreground">/ 100</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden ml-2">
                <div className={cn('h-full rounded-full transition-all', scoreBg(overallScore))} style={{ width: `${overallScore}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* System tabs */}
      <div className="flex gap-2 flex-wrap">
        {SYSTEMS.map((s) => {
          const Icon = s.icon;
          const active = activeSystem === s.id;
          const sysCapsCount = (caps || []).filter((c) => c.system === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSystem(s.id); setFilter('all'); }}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all',
                active ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{s.label}</span>
              <span className={cn('text-xs', active ? 'text-background/60' : 'text-muted-foreground')}>{sysCapsCount}</span>
            </button>
          );
        })}
      </div>

      {/* Active system overview */}
      <SystemOverview sys={activeSys} caps={systemCaps} />

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Filter:</span>
        {[
          { id: 'all', label: 'All' },
          { id: 'gaps', label: 'Critical Gaps' },
          { id: 'implemented', label: 'Implemented' },
          { id: 'untested', label: 'Untested' },
        ].map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? 'default' : 'outline'}
            onClick={() => setFilter(f.id)}
            className="rounded-full text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Capability list */}
      <div className="space-y-2.5">
        {filteredCaps.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No capabilities match this filter.</p>
          </Card>
        )}
        {filteredCaps.map((cap) => (
          <CapabilityRow key={cap.id} cap={cap} />
        ))}
      </div>
    </div>
  );
}