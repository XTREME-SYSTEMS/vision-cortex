import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from 'recharts';

const money = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`);

export default function TrajectoryChart({ lives }) {
  if (!lives?.length) return null;
  // build p10/p50/p90 envelope per age
  const maxAge = 100;
  const envelope = [];
  for (let age = 0; age <= maxAge; age++) {
    const vals = lives.map((l) => l.yearly[age]?.netWorth).filter((v) => v !== undefined && v !== null);
    if (!vals.length) continue;
    vals.sort((a, b) => a - b);
    const at = (q) => vals[Math.floor(q * (vals.length - 1))];
    envelope.push({ age, p10: at(0.1), p50: at(0.5), p90: at(0.9) });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">Net-worth trajectories — 50 lives</h3>
      <p className="text-xs text-muted-foreground mb-3">Each faint line is one life; the band shows p10–p90, bold line is the median.</p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={envelope} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="age" tick={{ fontSize: 11 }} unit="y" stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={money} stroke="hsl(var(--muted-foreground))" width={50} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(a) => `Age ${a}`}
            formatter={(v) => money(v)}
          />
          <Area type="monotone" dataKey="p90" stroke="none" fill="url(#band)" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="hsl(var(--card))" />
          <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}