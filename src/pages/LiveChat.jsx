import React, { useState } from 'react';
import { Telescope, ShieldCheck, Crosshair, Palette, LineChart, Calculator, Crown, Sparkles, FileText, Brain, EyeOff, Wallet, Megaphone } from 'lucide-react';
import LiveAgentChat from '@/components/chat/LiveAgentChat';

const AGENTS = [
  { name: 'vision', label: 'Vision', description: 'Sweeps the world daily for ranked niches, problems, and app opportunities.', Icon: Telescope, adminOnly: false },
  { name: 'validator', label: 'Validator', description: 'Audits every claim for truth and delivers an opinionated, math-grounded verdict.', Icon: ShieldCheck, adminOnly: false },
  { name: 'strategy', label: 'Strategy', description: 'Reverse-engineers the top players and produces architecture, moat, and build plans.', Icon: Crosshair, adminOnly: false },
  { name: 'brand', label: 'Brand', description: 'Builds full brand systems — logos, positioning, pricing psychology, launch angles.', Icon: Palette, adminOnly: false },
  { name: 'capital', label: 'Capital', description: 'Identifies wealth vehicles and designs AI-picked, AI-managed portfolios.', Icon: LineChart, adminOnly: false },
  { name: 'quant', label: 'Quant', description: 'Builds and stress-tests paper portfolios; quantifies everything, flags model risk.', Icon: Calculator, adminOnly: false },
  { name: 'maxwell', label: 'Maxwell', description: 'Stewards leadership and governance; keeps the council ordered and anti-hierarchical.', Icon: Crown, adminOnly: false },
  { name: 'sage', label: 'Sage', description: 'Grounds long-horizon decisions in universal laws and generational wellbeing.', Icon: Sparkles, adminOnly: false },
  { name: 'documenter', label: 'Documenter', description: 'Logs every communication and decision into a permanent, audit-ready record.', Icon: FileText, adminOnly: false },
  { name: 'philosopher', label: 'Philosopher', description: 'Grounds decisions in first principles, ethics, and long-term human consequence.', Icon: Brain, adminOnly: false },
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
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">Talk to the council.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Open a live channel with any operative. Each agent remembers the conversation, reads the system's data, and acts on its tools.</p>
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