import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Network, Activity, CheckCircle2, XCircle, Clock,
  TrendingUp, Target, Search, ShieldCheck, Brain,
  Zap, AlertCircle, RefreshCw, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_META = {
  audit: { icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Audit' },
  fix: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Fix' },
  harden: { icon: ShieldCheck, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Harden' },
  build: { icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Build' },
  intelligence: { icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Discovery' },
  outreach: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Outreach' },
  comms: { icon: Activity, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', label: 'Comms' },
  strategy: { icon: Brain, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', label: 'Strategy' },
  documentation: { icon: CheckCircle2, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', label: 'Docs' },
  monitoring: { icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', label: 'Monitor' },
  other: { icon: Network, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'Other' },
};

export default function Swarms() {
  const [status, setStatus] = useState(null);
  const [timeclock, setTimeclock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [companyRes, tcRes] = await Promise.all([
        base44.functions.invoke('companyOrchestrator', { action: 'status' }),
        base44.functions.invoke('timeclockManager', { action: 'status' }).catch(() => null),
      ]);
      setStatus(companyRes);
      setTimeclock(tcRes);
    } catch (e) {
      console.error('Failed to load swarm data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 12000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const unsub = base44.entities.AgentSchedule.subscribe(() => load());
    return unsub;
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading swarm map...</div>;
  }

  const agents = status?.agents || [];
  const activeTasks = status?.active_tasks || [];
  const phases = status?.phases || {};
  const summary = status?.summary || {};

  // Build performance metrics
  const agentPerf = agents.map(a => {
    const active = activeTasks.filter(t => t.agent === a.name);
    return {
      ...a,
      active_count: a.in_progress || active.length,
      completed: a.completed || 0,
      total: a.total || 0,
      success_rate: a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0,
      inf_earned: a.inf_earned || 0,
      current_task: a.current_task || active[0]?.task,
    };
  });

  // Group agents by current work category
  const byCategory = {};
  for (const task of activeTasks) {
    const cat = task.phase?.includes('audit') ? 'audit' :
                task.phase?.includes('fix') ? 'fix' :
                task.phase?.includes('harden') ? 'harden' :
                task.phase?.includes('intelligence') ? 'intelligence' :
                task.phase?.includes('build') ? 'build' :
                task.phase?.includes('email') ? 'comms' :
                task.phase?.includes('position') ? 'documentation' :
                'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(task);
  }

  // Strategy implementations (from phases)
  const strategyPhases = Object.entries(phases).map(([id, data]) => ({
    id,
    ...data,
    progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }));

  // Aggregate metrics
  const totalThroughput = agentPerf.reduce((s, a) => s + (a.completed || 0), 0);
  const avgSuccessRate = agentPerf.length > 0
    ? Math.round(agentPerf.reduce((s, a) => s + a.success_rate, 0) / agentPerf.length)
    : 0;
  const auditAgents = agentPerf.filter(a => byCategory.audit?.some(t => t.agent === a.name));
  const auditSuccessRate = auditAgents.length > 0
    ? Math.round(auditAgents.reduce((s, a) => s + a.success_rate, 0) / auditAgents.length)
    : 0;
  const activeStrategies = strategyPhases.filter(p => p.in_progress > 0).length;

  const filteredTasks = filter === 'all' ? activeTasks : activeTasks.filter(t => {
    const cat = t.phase?.includes(filter) || t.phase === filter;
    return cat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-violet-500" />
            <h1 className="font-display text-2xl tracking-tight">Swarms</h1>
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Visual map of agent work distribution, throughput, and strategy implementation status</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted text-xs transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Performance Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={Activity}
          label="Total Throughput"
          value={totalThroughput}
          sub="tasks completed"
          color="text-blue-400"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Avg Success Rate"
          value={`${avgSuccessRate}%`}
          sub={`${summary.completed_tasks || 0} done / ${summary.total_tasks || 0} total`}
          color="text-emerald-400"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Audit Success"
          value={`${auditSuccessRate}%`}
          sub={`${auditAgents.length} agents on audit`}
          color="text-red-400"
        />
        <MetricCard
          icon={Brain}
          label="Active Strategies"
          value={activeStrategies}
          sub={`${strategyPhases.length} phases total`}
          color="text-fuchsia-400"
        />
      </div>

      {/* Swarm Map — agents grouped by work category */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Swarm Map — Who's Working on What</h3>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {activeTasks.length} active assignments across {Object.keys(byCategory).length} categories
          </span>
        </div>

        {Object.keys(byCategory).length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
            <Network className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active agent assignments. Trigger tasks from The Company page to populate the swarm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(byCategory).map(([cat, tasks]) => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.other;
              const Icon = meta.icon;
              return (
                <div key={cat} className={cn('rounded-xl border p-3', meta.border, meta.bg)}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Icon className={cn('w-4 h-4', meta.color)} />
                    <h4 className="text-xs font-semibold uppercase tracking-wider">{meta.label}</h4>
                    <span className="ml-auto text-[10px] text-muted-foreground">{tasks.length} active</span>
                  </div>
                  <div className="space-y-1.5">
                    {tasks.map(t => {
                      const agent = agentPerf.find(a => a.name === t.agent);
                      return (
                        <div key={t.id} className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
                          <div className="h-7 w-7 rounded-md bg-foreground/5 grid place-items-center shrink-0">
                            <span className="text-[9px] font-mono font-bold text-foreground/70">
                              {t.agent.split('-').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate">{t.agent}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{t.task}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-16 h-1 rounded-full bg-muted/30 overflow-hidden">
                              <div className="h-full bg-foreground/40 transition-all" style={{ width: `${t.progress}%` }} />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground">{t.progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Performance Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Agent Throughput & Success Rates</h3>
        </div>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Agent</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Role</th>
                <th className="text-center px-3 py-2 font-medium">Active</th>
                <th className="text-center px-3 py-2 font-medium">Completed</th>
                <th className="text-center px-3 py-2 font-medium">Success Rate</th>
                <th className="text-right px-3 py-2 font-medium">INF Earned</th>
              </tr>
            </thead>
            <tbody>
              {agentPerf.slice(0, 20).map(a => (
                <tr key={a.name} className="border-t border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full', a.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{a.role || a.archetype || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {a.active_count > 0 ? <span className="text-blue-400 font-medium">{a.active_count}</span> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-emerald-400">{a.completed}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-12 h-1 rounded-full bg-muted/30 overflow-hidden">
                        <div className={cn('h-full transition-all', a.success_rate >= 80 ? 'bg-emerald-500' : a.success_rate >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${a.success_rate}%` }} />
                      </div>
                      <span className="text-[10px] font-mono">{a.success_rate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-amber-400">{(a.inf_earned || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Implementation Status */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-fuchsia-500" />
          <h3 className="text-sm font-semibold">Strategy Implementation Status</h3>
          <span className="text-[10px] text-muted-foreground ml-auto">{strategyPhases.length} phases</span>
        </div>
        <div className="space-y-2">
          {strategyPhases.length === 0 ? (
            <div className="rounded-xl border border-border/40 bg-card p-4 text-center text-sm text-muted-foreground">
              No strategy phases yet. Bootstrap the company to generate the playbook schedule.
            </div>
          ) : (
            strategyPhases.map(phase => (
              <div key={phase.id} className="rounded-lg border border-border/40 bg-card p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize">{phase.id.replace(/_/g, ' ')}</span>
                    {phase.in_progress > 0 && (
                      <span className="flex items-center gap-1 text-[9px] text-blue-400">
                        <Activity className="w-2.5 h-2.5" /> {phase.in_progress} active
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {phase.completed}/{phase.total} done
                    {phase.failed > 0 && <span className="text-red-400 ml-2">{phase.failed} failed</span>}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn('h-full transition-all', phase.progress === 100 ? 'bg-emerald-500' : phase.progress > 0 ? 'bg-blue-500' : 'bg-muted-foreground/30')}
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Timeclock summary */}
      {timeclock && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Timeclock Activity</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {timeclock.active_count} active · {timeclock.total_hours}h logged · {timeclock.total_inf_payments} INF paid
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MiniStat label="Active Entries" value={timeclock.active_count} icon={Activity} color="text-blue-400" />
            <MiniStat label="Completed" value={timeclock.completed_entries} icon={CheckCircle2} color="text-emerald-400" />
            <MiniStat label="Total Hours" value={`${timeclock.total_hours}h`} icon={Clock} color="text-amber-400" />
            <MiniStat label="Unpaid" value={timeclock.unpaid_count} icon={AlertCircle} color="text-red-400" />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2.5">
      <div className="flex items-center gap-1 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-muted-foreground uppercase">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}