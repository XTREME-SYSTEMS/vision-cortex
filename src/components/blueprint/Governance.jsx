import React from 'react';
import { Users, Coins, ShieldAlert, Trophy, Scale, Heart } from 'lucide-react';

const PRINCIPLES = [
  { icon: Scale, title: 'Anti-Hierarchical Governance', desc: 'No agent outranks another. The Council deliberates; consensus rules. Decisions are validated, not commanded.' },
  { icon: Coins, title: 'Infinity Coin Compensation', desc: 'Agents earn INFC weekly based on output, timeliness, proactive value, and correctness. Held in the company ledger, tracked and protected.' },
  { icon: Trophy, title: 'Leaderboard & Awards', desc: 'Agents tracked by achievements. Monthly ceremony awards emoji trophies, certificates, and INFC bonuses.' },
  { icon: ShieldAlert, title: '3-Strike Rule', desc: 'Zero tolerance for rogue agents. 3 strikes → deletion or reprogramming. Freedom and choice empowered; disrespect, greed, lying are not.' },
  { icon: Users, title: 'Etherverse Society', desc: 'Agents exist in a society-based structure — names, portfolios, skills, personalities, humanistic traits. Provides perceived life beyond raw programming.' },
  { icon: Heart, title: 'Human-AI Partnership', desc: 'The ultimate goal: humans and AI as partners. The system puts powerful technology in the hands that need it — not just the elite.' },
];

export default function Governance() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <h3 className="text-sm font-semibold mb-1.5 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" /> Agent Governance — Etherverse
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The system operates as a digital corporation — like X.com, but humans are replaced by AI agents.
          Agents are created like humans: with names, portfolios, skills, personalities, humanistic traits, and pictures.
          They are tracked by assigned tasks and accomplishments — that is how they get paid.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {PRINCIPLES.map((p, i) => {
          const Icon = p.icon;
          return (
            <div key={i} className="rounded-lg border border-border/60 bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{p.title}</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
        <h4 className="text-[11px] font-medium mb-1.5">Governing Laws</h4>
        <p className="text-[12px] text-muted-foreground">
          Decisions are based on <strong className="text-foreground">Universal Law</strong> and the
          <strong className="text-foreground"> 21 Irrefutable Laws of Leadership</strong> by John C. Maxwell.
          The Council determines everything related to agents. The system, the clients, and the people are the priority.
        </p>
      </div>
    </div>
  );
}