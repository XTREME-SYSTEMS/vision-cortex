import React from 'react';
import { Bot, CheckCircle2, Coins, Activity } from 'lucide-react';

export default function SimStats({ stats, activeSchedules }) {
  const items = [
    { icon: Bot, label: 'Active', value: `${stats.active}/${stats.total}`, color: 'text-emerald-400' },
    { icon: Activity, label: 'Working', value: activeSchedules, color: 'text-sky-400' },
    { icon: CheckCircle2, label: 'Done', value: stats.tasks, color: 'text-amber-400' },
    { icon: Coins, label: 'INF', value: stats.inf.toFixed(2), color: 'text-violet-400' },
  ];

  return (
    <div className="shrink-0 flex items-center gap-4 px-4 py-2.5 border-b border-white/10 bg-slate-900/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-mono tracking-[0.2em] text-white/60 uppercase">Live Ops Floor</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span className="text-xs font-semibold text-white">{item.value}</span>
            <span className="text-[10px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}