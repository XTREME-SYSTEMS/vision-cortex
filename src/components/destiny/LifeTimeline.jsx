import React from 'react';
import { Skull, Heart, AlertTriangle, TrendingUp, Zap, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

// Visual horizontal timeline plotting controllable decision points AND
// unpredictable life events along the simulation horizon, so the user sees
// both layers at once. Clicking a marker scrolls to the detail below.
const EVENT_ICON = {
  'Death of a loved one': Skull,
  Divorce: Heart,
  'Depression cycle / burnout': AlertTriangle,
  'Health crisis': AlertTriangle,
  'Market crash / recession': TrendingUp,
  'Windfall / liquidity event': Zap,
  'Hyperfocus breakthrough': Zap,
  'Marriage / partnership': Heart,
};

// Map a period_label like "Year 3", "Month 18", "2027" to a 0–1 fraction
// of the total horizon, using the timeline labels as anchors.
const periodToFraction = (periodLabel, labels) => {
  if (!periodLabel || !labels?.length) return null;
  const match = periodLabel.match(/(\d+)/);
  if (!match) return null;
  const n = parseInt(match[1]);
  // detect unit
  if (/month/i.test(periodLabel)) {
    const maxMonth = labels.reduce((mx, l) => {
      const m = l.match(/(\d+)\s*mo/i);
      return m ? Math.max(mx, parseInt(m[1])) : mx;
    }, 0) || 12;
    return Math.min(n / maxMonth, 1);
  }
  // assume year
  const maxYear = labels.reduce((mx, l) => {
    const m = l.match(/(\d+)\s*y/i);
    return m ? Math.max(mx, parseInt(m[1])) : mx;
  }, 0) || 1;
  return Math.min(n / maxYear, 1);
};

export default function LifeTimeline({ result, onJumpDecision }) {
  const labels = result?.timeline?.map((p) => p.label) || [];
  const events = result?.life_events || [];
  const decisions = result?.decision_points || [];

  const eventMarkers = events
    .map((ev) => {
      const frac = periodToFraction(ev.period_label, labels);
      return frac == null ? null : { ...ev, frac, kind: 'event' };
    })
    .filter(Boolean);

  const decisionMarkers = decisions
    .map((dp) => {
      const frac = periodToFraction(dp.period_label, labels);
      return frac == null ? null : { ...dp, frac, kind: 'decision' };
    })
    .filter(Boolean);

  if (!labels.length) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Visual Timeline · Choices & Events</p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Controllable</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Unpredictable</span>
        </div>
      </div>

      {/* The timeline track */}
      <div className="relative h-20 mb-2">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-border" />
        {/* horizon ticks */}
        <div className="absolute inset-0 flex justify-between">
          {labels.map((l, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <div className="w-px h-2 bg-border" />
              <span className="text-[9px] text-muted-foreground mt-1 -rotate-0">{l}</span>
            </div>
          ))}
        </div>
        {/* event markers */}
        {eventMarkers.map((ev, i) => {
          const Icon = EVENT_ICON[ev.kind] || AlertTriangle;
          return (
            <div
              key={`e${i}`}
              className="absolute -translate-x-1/2 group"
              style={{ left: `${ev.frac * 100}%`, top: '8%' }}
              title={`${ev.kind} · ${ev.period_label}`}
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500 grid place-items-center">
                <Icon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          );
        })}
        {/* decision markers */}
        {decisionMarkers.map((dp, i) => (
          <button
            key={`d${i}`}
            className="absolute -translate-x-1/2 group"
            style={{ left: `${dp.frac * 100}%`, bottom: '8%' }}
            onClick={() => onJumpDecision?.(dp.id)}
            title={`${dp.prompt} · ${dp.period_label}`}
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500 grid place-items-center hover:bg-blue-500/40 transition-colors">
              <GitBranch className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </button>
        ))}
      </div>

      {/* Legend lists */}
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Controllable decisions ({decisionMarkers.length})</p>
          <div className="space-y-1">
            {decisionMarkers.slice(0, 4).map((dp, i) => (
              <div key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">●</span>
                <span className="line-clamp-1">{dp.period_label}: {dp.prompt}</span>
              </div>
            ))}
            {decisionMarkers.length > 4 && <p className="text-[10px] text-muted-foreground">+{decisionMarkers.length - 4} more below</p>}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Unpredictable events ({eventMarkers.length})</p>
          <div className="space-y-1">
            {eventMarkers.slice(0, 4).map((ev, i) => (
              <div key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">●</span>
                <span className="line-clamp-1">{ev.period_label}: {ev.kind}</span>
              </div>
            ))}
            {eventMarkers.length > 4 && <p className="text-[10px] text-muted-foreground">+{eventMarkers.length - 4} more below</p>}
          </div>
        </div>
      </div>
    </div>
  );
}