import React, { useState } from 'react';
import { EyeOff, Wallet, Megaphone } from 'lucide-react';
import LiveAgentChat from '@/components/chat/LiveAgentChat';

const AGENTS = [
  { name: 'treasurer', label: 'Treasurer', description: 'Track MRR, churn, unit economics, and platform-dependency risk.', Icon: Wallet, adminOnly: false },
  { name: 'distributor', label: 'Distributor', description: 'Own ranking, content cadence, backlink outreach, and the build queue.', Icon: Megaphone, adminOnly: false },
  { name: 'shadow', label: 'Shadow', description: 'Unrestricted covert access — owner only, no trace on shared feeds.', Icon: EyeOff, adminOnly: true },
];

export default function LiveChat() {
  const [active, setActive] = useState(AGENTS[0]);
  const Agent = AGENTS.find((a) => a.name === active.name) || AGENTS[0];

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Live Channels</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">Talk to the agents.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Open a live channel with any operative. Each agent remembers the conversation and can act on its tools.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AGENTS.map((a) => {
          const on = a.name === Agent.name;
          return (
            <button
              key={a.name}
              onClick={() => setActive(a)}
              className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                on ? 'bg-foreground text-background' : 'border border-border/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              <a.Icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl">
        <p className="text-xs text-muted-foreground mb-3">{Agent.description}</p>
        <LiveAgentChat
          key={Agent.name}
          agentName={Agent.name}
          label={Agent.label}
          description={Agent.description}
          Icon={Agent.Icon}
          adminOnly={Agent.adminOnly}
        />
      </div>
    </div>
  );
}