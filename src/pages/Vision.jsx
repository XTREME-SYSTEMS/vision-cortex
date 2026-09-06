import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Radar, Target, Activity, Clock, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import SwarmTimeline from '@/components/vision/SwarmTimeline';
import AgentProgressGrid from '@/components/vision/AgentProgressGrid';
import BrainLinkPanel from '@/components/vision/BrainLinkPanel';

const toBullets = (text) => {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
};

export default function Vision() {
  const [plan, setPlan] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.MasterPlan.list('-created_date', 1).then((r) => r[0] || null).catch(() => null),
      base44.entities.AgentProfile.list('-order', 100).catch(() => []),
    ]).then(([p, a]) => {
      setPlan(p);
      setAgents(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading vision…</div>;
  }

  const overallPct = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + (a.health || 0), 0) / agents.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Vision Header */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Radar className="w-5 h-5" />
          <h1 className="font-display text-2xl tracking-tight">The Vision</h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">
            {plan?.status || 'planning'} · {plan?.current_phase || ''}
          </span>
        </div>
        <ul className="space-y-1.5">
          {(plan?.vision ? toBullets(plan.vision) : ['No vision recorded yet.']).map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
              <span className="flex-1">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* System Plan & Strategy */}
      <section className="border border-border/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4" />
          <h2 className="font-display text-lg">System Plan & Strategy</h2>
        </div>
        <ol className="space-y-1.5 mb-4">
          {(plan?.protocol || plan?.architecture ? toBullets(plan.protocol || plan.architecture) : ['No protocol recorded.']).map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1">{b}</span>
            </li>
          ))}
        </ol>
        {plan?.missions?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Missions</p>
            {plan.missions.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={cn('w-2 h-2 rounded-full shrink-0', m.status === 'complete' ? 'bg-emerald-500' : m.status === 'in_progress' ? 'bg-amber-500' : 'bg-muted-foreground/30')} />
                <span className="flex-1">{m.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{m.status?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 24/7 Swarm Timeline */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" />
          <h2 className="font-display text-lg">24/7 Swarm Operation</h2>
          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Running
          </span>
        </div>
        <SwarmTimeline agents={agents} />
      </section>

      {/* Agent Progress */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" />
          <h2 className="font-display text-lg">Agent Progress</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {agents.filter((a) => (a.health || 0) >= 100).length}/{agents.length} complete · {overallPct}% overall
          </span>
        </div>
        <AgentProgressGrid agents={agents} />
      </section>

      {/* Brain Link — bi-directional sync with V-1 Brain + Cloud Browser engine */}
      <section className="border border-border/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4" />
          <h2 className="font-display text-lg">Brain Link · Cloud Browser Sync</h2>
        </div>
        <BrainLinkPanel />
      </section>

      {/* Next Actions */}
      {plan?.next_actions?.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" />
            <h2 className="font-display text-lg">Next Actions</h2>
          </div>
          <div className="space-y-1.5">
            {plan.next_actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">{a}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}