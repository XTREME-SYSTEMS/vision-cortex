import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SCENARIO_COLOR = {
  conservative: '#64748b',
  base: '#0ea5e9',
  aggressive: '#22c55e',
};

// Renders the 3 simulated outcomes: scenario cards + a cumulative-profit
// timeline chart comparing all three over 12 months.
export default function OutcomeView({ outcomes }) {
  if (!outcomes?.length) return null;
  const chartData = (outcomes[0]?.timeline || []).map((_, m) => {
    const row = { month: `M${m + 1}` };
    outcomes.forEach((o) => {
      const t = o.timeline?.[m];
      row[o.scenario] = t ? Math.round(t.cumulative || 0) : null;
    });
    return row;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {outcomes.map((o) => (
          <div key={o.scenario} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium capitalize">{o.scenario}</p>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${SCENARIO_COLOR[o.scenario]}20`, color: SCENARIO_COLOR[o.scenario] }}
              >
                {o.probability}% likely
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{o.summary}</p>
            {o.assumptions?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {o.assumptions.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-foreground/30">•</span> {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Cumulative profit — 12 months</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                formatter={(v) => `$${Number(v).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {outcomes.map((o) => (
                <Line
                  key={o.scenario}
                  type="monotone"
                  dataKey={o.scenario}
                  stroke={SCENARIO_COLOR[o.scenario]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}