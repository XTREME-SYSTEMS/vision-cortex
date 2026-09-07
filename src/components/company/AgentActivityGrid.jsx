import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, Clock, AlertCircle, Pause, Circle } from 'lucide-react';

const STATUS_META = {
  completed: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Completed' },
  in_progress: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Working', spin: true },
  scheduled: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Scheduled' },
  failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Failed' },
  paused: { icon: Pause, color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-border/30', label: 'Paused' },
  idle: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-border/20', label: 'Idle' },
};

export default function AgentActivityGrid({ agents, activeTasks }) {
  const activeMap = {};
  for (const t of activeTasks) {
    activeMap[t.agent] = t;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {agents.map(agent => {
        const task = activeMap[agent.name];
        const status = task ? 'in_progress' : (agent.status === 'active' ? 'idle' : agent.status || 'idle');
        const meta = STATUS_META[status] || STATUS_META.idle;
        const Icon = meta.icon;

        return (
          <div
            key={agent.id || agent.name}
            className={cn(
              'rounded-lg border p-2.5 transition-all relative overflow-hidden',
              meta.bg, meta.border
            )}
          >
            {status === 'in_progress' && (
              <div className="absolute top-0 left-0 h-0.5 bg-blue-500 animate-pulse" style={{ width: `${task.progress}%` }} />
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn('h-7 w-7 rounded-md grid place-items-center shrink-0', meta.bg)}>
                <Icon className={cn('w-3.5 h-3.5', meta.color, meta.spin && 'animate-spin')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{agent.name}</p>
                <p className="text-[9px] text-muted-foreground truncate">{agent.role}</p>
              </div>
            </div>
            {task ? (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{task.task}</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${task.progress}%` }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">{task.progress}%</span>
                </div>
                <p className="text-[8px] text-muted-foreground/60">{task.system}</p>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground/50">{meta.label}</p>
            )}
            {agent.inf_balance > 0 && (
              <p className="text-[9px] text-violet-500 font-mono mt-1">{agent.inf_balance} INF</p>
            )}
          </div>
        );
      })}
    </div>
  );
}