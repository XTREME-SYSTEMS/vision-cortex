import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

export default function PerformanceChart() {
  const [trades, setTrades] = useState(null);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 100).then(setTrades).catch(() => setTrades([]));
  }, []);

  const data = useMemo(() => {
    if (!trades) return [];
    return [...trades].reverse().map((t, i) => ({
      idx: i + 1,
      label: `D${t.day ?? i + 1}`,
      confidence: t.confidence ?? 0,
      won: t.status === 'resolved_won',
      asset: t.asset
    }));
  }, [trades]);

  const resolved = trades?.filter((t) => t.status?.startsWith('resolved_')) || [];
  const wins = resolved.filter((t) => t.status === 'resolved_won').length;
  const winRate = resolved.length ? Math.round((wins / resolved.length) * 100) : 0;
  const avgConf = resolved.length ? Math.round(resolved.reduce((s, t) => s + (t.confidence || 0), 0) / resolved.length) : 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" /> Accuracy Trend
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Avg confidence <span className="font-medium text-foreground">{avgConf}%</span></span>
          <span className="text-muted-foreground">Win rate <span className="font-medium text-foreground">{winRate}%</span></span>
          <span className="flex items-center gap-1 text-muted-foreground"><Target className="w-3 h-3" /> 90% target</span>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground text-sm">No trades yet — run a cycle to start the trend.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                formatter={(v) => [`${v}%`, 'Confidence']}
                labelFormatter={(_, p) => {
                  const item = p?.[0]?.payload;
                  return item ? `${item.label} · ${item.asset}` : '';
                }}
              />
              <ReferenceLine y={90} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="confidence" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--chart-1))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}