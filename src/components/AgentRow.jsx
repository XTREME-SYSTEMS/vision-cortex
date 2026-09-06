import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentRow({ activeAgents, onToggleAgent }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AgentProfile.list('-order', 100)
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-background">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Loading agents…</span>
      </div>
    );
  }

  if (agents.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-background overflow-x-auto no-scrollbar">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0 mr-1">Agents</span>
      {agents.map((a) => {
        const selected = activeAgents.includes(a.name);
        return (
          <button
            key={a.id}
            onClick={() => onToggleAgent(a.name)}
            title={a.role || a.name}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all border',
              selected
                ? 'bg-foreground text-background border-foreground'
                : 'bg-muted text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground'
            )}
          >
            <span className={cn(
              'w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold shrink-0',
              selected ? 'bg-background/20 text-background' : 'bg-foreground/10 text-foreground'
            )}>
              {a.name?.[0]?.toUpperCase()}
            </span>
            <span className="truncate max-w-20">{a.name}</span>
          </button>
        );
      })}
    </div>
  );
}