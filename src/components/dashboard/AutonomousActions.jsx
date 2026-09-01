import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, Sparkles, ScanSearch, Lightbulb, Wrench,
  CheckCircle2, HeartPulse, Lock, RefreshCw, Loader2, AlertTriangle,
  Zap, ArrowRight
} from 'lucide-react';

// Each action maps a verb the user wants to a backend function.
const ACTIONS = [
  {
    id: 'audit',
    label: 'Audit',
    desc: 'Zero-failure audit of pipeline integrity, data & security',
    icon: ShieldCheck,
    fn: 'auditDestinyEngine',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  {
    id: 'reflect',
    label: 'Reflect',
    desc: 'System reflects on itself — generates new recommendations',
    icon: Sparkles,
    fn: 'autoRecommend',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    id: 'analyze',
    label: 'Analyze',
    desc: 'Scan all systems for failures, stagnation & missing features',
    icon: ScanSearch,
    fn: 'masterSystemAnalysis',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'recommend',
    label: 'Recommend',
    desc: 'Deep gap analysis with full implementation code generation',
    icon: Lightbulb,
    fn: 'autoRecommendAllSystems',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'implement',
    label: 'Implement',
    desc: 'Autonomously implement top pending enhancements with code',
    icon: Wrench,
    fn: 'autoEnhanceAll',
    payload: { max_per_run: 3 },
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'validate',
    label: 'Validate',
    desc: 'Audit implemented enhancements — pass/fail scoring',
    icon: CheckCircle2,
    fn: 'auditDestinyEngine',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    id: 'heal',
    label: 'Heal',
    desc: 'Self-healing pass — brand orphans, link builds, validate doctrines',
    icon: HeartPulse,
    fn: 'healDestinyEngine',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    id: 'harden',
    label: 'Harden',
    desc: 'Compliance & opsec audit — ethics, credential leaks, ToS risks',
    icon: Lock,
    fn: 'reguShield',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    id: 'cycle',
    label: 'Full Cycle',
    desc: 'Plan → implement → audit → fix in one autonomous pass',
    icon: Zap,
    fn: 'runEnhancementCycle',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
];

export default function AutonomousActions() {
  const [statuses, setStatuses] = useState({});
  const [runAll, setRunAll] = useState(false);

  const runAction = useCallback(async (action) => {
    setStatuses((s) => ({ ...s, [action.id]: { state: 'running' } }));
    try {
      const res = await base44.functions.invoke(action.fn, action.payload || {});
      const data = res?.data || res;
      if (data?.error) {
        setStatuses((s) => ({ ...s, [action.id]: { state: 'error', msg: data.error } }));
      } else {
        const msg = data?.message || data?.summary ||
          (typeof data === 'object' ? Object.entries(data).filter(([k]) => k !== 'error').slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Done');
        setStatuses((s) => ({ ...s, [action.id]: { state: 'done', msg: String(msg).slice(0, 120) } }));
      }
    } catch (e) {
      setStatuses((s) => ({ ...s, [action.id]: { state: 'error', msg: e?.message || 'Failed' } }));
    }
  }, []);

  const runEntireCycle = useCallback(async () => {
    setRunAll(true);
    // Sequential: analyze → recommend → implement → validate → heal → harden
    const sequence = ['analyze', 'recommend', 'implement', 'validate', 'heal', 'harden'];
    for (const id of sequence) {
      const action = ACTIONS.find((a) => a.id === id);
      if (action) await runAction(action);
    }
    setRunAll(false);
  }, [runAction]);

  const runningCount = Object.values(statuses).filter((s) => s.state === 'running').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-xl bg-foreground text-background grid place-items-center">
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-display text-lg tracking-tight">Autonomous Actions</h3>
            <p className="text-[11px] text-muted-foreground">
              One-click control of the entire self-improvement engine — audit, analyze, recommend, implement, validate, heal & harden.
            </p>
          </div>
        </div>
        <Button
          onClick={runEntireCycle}
          disabled={runAll || runningCount > 0}
          size="sm"
          className="rounded-full gap-1.5"
        >
          {runAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          {runAll ? 'Running full cycle…' : 'Run Full Cycle'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACTIONS.map((action) => {
          const st = statuses[action.id] || { state: 'idle' };
          const Icon = action.icon;
          return (
            <Card key={action.id} className="p-4 flex flex-col gap-3 border-border/60">
              <div className="flex items-start gap-3">
                <div className={cn('h-9 w-9 rounded-lg grid place-items-center shrink-0', action.bg)}>
                  <Icon className={cn('w-4.5 h-4.5', action.color)} style={{ width: '1.125rem', height: '1.125rem' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{action.desc}</p>
                </div>
              </div>

              {st.state === 'done' && st.msg && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-md px-2 py-1.5 leading-relaxed">
                  {st.msg}
                </div>
              )}
              {st.state === 'error' && st.msg && (
                <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-500/5 rounded-md px-2 py-1.5 leading-relaxed flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {st.msg}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => runAction(action)}
                disabled={st.state === 'running' || runAll}
                className="w-full rounded-full text-xs gap-1.5 mt-auto"
              >
                {st.state === 'running' ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
                ) : st.state === 'done' ? (
                  <><RefreshCw className="w-3.5 h-3.5" /> Run again</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> Run {action.label}</>
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}