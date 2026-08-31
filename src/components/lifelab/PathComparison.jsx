import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitCompare, Trophy, Skull, Heart, Smile, DollarSign, X } from 'lucide-react';

const money = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${a}`;
};

const PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const sortOptions = [
  { key: 'netWorth', label: 'Net Worth', icon: DollarSign },
  { key: 'longevity', label: 'Longevity', icon: Skull },
  { key: 'health', label: 'Health', icon: Heart },
  { key: 'happiness', label: 'Happiness', icon: Smile },
];

export default function PathComparison({ lives }) {
  const [selected, setSelected] = useState([]);
  const [sortBy, setSortBy] = useState('netWorth');
  const [metric, setMetric] = useState('netWorth');

  const ranked = useMemo(() => {
    if (!lives?.length) return [];
    const getVal = (l, key) => {
      if (key === 'netWorth') return l.finalNetWorth;
      if (key === 'longevity') return l.diedAtAge;
      if (key === 'health') return l.finalHealth;
      if (key === 'happiness') return l.finalHappy;
      return 0;
    };
    return [...lives].sort((a, b) => getVal(b, sortBy) - getVal(a, sortBy));
  }, [lives, sortBy]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 10 ? [...prev, id] : prev
    );
  };

  const selectedLives = useMemo(
    () => (lives || []).filter((l) => selected.includes(l.id)),
    [lives, selected]
  );

  // Build comparative chart data: age -> { [lifeId]: metricValue }
  const chartData = useMemo(() => {
    if (!selectedLives.length) return [];
    const maxAge = 100;
    const data = [];
    for (let age = 0; age <= maxAge; age++) {
      const row = { age };
      let hasAny = false;
      selectedLives.forEach((l) => {
        const y = l.yearly?.[age];
        if (y) {
          const val = metric === 'netWorth' ? y.netWorth : metric === 'health' ? y.health : metric === 'happiness' ? y.happy : y.netWorth;
          row[`life${l.id}`] = val;
          hasAny = true;
        }
      });
      if (hasAny) data.push(row);
    }
    return data;
  }, [selectedLives, metric]);

  const quickSelect = (type) => {
    if (type === 'top5') setSelected(ranked.slice(0, 5).map((l) => l.id));
    else if (type === 'bottom5') setSelected(ranked.slice(-5).map((l) => l.id));
    else if (type === 'clear') setSelected([]);
  };

  if (!lives?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <GitCompare className="w-4 h-4" /> Comparative Path Explorer
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click up to 10 lives to overlay their timelines. Sort the grid to find best/worst outcomes.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {sortOptions.map((o) => (
            <Button
              key={o.key}
              size="sm"
              variant={sortBy === o.key ? 'default' : 'outline'}
              onClick={() => setSortBy(o.key)}
              className="h-7 text-xs"
            >
              <o.icon className="w-3 h-3" /> {o.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => quickSelect('top5')} className="h-7 text-xs">
          <Trophy className="w-3 h-3" /> Top 5
        </Button>
        <Button size="sm" variant="ghost" onClick={() => quickSelect('bottom5')} className="h-7 text-xs">
          Bottom 5
        </Button>
        <Button size="sm" variant="ghost" onClick={() => quickSelect('clear')} className="h-7 text-xs">
          <X className="w-3 h-3" /> Clear
        </Button>
        <span className="text-xs text-muted-foreground ml-1">{selected.length}/10 selected</span>
      </div>

      {/* Life grid — sorted by chosen metric */}
      <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
        {ranked.map((l, rank) => {
          const isSel = selected.includes(l.id);
          const colorIdx = selected.indexOf(l.id);
          return (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className={`aspect-square rounded-md border-2 flex flex-col items-center justify-center transition-all relative ${
                isSel ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/40'
              }`}
              style={isSel ? { borderColor: PALETTE[colorIdx % PALETTE.length] } : {}}
              title={`Life #${l.id + 1} · Rank #${rank + 1} by ${sortBy} · died ${l.diedAtAge} · ${money(l.finalNetWorth)}`}
            >
              {isSel && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] grid place-items-center text-white font-bold"
                  style={{ background: PALETTE[colorIdx % PALETTE.length] }}
                >
                  {colorIdx + 1}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground">#{l.id + 1}</span>
              <span className={`text-[10px] font-semibold ${l.finalNetWorth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {money(l.finalNetWorth)}
              </span>
              <span className="text-[8px] text-muted-foreground">d{l.diedAtAge}</span>
            </button>
          );
        })}
      </div>

      {/* Comparative chart */}
      {selectedLives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Metric:</span>
            {['netWorth', 'health', 'happiness'].map((m) => (
              <Button
                key={m}
                size="sm"
                variant={metric === m ? 'default' : 'outline'}
                onClick={() => setMetric(m)}
                className="h-7 text-xs capitalize"
              >
                {m === 'netWorth' ? 'Net Worth' : m}
              </Button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="age" tick={{ fontSize: 11 }} unit="y" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={metric === 'netWorth' ? money : (v) => v}
                stroke="hsl(var(--muted-foreground))"
                width={55}
              />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(a) => `Age ${a}`}
                formatter={(v, name) => {
                  const id = parseInt(name.replace('life', ''));
                  const life = lives.find((l) => l.id === id);
                  return [metric === 'netWorth' ? money(v) : v, `Life #${id + 1}`];
                }}
              />
              {metric === 'netWorth' && <ReferenceLine y={0} stroke="hsl(var(--border))" />}
              {selectedLives.map((l, i) => (
                <Line
                  key={l.id}
                  type="monotone"
                  dataKey={`life${l.id}`}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Life</th>
                  <th className="text-right py-2 px-2">Net Worth</th>
                  <th className="text-right py-2 px-2">Died At</th>
                  <th className="text-right py-2 px-2">Health</th>
                  <th className="text-right py-2 px-2">Happiness</th>
                  <th className="text-right py-2 px-2">Events</th>
                </tr>
              </thead>
              <tbody>
                {selectedLives.map((l, i) => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="py-2 px-2">
                      <span
                        className="inline-block w-5 h-5 rounded-full text-white text-[9px] grid place-items-center font-bold"
                        style={{ background: PALETTE[i % PALETTE.length] }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-medium">Life #{l.id + 1}</td>
                    <td className={`py-2 px-2 text-right font-semibold ${l.finalNetWorth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {money(l.finalNetWorth)}
                    </td>
                    <td className="py-2 px-2 text-right">{l.diedAtAge}</td>
                    <td className="py-2 px-2 text-right">{l.finalHealth}</td>
                    <td className="py-2 px-2 text-right">{l.finalHappy}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{l.eventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key life events for the top-selected path */}
          {selectedLives.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Life events — Life #{selectedLives[0].id + 1} (first selected)
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedLives[0].yearly
                  .flatMap((y) => y.events.map((e) => ({ age: y.age, e })))
                  .map((x, i) => (
                    <div key={i} className="text-xs flex gap-2">
                      <span className="text-muted-foreground w-12 shrink-0">age {x.age}</span>
                      <span>{x.e}</span>
                    </div>
                  ))}
                {selectedLives[0].yearly.flatMap((y) => y.events).length === 0 && (
                  <p className="text-xs text-muted-foreground">No notable events — a quiet life.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedLives.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-lg">
          Select lives from the grid above to compare their timelines side by side.
        </div>
      )}
    </div>
  );
}