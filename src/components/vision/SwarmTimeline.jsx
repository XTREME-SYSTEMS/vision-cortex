import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Infinity as InfinityIcon } from 'lucide-react';

const PHASES = [
  { name: 'Discover', desc: 'Sweep forums, social & web for niches, problems, opportunities', agents: ['Vision', 'Shadow'], bar: 'bg-sky-500', text: 'text-sky-500', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
  { name: 'Understand', desc: 'Research, strategize & architect the winning plan', agents: ['Strategy', 'Brand', 'Sage'], bar: 'bg-violet-500', text: 'text-violet-500', bg: 'bg-violet-500/5', border: 'border-violet-500/20' },
  { name: 'Predict', desc: 'Model outcomes, stress-test portfolios & forecast returns', agents: ['Quant', 'Capital'], bar: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
  { name: 'Act', desc: 'Build, deploy, distribute, monetize & scale', agents: ['Maxwell', 'Documenter', 'Distributor', 'Treasurer', 'Autonomous Builder'], bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
];

const ALWAYS_ON = ['Primus', 'Validator', 'Philosopher', 'Personal Coach', 'Eden Skye'];

export default function SwarmTimeline({ agents }) {
  const agentMap = Object.fromEntries(agents.map((a) => [a.name, a]));

  const phaseProgress = (phase) => {
    const phaseAgents = phase.agents.map((n) => agentMap[n]).filter(Boolean);
    if (phaseAgents.length === 0) return 0;
    return Math.round(phaseAgents.reduce((s, a) => s + (a.health || 0), 0) / phaseAgents.length);
  };

  return (
    <div className="space-y-3">
      {/* 4-phase continuous loop */}
      <div className="flex items-stretch gap-2">
        {PHASES.map((phase, i) => {
          const pct = phaseProgress(phase);
          const complete = pct >= 100;
          return (
            <React.Fragment key={phase.name}>
              <div className={cn('flex-1 rounded-lg border p-3', phase.bg, phase.border)}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', complete ? 'bg-emerald-500' : phase.bar)} />
                  <span className={cn('text-[11px] font-bold uppercase tracking-wider', phase.text)}>{phase.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug mb-2">{phase.desc}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {phase.agents.map((n) => {
                    const a = agentMap[n];
                    const ap = a ? Math.round(a.health || 0) : 0;
                    return (
                      <span key={n} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', ap >= 100 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-background border-border/60 text-muted-foreground')}>
                        {n}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-500' : phase.bar)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={cn('text-[10px] font-mono font-semibold', complete ? 'text-emerald-500' : 'text-muted-foreground')}>{pct}%</span>
                </div>
              </div>
              {i < PHASES.length - 1 && (
                <div className="flex items-center shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Always-on bar */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <InfinityIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Always-On · 24/7</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALWAYS_ON.map((n) => {
            const a = agentMap[n];
            const ap = a ? Math.round(a.health || 0) : 0;
            const complete = ap >= 100;
            return (
              <span key={n} className={cn('flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border', complete ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-background border-border/60 text-muted-foreground')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', complete ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                {n}
                <span className="font-mono font-semibold">{ap}%</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}