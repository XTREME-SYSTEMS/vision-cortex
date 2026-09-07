import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DurationHeatmap({ agents }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.TimeClockEntry.filter({ status: 'completed' }, '-created_date', 100).catch(() => []);
      setEntries(data || []);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const heatData = useMemo(() => {
    if (!entries || !agents) return { agents: [], tasks: [] };

    const agentDurations = {};
    for (const e of entries) {
      if (!agentDurations[e.agent_name]) {
        agentDurations[e.agent_name] = { total: 0, count: 0, max: 0, tasks: [] };
      }
      const dur = e.duration_minutes || 0;
      agentDurations[e.agent_name].total += dur;
      agentDurations[e.agent_name].count++;
      agentDurations[e.agent_name].max = Math.max(agentDurations[e.agent_name].max, dur);
    }

    const agentHeat = Object.entries(agentDurations).map(([name, data]) => ({
      name,
      avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
      max: data.max,
      count: data.count,
    })).sort((a, b) => b.avg - a.avg);

    const allTasks = entries
      .map(e => ({ task_type: e.task_type, agent: e.agent_name, duration: e.duration_minutes || 0 }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return { agents: agentHeat, tasks: allTasks };
  }, [entries, agents]);

  if (!heatData.agents.length) return null;

  const getHeatColor = (avg) => {
    if (avg === 0) return 'bg-muted/20 text-muted-foreground';
    if (avg < 15) return 'bg-emerald-500/60 text-white';
    if (avg < 30) return 'bg-amber-500/60 text-white';
    if (avg < 60) return 'bg-orange-500/60 text-white';
    return 'bg-red-500/70 text-white';
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold">Duration Heat-Map</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Highlights agents/tasks taking the longest
        </span>
      </div>

      {/* Agent heat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        {heatData.agents.map(a => (
          <div
            key={a.name}
            className={cn('rounded-lg p-2.5 border border-border/40', getHeatColor(a.avg))}
            title={`${a.name}: avg ${a.avg}min, max ${a.max}min, ${a.count} tasks`}
          >
            <p className="text-[10px] font-medium truncate">{a.name}</p>
            <p className="text-lg font-bold mt-0.5">
              {a.avg}<span className="text-[10px] font-normal opacity-80">min avg</span>
            </p>
            <p className="text-[9px] opacity-80 mt-0.5">{a.count} tasks · max {a.max}m</p>
          </div>
        ))}
      </div>

      {/* Longest tasks list */}
      {heatData.tasks.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Longest Running Tasks
          </p>
          <div className="space-y-1">
            {heatData.tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border/30 p-2">
                <span className={cn('w-2 h-2 rounded-full shrink-0', getHeatColor(t.duration).split(' ')[0])} />
                <span className="text-[11px] font-medium truncate flex-1">{t.task_type}</span>
                <span className="text-[10px] text-muted-foreground truncate hidden md:inline">{t.agent}</span>
                <span className="text-[11px] font-mono font-semibold text-orange-400">{t.duration}m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}