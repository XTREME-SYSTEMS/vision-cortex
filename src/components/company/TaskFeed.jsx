import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Check, Loader2, Clock, AlertCircle, ChevronRight } from 'lucide-react';

const STATUS_ICON = {
  completed: { icon: Check, color: 'text-emerald-500' },
  in_progress: { icon: Loader2, color: 'text-blue-500', spin: true },
  scheduled: { icon: Clock, color: 'text-amber-500' },
  failed: { icon: AlertCircle, color: 'text-red-500' },
};

export default function TaskFeed({ tasks }) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    // Subscribe to live updates
    const unsub = base44.entities.AgentSchedule.subscribe((event) => {
      if (event.type === 'create') {
        setFeed(prev => [event.data, ...prev].slice(0, 50));
      } else if (event.type === 'update') {
        setFeed(prev => prev.map(t => t.id === event.data.id ? event.data : t));
      }
    });
    return unsub;
  }, []);

  const allTasks = [...feed];
  // Also include any passed tasks
  if (tasks) allTasks.unshift(...tasks);

  // Deduplicate by id
  const seen = new Set();
  const deduped = allTasks.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  if (deduped.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No task activity yet. Bootstrap the company to begin.</p>;
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar">
      {deduped.slice(0, 30).map(task => {
        const meta = STATUS_ICON[task.status] || STATUS_ICON.scheduled;
        const Icon = meta.icon;
        return (
          <div key={task.id} className="flex items-center gap-2 rounded-md border border-border/20 bg-card/50 px-2.5 py-1.5 text-xs hover:bg-card transition-colors">
            <Icon className={cn('w-3.5 h-3.5 shrink-0', meta.color, meta.spin && 'animate-spin')} />
            <span className="font-medium w-32 truncate shrink-0">{task.agent_name}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <span className="flex-1 truncate text-muted-foreground">{task.task_title}</span>
            {task.progress > 0 && task.status === 'in_progress' && (
              <span className="text-[9px] text-blue-500 font-mono shrink-0">{task.progress}%</span>
            )}
            {task.duration_minutes > 0 && task.status === 'completed' && (
              <span className="text-[9px] text-muted-foreground/60 shrink-0">{task.duration_minutes}m</span>
            )}
            {task.payment_amount > 0 && task.status === 'completed' && (
              <span className="text-[9px] text-violet-500 font-mono shrink-0">+{task.payment_amount} INF</span>
            )}
          </div>
        );
      })}
    </div>
  );
}