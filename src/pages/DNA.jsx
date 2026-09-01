import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Radar, Brain, Globe, Wrench, Trophy, AlertTriangle, Shield,
  CheckCircle2, XCircle, Loader2, ArrowRight, Activity, FileCode
} from 'lucide-react';

const SYSTEMS = [
  { id: 'vision_cortex', label: 'Vision Cortex', icon: Brain, accent: 'text-violet-500', bg: 'bg-violet-500/10' },
  { id: 'cloud_browser', label: 'Cloud Browser', icon: Globe, accent: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'auto_builder', label: 'Auto Builder', icon: Wrench, accent: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

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
function stateColor(state) {
  if (['production_verified', 'best_verified_tier', 'hardened', 'validated'].includes(state)) return 'text-emerald-500';
  if (['functional', 'advanced', 'monitored'].includes(state)) return 'text-sky-500';
  if (['developing', 'building', 'testing'].includes(state)) return 'text-amber-500';
  if (['blocked', 'failed', 'deprecated', 'critical'].includes(state)) return 'text-rose-500';
  return 'text-muted-foreground';
}

export default function DNA() {
  const [systems, setSystems] = useState(null);
  const [caps, setCaps] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [actions, setActions] = useState(null);
  const [rules, setRules] = useState(null);
  const [activeSystem, setActiveSystem] = useState(null);

  const load = async () => {
    const [s, c, g, a, r] = await Promise.all([
      base44.entities.SystemDNA_System.list('category', 20).catch(() => []),
      base44.entities.SystemDNA_Capability.list('-benchmark_position', 200).catch(() => []),
      base44.entities.SystemDNA_Gap.list('-severity', 100).catch(() => []),
      base44.entities.SystemDNA_Action.list('-priority', 100).catch(() => []),
      base44.entities.SystemDNA_SystemRule.list('article', 30).catch(() => []),
    ]);
    setSystems(s || []);
    setCaps(c || []);
    setGaps(g || []);
    setActions(a || []);
    setRules(r || []);
    if (s?.length && !activeSystem) setActiveSystem(s[0].category);
  };

  useEffect(() => { load(); }, []);

  const sys = useMemo(() => systems?.find((x) => x.category === activeSystem) || systems?.[0], [systems, activeSystem]);
  const sysCaps = useMemo(() => (caps || []).filter((c) => c.system_name === sys?.name), [caps, sys]);
  const sysGaps = useMemo(() => (gaps || []).filter((g) => g.system_id === sys?.dna_id), [gaps, sys]);
  const sysActions = useMemo(() => (actions || []).filter((a) => a.system_id === sys?.dna_id), [actions, sys]);

  const avgScore = sysCaps.length ? Math.round(sysCaps.reduce((a, c) => a + (c.benchmark_position || 0), 0) / sysCaps.length) : 0;
  const criticalGaps = sysGaps.filter((g) => g.severity === 'P0' || g.is_blocking);
  const activeActions = sysActions.filter((a) => !['done', 'deployed', 'cancelled', 'failed'].includes(a.status));
  const nextAction = activeActions.sort((a, b) => (a.priority > b.priority ? -1 : 1))[0];

  if (systems === null) {
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
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">System DNA v1.0 · Command Center</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          The single source of truth.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Every system's target state, current state, gaps, evidence, and next action — traceable, evidence-backed, never faked. The map every agent and page refers back to.
        </p>
      </div>

      {/* System tabs */}
      <div className="flex gap-2 flex-wrap">
        {SYSTEMS.map((s) => {
          const Icon = s.icon;
          const active = activeSystem === s.id;
          const sysRecord = systems?.find((x) => x.category === s.id);
          return (
            <button
              key={s.id}
              onClick={() => setActiveSystem(s.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all',
                active ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{s.label}</span>
              {sysRecord && (
                <span className={cn('text-xs font-semibold', active ? 'text-background/70' : scoreColor(sysRecord.current_score))}>
                  {sysRecord.current_score}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sys && (
        <>
          {/* WHERE ARE WE / WHERE ARE WE GOING */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Where are we?</p>
              <div className="flex items-end gap-3">
                <span className={cn('text-5xl font-bold', scoreColor(sys.current_score))}>{sys.current_score}</span>
                <span className="text-lg text-muted-foreground mb-1">/ 100 verified</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden mt-3">
                <div className={cn('h-full rounded-full', scoreBg(sys.current_score))} style={{ width: `${sys.current_score}%` }} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Lifecycle:</span>
                <span className={cn('text-xs font-medium capitalize', stateColor(sys.lifecycle_state))}>
                  {sys.lifecycle_state?.replace(/_/g, ' ') || 'unknown'}
                </span>
              </div>
            </Card>

            <Card className="p-5 border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Where are we going?</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-foreground">{sys.north_star_score}</span>
                <span className="text-lg text-muted-foreground mb-1">/ 100 target</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden mt-3">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${sys.north_star_score}%` }} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">North Star — the benchmark bar</span>
              </div>
            </Card>
          </div>

          {/* WHAT IS WRONG */}
          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-medium">What is wrong?</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Critical Gaps', value: criticalGaps.length, icon: AlertTriangle, color: 'text-rose-500' },
                { label: 'Blocked Reqs', value: sys.blocked_requirements_count || 0, icon: XCircle, color: 'text-orange-500' },
                { label: 'Failed Tests', value: sys.failed_tests_count || 0, icon: XCircle, color: 'text-rose-500' },
                { label: 'Health', value: sys.health_status || 'unknown', icon: Activity, color: stateColor(sys.health_status) },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={cn('w-3.5 h-3.5', s.color)} />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    </div>
                    <p className={cn('text-xl font-semibold capitalize', s.color)}>{s.value}</p>
                  </div>
                );
              })}
            </div>
            {criticalGaps.length > 0 && (
              <div className="mt-4 space-y-2">
                {criticalGaps.slice(0, 3).map((g) => (
                  <div key={g.id} className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-[9px]">{g.severity}</Badge>
                      <span className="text-xs font-medium">{g.target_state?.slice(0, 80)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{g.measurable_difference || g.proposed_solution}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* WHAT HAPPENS NEXT */}
          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-medium">What happens next?</h3>
            </div>
            {nextAction ? (
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-[9px]">{nextAction.priority}</Badge>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{nextAction.source}</span>
                </div>
                <p className="text-sm font-medium">{nextAction.objective}</p>
                {nextAction.acceptance_criteria && (
                  <p className="text-xs text-muted-foreground mt-1.5">Acceptance: {nextAction.acceptance_criteria}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active actions. System is stable.</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active actions:</span>
              <span className="text-sm font-semibold">{activeActions.length}</span>
            </div>
          </Card>

          {/* Validation & Security health */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Validation Health', value: sys.validation_health, icon: CheckCircle2 },
              { label: 'Security Health', value: sys.security_health, icon: Shield },
              { label: 'Capabilities Tracked', value: sysCaps.length, icon: FileCode },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="p-4 border-border/60">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  </div>
                  <p className={cn('text-lg font-semibold capitalize', typeof s.value === 'string' ? stateColor(s.value) : 'text-foreground')}>{s.value}</p>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* System Rules */}
      {rules?.length > 0 && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">System Constitution — {rules.length} rules</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {rules.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground font-mono shrink-0">{r.article}.</span>
                <span className="text-muted-foreground">{r.principle}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Link to="/capabilities">
          <Button variant="outline" size="sm">View full capability matrix <ArrowRight className="w-3.5 h-3.5" /></Button>
        </Link>
      </div>
    </div>
  );
}