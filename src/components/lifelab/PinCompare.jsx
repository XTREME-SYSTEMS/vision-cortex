import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Pin, X, GitCompare, DollarSign, Heart, Smile, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const money = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${a}`;
};

const PIN_COLORS = ['#3b82f6', '#ef4444'];

export default function PinCompare({ lives }) {
  const [pins, setPins] = useState([]);

  const togglePin = (id) => {
    setPins((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // replace oldest
      return [...prev, id];
    });
  };

  const pinnedLives = useMemo(
    () => (lives || []).filter((l) => pins.includes(l.id)),
    [lives, pins]
  );

  // Side-by-side chart data
  const chartData = useMemo(() => {
    if (pinnedLives.length < 2) return [];
    const data = [];
    const maxAge = 100;
    for (let age = 0; age <= maxAge; age++) {
      const row = { age };
      let hasAny = false;
      pinnedLives.forEach((l) => {
        const y = l.yearly?.[age];
        if (y) {
          row[`life${l.id}`] = y.netWorth;
          hasAny = true;
        }
      });
      if (hasAny) data.push(row);
    }
    return data;
  }, [pinnedLives]);

  // Milestone variations: find years where events differ
  const milestoneVariations = useMemo(() => {
    if (pinnedLives.length < 2) return [];
    const [a, b] = pinnedLives;
    const variations = [];
    const maxAge = Math.max(a.diedAtAge, b.diedAtAge);
    for (let age = 0; age <= maxAge; age++) {
      const ya = a.yearly?.[age];
      const yb = b.yearly?.[age];
      const eventsA = ya?.events || [];
      const eventsB = yb?.events || [];
      if (eventsA.length || eventsB.length) {
        variations.push({
          age,
          pathA: eventsA,
          pathB: eventsB,
          netA: ya?.netWorth,
          netB: yb?.netWorth,
        });
      }
    }
    return variations;
  }, [pinnedLives]);

  if (!lives?.length) return null;

  const StatRow = ({ label, valueA, valueB, fmt }) => (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right" style={{ color: PIN_COLORS[0] }}>{fmt(valueA)}</span>
      <span className="text-xs font-medium text-right" style={{ color: PIN_COLORS[1] }}>{fmt(valueB)}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Pin className="w-4 h-4" /> Pin & Compare Two Paths
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pin exactly two life paths to see their stats, risks, and milestone variations stacked side-by-side.
          </p>
        </div>
        {pins.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPins([])}>
            <X className="w-3 h-3" /> Clear pins
          </Button>
        )}
      </div>

      {/* Life grid for pinning */}
      <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-12 gap-1.5">
        {lives.slice(0, 50).map((l) => {
          const isPinned = pins.includes(l.id);
          const pinIdx = pins.indexOf(l.id);
          return (
            <button
              key={l.id}
              onClick={() => togglePin(l.id)}
              className={cn(
                'aspect-square rounded-md border-2 flex flex-col items-center justify-center transition-all relative',
                isPinned ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/40'
              )}
              style={isPinned ? { borderColor: PIN_COLORS[pinIdx] } : {}}
              title={`Life #${l.id + 1} · ${money(l.finalNetWorth)} · died ${l.diedAtAge}`}
            >
              {isPinned && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] grid place-items-center text-white font-bold"
                  style={{ background: PIN_COLORS[pinIdx] }}
                >
                  {pinIdx + 1}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground">#{l.id + 1}</span>
              <span className={cn('text-[10px] font-semibold', l.finalNetWorth >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                {money(l.finalNetWorth)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Side-by-side comparison */}
      {pinnedLives.length === 2 && (
        <div className="space-y-4">
          {/* Headers */}
          <div className="grid grid-cols-3 gap-2">
            <span />
            <div className="text-center">
              <span className="inline-block w-5 h-5 rounded-full text-white text-[10px] grid place-items-center font-bold" style={{ background: PIN_COLORS[0] }}>
                1
              </span>
              <p className="text-xs font-medium mt-1">Path #{pinnedLives[0].id + 1}</p>
            </div>
            <div className="text-center">
              <span className="inline-block w-5 h-5 rounded-full text-white text-[10px] grid place-items-center font-bold" style={{ background: PIN_COLORS[1] }}>
                2
              </span>
              <p className="text-xs font-medium mt-1">Path #{pinnedLives[1].id + 1}</p>
            </div>
          </div>

          {/* Stacked stats */}
          <div className="rounded-lg border border-border/60 p-3">
            <StatRow label="Final Net Worth" valueA={pinnedLives[0].finalNetWorth} valueB={pinnedLives[1].finalNetWorth} fmt={money} />
            <StatRow label="Died At Age" valueA={pinnedLives[0].diedAtAge} valueB={pinnedLives[1].diedAtAge} fmt={(v) => `${v}y`} />
            <StatRow label="Final Health" valueA={pinnedLives[0].finalHealth} valueB={pinnedLives[1].finalHealth} fmt={(v) => `${v}/100`} />
            <StatRow label="Final Happiness" valueA={pinnedLives[0].finalHappy} valueB={pinnedLives[1].finalHappy} fmt={(v) => `${v}/100`} />
            <StatRow label="Life Events" valueA={pinnedLives[0].eventCount} valueB={pinnedLives[1].eventCount} fmt={(v) => v} />
          </div>

          {/* Net worth overlay chart */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Net Worth Trajectory
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="age" tick={{ fontSize: 11 }} unit="y" stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={money} stroke="hsl(var(--muted-foreground))" width={55} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(a) => `Age ${a}`}
                  formatter={(v, name) => {
                    const id = parseInt(name.replace('life', ''));
                    return [money(v), `Path #${id + 1}`];
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                {pinnedLives.map((l, i) => (
                  <Line key={l.id} type="monotone" dataKey={`life${l.id}`} stroke={PIN_COLORS[i]} strokeWidth={2.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Milestone variations */}
          {milestoneVariations.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Milestone Variations — where the paths diverge
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {milestoneVariations.slice(0, 30).map((v) => (
                  <div key={v.age} className="grid grid-cols-3 gap-2 text-xs py-1.5 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground font-mono">age {v.age}</span>
                    <div className="text-right">
                      {v.pathA.length > 0 ? v.pathA.map((e, i) => <p key={i} style={{ color: PIN_COLORS[0] }} className="text-[11px] leading-tight">{e}</p>) : <span className="text-muted-foreground/40 text-[11px]">—</span>}
                    </div>
                    <div className="text-right">
                      {v.pathB.length > 0 ? v.pathB.map((e, i) => <p key={i} style={{ color: PIN_COLORS[1] }} className="text-[11px] leading-tight">{e}</p>) : <span className="text-muted-foreground/40 text-[11px]">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {pinnedLives.length < 2 && (
        <div className="text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-lg">
          {pins.length === 0 ? 'Pin two life paths from the grid above to compare them side-by-side.' : `Pin ${2 - pins.length} more path${2 - pins.length === 1 ? '' : 's'} to compare.`}
        </div>
      )}
    </div>
  );
}