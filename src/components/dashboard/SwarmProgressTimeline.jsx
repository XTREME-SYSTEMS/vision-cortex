import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Clock } from 'lucide-react';

const PHASE_COLORS = {
  Primus: 'bg-slate-500',
  Vision: 'bg-sky-500',
  Shadow: 'bg-sky-500',
  Strategy: 'bg-violet-500',
  Brand: 'bg-violet-500',
  Sage: 'bg-violet-500',
  Quant: 'bg-amber-500',
  Capital: 'bg-amber-500',
  Maxwell: 'bg-emerald-500',
  Documenter: 'bg-emerald-500',
  Distributor: 'bg-emerald-500',
  Treasurer: 'bg-emerald-500',
  'Autonomous Builder': 'bg-emerald-500',
  Validator: 'bg-rose-500',
  Philosopher: 'bg-rose-500',
  'Personal Coach': 'bg-rose-500',
  'Eden Skye': 'bg-rose-500',
};

export default function SwarmProgressTimeline() {
  const [agents, setAgents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;
    const load = () => base44.entities.AgentProfile.list('order', 60).then(setAgents).finally(() => setLoading(false));
    load();
    unsub = base44.entities.AgentProfile.subscribe(() => load());
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading swarm timeline…
      </div>
    );
  }

  if (!agents?.length) {
    return <p className="text-sm text-muted-foreground py-4">No agent profiles found.</p>;
  }

  const today = new Date().toDateString();
  const ranToday = (a) => a.last_run && new Date(a.last_run).toDateString() === today;
  const activeAgents = agents.filter((a) => a.status === 'active' || ranToday(a) || (a.health || 0) > 0);

  const overallPct = activeAgents.length
    ? Math.round(activeAgents.reduce((s, a) => s + Math.min(a.health || 0, 100), 0) / activeAgents.length)
    : 0;
  const completedCount = activeAgents.filter((a) => (a.health || 0) >= 100).length;
  const totalTasks = activeAgents.reduce((s, a) => s + (a.tasks_completed || 0), 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Today's Swarm Timeline</h3>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>{activeAgents.length} agents</span>
          <span>{totalTasks} tasks done</span>
          <span className={cn('font-mono font-semibold', overallPct >= 100 ? 'text-emerald-500' : 'text-foreground')}>
            {overallPct}% overall
          </span>
        </div>
      </div>

      {/* Timeline bars */}
      <div className="p-3 space-y-2">
        {activeAgents.map((a) => {
          const pct = Math.min(Math.round(a.health || 0), 100);
          const complete = pct >= 100;
          const barColor = PHASE_COLORS[a.name] || 'bg-slate-500';
          const isToday = ranToday(a);

          return (
            <div key={a.id} className="flex items-center gap-3 group">
              {/* Agent label */}
              <div className="w-36 shrink-0 flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0',
                    complete ? 'bg-emerald-500 text-white' : 'bg-muted text-foreground'
                  )}
                >
                  {a.name?.[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{a.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{a.role || 'Agent'}</p>
                </div>
              </div>

              {/* Progress bar with task label inside */}
              <div className="flex-1 relative h-7 bg-muted/50 rounded-lg overflow-hidden border border-border/40">
                <div
                  className={cn(
                    'h-full rounded-lg transition-all duration-500 ease-out flex items-center px-2',
                    complete ? 'bg-emerald-500' : barColor
                  )}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                >
                  <span
                    className={cn(
                      'text-[10px] font-medium truncate whitespace-nowrap',
                      complete ? 'text-white' : 'text-white/90'
                    )}
                  >
                    {a.mission || a.role || 'Operating'}
                  </span>
                </div>
                {/* Task count badge on right edge */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {complete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    !isToday && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
              </div>

              {/* Percentage + tasks */}
              <div className="w-20 shrink-0 text-right">
                <span
                  className={cn(
                    'text-xs font-mono font-semibold',
                    complete ? 'text-emerald-500' : 'text-muted-foreground'
                  )}
                >
                  {pct}%
                </span>
                <p className="text-[9px] text-muted-foreground">{a.tasks_completed || 0} tasks</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20 text-[11px]">
        <span className="text-muted-foreground">
          {completedCount} of {activeAgents.length} agents at 100%
        </span>
        <div className="flex-1 mx-4 h-1 bg-muted rounded-full overflow-hidden max-w-xs">
          <div
            className={cn('h-full rounded-full transition-all', overallPct >= 100 ? 'bg-emerald-500' : 'bg-foreground')}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <span className={cn('font-mono font-semibold', overallPct >= 100 ? 'text-emerald-500' : 'text-muted-foreground')}>
          {completedCount === activeAgents.length ? 'Swarm complete ✓' : 'In progress…'}
        </span>
      </div>
    </div>
  );
}