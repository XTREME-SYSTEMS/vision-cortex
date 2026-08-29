import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AgentCard from '@/components/agents/AgentCard';

export default function Agents() {
  const [agents, setAgents] = useState(null);

  useEffect(() => {
    base44.entities.AgentProfile.list('order', 50).then(setAgents);
  }, []);

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">The Network</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Agent roster & personality blueprints.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Each agent runs autonomously, ten steps ahead — surfacing ideas, warnings, and competitor foresight without being asked.
        </p>
      </div>

      {agents === null && <p className="text-sm text-muted-foreground">Loading roster…</p>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents?.map((a) => <AgentCard key={a.id} agent={a} />)}
      </div>
    </div>
  );
}