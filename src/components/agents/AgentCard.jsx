import React from 'react';
import { Circle } from 'lucide-react';

export default function AgentCard({ agent }) {
  const tone = {
    active: 'text-emerald-500',
    idle: 'text-muted-foreground',
    paused: 'text-amber-500',
    error: 'text-rose-500',
  }[agent.status || 'active'];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col gap-4 hover:border-foreground/25 transition-colors">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-xl grid place-items-center text-xs font-display" style={{ background: agent.accent || '#111', color: '#fff' }}>
          {(agent.codename || agent.name).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-medium truncate">{agent.name}</p>
          <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
        </div>
        <span className={`ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${tone}`}>
          <Circle className="w-2 h-2 fill-current" /> {agent.status}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{agent.mission}</p>

      <div className="text-xs space-y-1.5">
        <p><span className="text-muted-foreground">Personality · </span>{agent.personality}</p>
        <p><span className="text-muted-foreground">Cadence · </span>{agent.cadence}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(agent.capabilities || []).slice(0, 5).map((c) => (
          <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <span>{agent.tasks_completed ?? 0} tasks</span>
        <span>Health {agent.health ?? 100}%</span>
      </div>
    </div>
  );
}