import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Activity, CheckCircle2, AlertTriangle, XCircle, Gauge, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const SKILL_COLORS = {
  intelligence: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  strategy: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  build: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  audit: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  comms: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  money: 'text-green-500 bg-green-500/10 border-green-500/30',
  ops: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
  coding: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  research: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
  governance: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
};

const STATUS_ICON = {
  passing: { icon: CheckCircle2, color: 'text-emerald-500' },
  borderline: { icon: AlertTriangle, color: 'text-amber-500' },
  failing: { icon: XCircle, color: 'text-rose-500' },
};

function PerformanceBar({ performance, benchmark }) {
  const pct = Math.min(100, performance);
  const meetsBenchmark = performance >= benchmark;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
        <div
          className={cn('h-full rounded-full transition-all', meetsBenchmark ? 'bg-emerald-500' : 'bg-amber-500')}
          style={{ width: pct + '%' }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/40"
          style={{ left: benchmark + '%' }}
          title={'Benchmark: ' + benchmark}
        />
      </div>
      <span className={cn('text-[10px] font-mono w-7 text-right', meetsBenchmark ? 'text-emerald-500' : 'text-amber-500')}>
        {pct}
      </span>
    </div>
  );
}

export default function SwarmMatrix() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('swarmMatrix', {});
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <XCircle className="w-8 h-8 text-rose-500 mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button onClick={load} className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90">Retry</button>
      </div>
    );
  }

  const { matrix, skill_categories, benchmark_summary, summary } = data;
  const filteredAgents = selectedSkill ? matrix.filter((m) => m.skills.includes(selectedSkill)) : matrix;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Swarm Capability Matrix</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Agent × Skill × Benchmark</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time performance of all {summary.total_agents} agents against system benchmarks.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Active Agents</span>
          </div>
          <p className="text-2xl font-display">{summary.active_agents}<span className="text-sm text-muted-foreground">/{summary.total_agents}</span></p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gauge className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Avg Performance</span>
          </div>
          <p className="text-2xl font-display">{summary.avg_performance}<span className="text-sm text-muted-foreground">%</span></p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Pass Rate</span>
          </div>
          <p className="text-2xl font-display">{summary.pass_rate}<span className="text-sm text-muted-foreground">%</span></p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Skill Evals</span>
          </div>
          <p className="text-2xl font-display">{summary.passing_skills}<span className="text-sm text-muted-foreground">/{summary.total_skill_evals}</span></p>
        </div>
      </div>

      {/* Skill filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedSkill(null)}
          className={cn(
            'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
            !selectedSkill ? 'bg-foreground text-background border-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground'
          )}
        >
          All Skills
        </button>
        {Object.entries(skill_categories).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setSelectedSkill(selectedSkill === key ? null : key)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5',
              selectedSkill === key ? 'bg-foreground text-background border-foreground' : cn('border-border/40 hover:opacity-80', SKILL_COLORS[key])
            )}
          >
            {cat.label}
            <span className="text-[9px] opacity-60">· {benchmark_summary[key]?.agent_count || 0}</span>
          </button>
        ))}
      </div>

      {/* Benchmark summary bar */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Benchmark Performance by Skill Category</p>
        <div className="space-y-2">
          {Object.entries(benchmark_summary).map(([key, bs]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs w-28 truncate">{bs.label}</span>
              <div className="flex-1"><PerformanceBar performance={bs.avg_performance} benchmark={bs.benchmark} /></div>
              <span className="text-[10px] text-muted-foreground w-20 text-right">{bs.agent_count} agents</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent matrix grid */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {selectedSkill ? `Agents with ${skill_categories[selectedSkill]?.label} skill` : 'All Agents'} ({filteredAgents.length})
          </p>
        </div>
        <div className="divide-y divide-border/40">
          {filteredAgents.map((agent) => (
            <div key={agent.agent_id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                {/* Agent identity */}
                <div className="w-40 shrink-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{agent.codename}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{agent.role}</p>
                </div>

                {/* Skills with performance */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {agent.skills.map((sk) => {
                      const sp = agent.skill_performance[sk];
                      if (!sp) return null;
                      const SIcon = STATUS_ICON[sp.status]?.icon || AlertTriangle;
                      const sColor = STATUS_ICON[sp.status]?.color || 'text-muted-foreground';
                      return (
                        <div
                          key={sk}
                          className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px]', SKILL_COLORS[sk])}
                          title={skill_categories[sk]?.label + ': ' + sp.performance + '% (benchmark: ' + sp.benchmark + '%)'}
                        >
                          <SIcon className={cn('w-3 h-3', sColor)} />
                          <span className="font-medium">{skill_categories[sk]?.label || sk}</span>
                          <span className="font-mono opacity-70">{sp.performance}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">Tasks: </span>
                      <span className="font-mono">{agent.tasks_completed}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Score: </span>
                      <span className="font-mono">{agent.avg_score}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Success: </span>
                      <span className="font-mono">{agent.success_rate}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Logs: </span>
                      <span className="font-mono">{agent.log_activity?.total || 0}</span>
                      {agent.log_activity?.errors > 0 && (
                        <span className="text-rose-500 ml-1">({agent.log_activity.errors} err)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Health indicator */}
                <div className="w-16 shrink-0 text-right">
                  <div className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                    agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', agent.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground')} />
                    {agent.status}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">HP {agent.health}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}