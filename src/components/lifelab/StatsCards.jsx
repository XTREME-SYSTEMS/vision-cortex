import React from 'react';
import { DollarSign, HeartPulse, Smile, Users, TrendingUp, Skull } from 'lucide-react';

const money = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${a}`;
};

export default function StatsCards({ stats, count }) {
  if (!stats) return null;
  const cards = [
    { icon: DollarSign, label: 'Median net worth (p50)', value: money(stats.p50), sub: `${money(stats.p10)} – ${money(stats.p90)}`, tone: 'text-emerald-500' },
    { icon: TrendingUp, label: 'Mean net worth', value: money(stats.mean), sub: `min ${money(stats.min)} · max ${money(stats.max)}`, tone: 'text-blue-500' },
    { icon: Skull, label: 'Median age at death', value: `${stats.medianAgeAtDeath}`, sub: `${stats.pctReach100}% reach 100`, tone: 'text-purple-500' },
    { icon: HeartPulse, label: 'Avg final health', value: `${stats.avgFinalHealth}`, sub: '/ 100', tone: 'text-rose-500' },
    { icon: Smile, label: 'Avg final happiness', value: `${stats.avgFinalHappy}`, sub: '/ 100', tone: 'text-amber-500' },
    { icon: Users, label: 'Avg relationships', value: `${stats.avgFinalRel}`, sub: '/ 100', tone: 'text-cyan-500' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <c.icon className={`w-4 h-4 ${c.tone}`} />
            <span className="text-[11px] uppercase tracking-wide">{c.label}</span>
          </div>
          <div className="font-display text-3xl mt-1.5">{c.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}