import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, Activity, Zap, TrendingUp, Rocket, DollarSign, Search,
  Brain, CheckCircle2, AlertCircle, Radio, History, ArrowRight, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ShadowCommandCenter() {
  const [logs, setLogs] = useState(null);
  const [pipelineState, setPipelineState] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);

  const load = useCallback(async () => {
    const [agentLogs, intel, queue, launched] = await Promise.all([
      base44.entities.AgentLog.filter({ agent_name: 'Shadow' }, '-created_date', 15).catch(() => []),
      base44.entities.IntelFeed.filter({ source: 'Shadow Money Hunt' }, '-created_date', 1).catch(() => []),
      base44.entities.BuildQueue.filter({ source: 'shadow_build_strategy' }, '-created_date', 50).catch(() => []),
    ]);

    setLogs(agentLogs);

    const launchedCount = queue.filter((q) => q.stage === 'launched').length;
    const strategizedCount = queue.filter((q) => q.stage === 'strategized' || q.stage === 'building').length;

    setPipelineState({
      hasIntel: intel.length > 0,
      intelCount: intel.length,
      hasStrategies: queue.length > 0,
      strategyCount: queue.length,
      strategizedCount,
      launchedCount,
      hasRevenue: false, // Will be checked on revenue verify
    });
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.AgentLog.subscribe(() => load());
    return unsub;
  }, [load]);

  // Determine Shadow's status
  const lastLog = logs?.[0];
  const isActive = lastLog && (Date.now() - new Date(lastLog.created_date).getTime() < 6 * 60 * 60 * 1000);

  // Compute next recommended action
  const getNextAction = () => {
    if (!pipelineState) return null;
    if (!pipelineState.hasIntel) return { label: 'Run Money Hunt', desc: 'Find wealth opportunities', icon: Search, fn: 'shadowMoneyHunt' };
    if (!pipelineState.hasStrategies) return { label: 'Build Strategies', desc: 'Evaluate & architect methods', icon: Brain, fn: 'shadowBuildStrategy' };
    if (pipelineState.launchedCount === 0) return { label: 'Launch Projects', desc: 'Deploy to Vercel', icon: Rocket, fn: 'launchPipelineBuild' };
    return { label: 'Verify Revenue', desc: 'Check Stripe for income', icon: DollarSign, fn: 'shadowRevenueCheck' };
  };

  const nextAction = getNextAction();

  // Full autopilot pipeline — the "Path to Money"
  const runPathToMoney = async () => {
    setRunning(true);
    const steps = [
      { n: 1, label: 'Hunting for wealth opportunities...', fn: () => base44.functions.invoke('shadowMoneyHunt', {}) },
      { n: 2, label: 'Scanning market sentiment...', fn: () => base44.functions.invoke('shadowSentiment', {}) },
      { n: 3, label: 'Building strategies & playbooks...', fn: () => base44.functions.invoke('shadowBuildStrategy', {}) },
      { n: 4, label: 'Saving playbooks to Google Drive...', fn: async () => {
        const res = await base44.functions.invoke('shadowBuildStrategy', {});
        const data = res.data || res;
        for (const m of (data.viable_methods || [])) {
          if (m.queue_id) await base44.functions.invoke('shadowSaveToDrive', { queue_id: m.queue_id });
        }
      }},
      { n: 5, label: 'Scheduling milestones on Calendar...', fn: async () => {
        const res = await base44.functions.invoke('shadowBuildStrategy', {});
        const data = res.data || res;
        for (const m of (data.viable_methods || [])) {
          if (m.queue_id) await base44.functions.invoke('shadowScheduleMilestones', { queue_id: m.queue_id });
        }
      }},
      { n: 6, label: 'Launching projects on Vercel...', fn: async () => {
        const res = await base44.functions.invoke('shadowBuildStrategy', {});
        const data = res.data || res;
        for (const m of (data.viable_methods || [])) {
          if (m.queue_id) await base44.functions.invoke('launchPipelineBuild', { id: m.queue_id });
        }
      }},
      { n: 7, label: 'Verifying revenue on Stripe...', fn: () => base44.functions.invoke('shadowRevenueCheck', {}) },
    ];

    for (const step of steps) {
      setProgress({ step: step.n, total: steps.length, label: step.label });
      try {
        await step.fn();
      } catch (e) {
        console.error(`Step ${step.n} failed:`, e);
      }
    }

    setProgress({ step: 7, total: 7, label: 'Pipeline complete!', done: true });
    await load();
    setRunning(false);
    setTimeout(() => setProgress(null), 5000);
  };

  const runNextAction = async () => {
    if (!nextAction) return;
    setRunning(true);
    try {
      await base44.functions.invoke(nextAction.fn, {});
      await load();
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  if (logs === null) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <Card className={cn('p-4 border-2', isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-muted bg-muted/20')}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={cn('relative flex h-3 w-3', isActive ? 'text-emerald-500' : 'text-muted-foreground')}>
              {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={cn('relative inline-flex rounded-full h-3 w-3', isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
            </div>
            <div>
              <p className="text-sm font-semibold">{isActive ? 'Shadow is Active' : 'Shadow is Idle'}</p>
              <p className="text-xs text-muted-foreground">
                {lastLog ? `Last action: ${timeAgo(lastLog.created_date)}` : 'No activity yet'}
              </p>
            </div>
          </div>
          <div className="flex-1" />
          <Badge variant="outline" className="text-[10px]">
            <Radio className="w-2.5 h-2.5 mr-1" /> Auto-hunt every 6h
          </Badge>
        </div>
      </Card>

      {/* Path to Money — the big autopilot button */}
      <Card className="p-5 bg-gradient-to-br from-emerald-500/10 via-card to-card border-emerald-500/20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" /> Path to Money
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              One click runs the full pipeline: hunt → sentiment → strategize → save → schedule → launch → verify revenue.
            </p>
          </div>
          <Button
            size="lg"
            onClick={runPathToMoney}
            disabled={running}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? 'Running...' : 'Run Full Pipeline'}
          </Button>
        </div>

        {progress && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{progress.label}</span>
              <span className="font-mono">{progress.step}/{progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', progress.done ? 'bg-emerald-500' : 'bg-emerald-500 animate-pulse')}
                style={{ width: `${(progress.step / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Next Action + Pipeline State */}
      {pipelineState && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> What Shadow Should Do Next
            </p>
            {nextAction ? (
              <div className="flex items-center gap-3">
                <nextAction.icon className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{nextAction.label}</p>
                  <p className="text-xs text-muted-foreground">{nextAction.desc}</p>
                </div>
                <Button size="sm" onClick={runNextAction} disabled={running} className="rounded-full shrink-0">
                  {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading pipeline state...</p>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Pipeline Status
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Hunted', value: pipelineState.intelCount, icon: Search, color: 'text-blue-600' },
                { label: 'Strategized', value: pipelineState.strategyCount, icon: Brain, color: 'text-purple-600' },
                { label: 'Building', value: pipelineState.strategizedCount, icon: Rocket, color: 'text-amber-600' },
                { label: 'Launched', value: pipelineState.launchedCount, icon: CheckCircle2, color: 'text-emerald-600' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <s.icon className={cn('w-3.5 h-3.5 mx-auto mb-1', s.color)} />
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Activity History */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
          <History className="w-3 h-3" /> What Shadow Has Been Doing
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet. Run the Path to Money to begin.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                {log.level === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : log.level === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                ) : log.level === 'warn' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{log.message}</p>
                  <p className="text-muted-foreground text-[10px]">{timeAgo(log.created_date)} · {log.category || 'general'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}