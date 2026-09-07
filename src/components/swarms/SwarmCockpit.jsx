import React from 'react';
import { Crown, Search, Wrench, Shield, Cog, MessageSquare, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLUSTERS = {
  Leadership: { icon: Crown, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', archetypes: ['THE CHIEF', 'THE PRIME'] },
  Intelligence: { icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', archetypes: ['THE ORACLE', 'THE SCOUT', 'THE SHADOW'] },
  Engineering: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', archetypes: ['THE ARCHITECT', 'THE FORGE', 'THE BUILDER', 'THE BRIDGE'] },
  Security: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', archetypes: ['THE INQUISITOR', 'THE SENTINEL', 'THE AEGIS', 'THE SIREN', 'THE VALIDATOR'] },
  Operations: { icon: Cog, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', archetypes: ['THE REAPER', 'THE BROKER', 'THE VIPER'] },
  Communications: { icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', archetypes: ['THE DIPLOMAT', 'THE PRESENCE', 'THE GROWTH'] },
};

export default function SwarmCockpit({ agents, activeTasks }) {
  const clustered = {};
  for (const [clusterName, meta] of Object.entries(CLUSTERS)) {
    clustered[clusterName] = agents.filter(a => meta.archetypes.includes(a.archetype));
  }
  const unassigned = agents.filter(a => !Object.values(CLUSTERS).flatMap(c => c.archetypes).includes(a.archetype));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold">Swarm Cockpit — Cluster View</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {agents.length} agents across {Object.keys(CLUSTERS).length} clusters
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(clustered).map(([name, clusterAgents]) => {
          const meta = CLUSTERS[name];
          const Icon = meta.icon;
          const active = clusterAgents.filter(a => a.status === 'active').length;
          const idle = clusterAgents.filter(a => a.status === 'idle').length;
          const error = clusterAgents.filter(a => a.status === 'error').length;
          const clusterTasks = activeTasks.filter(t => clusterAgents.some(a => a.name === t.agent));
          const currentObjective = clusterTasks[0]?.task || 'No active assignment';

          return (
            <div key={name} className={cn('rounded-xl border p-3', meta.border, meta.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', meta.color)} />
                <h4 className="text-xs font-semibold uppercase tracking-wider">{name}</h4>
                <span className="ml-auto text-[10px] text-muted-foreground">{clusterAgents.length} agents</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {active} active
                </span>
                {idle > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {idle} idle
                  </span>
                )}
                {error > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {error} error
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-background/50 p-2">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Current Objective</p>
                <p className="text-[11px] font-medium truncate">{currentObjective}</p>
                {clusterTasks.length > 1 && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">+{clusterTasks.length - 1} more</p>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {clusterAgents.slice(0, 5).map(a => (
                  <div key={a.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full', a.status === 'active' ? 'bg-emerald-500' : a.status === 'error' ? 'bg-red-500' : 'bg-muted-foreground/40')} />
                    <span className="truncate">{a.name}</span>
                    {a.in_progress > 0 && <span className="text-blue-400 ml-auto">{a.in_progress} working</span>}
                  </div>
                ))}
                {clusterAgents.length > 5 && (
                  <p className="text-[9px] text-muted-foreground">+{clusterAgents.length - 5} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}