import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target, Wallet } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

const money = (n) => '$' + Math.round(n || 0).toLocaleString();

export default function PerformanceChart() {
  const [trades, setTrades] = useState(null);
  const [portfolios, setPortfolios] = useState(null);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 100).then(setTrades).catch(() => setTrades([]));
    base44.entities.Portfolio.list('-created_date', 100).then(setPortfolios).catch(() => setPortfolios([]));
  }, []);

  const accData = useMemo(() => {
    if (!trades) return [];
    return [...trades].reverse().map((t, i) => ({
      idx: i + 1,
      label: `D${t.day ?? i + 1}`,
      confidence: t.confidence ?? 0,
      won: t.status === 'resolved_won',
      asset: t.asset
    }));
  }, [trades]);

  const valData = useMemo(() => {
    if (!portfolios) return [];
    return [...portfolios].reverse().map((p, i) => ({
      idx: i + 1,
      label: `D${p.day ?? i + 1}`,
      value: p.total_value ?? 0
    }));
  }, [portfolios]);

  const resolved = trades?.filter((t) => t.status?.startsWith('resolved_')) || [];
  const wins = resolved.filter((t) => t.status === 'resolved_won').length;
  const winRate = resolved.length ? Math.round((wins / resolved.length) * 100) : 0;
  const avgConf = resolved.length ? Math.round(resolved.reduce((s, t) => s + (t.confidence || 0), 0) / resolved.length) : 0;
  const hittingTarget = avgConf >= 90;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" /> Performance Trend
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Avg confidence <span className={`font-medium ${hittingTarget ? 'text-emerald-600' : 'text-foreground'}`}>{avgConf}%</span></span>
          <span className="text-muted-foreground">Win rate <span className="font-medium text-foreground">{winRate}%</span></span>
          <span className="flex items-center gap-1 text-muted-foreground"><Target className="w-3 h-3" /> 90% target</span>
        </div>
      </div>

      {accData.length === 0 && valData.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground text-sm">No trades yet — run a cycle to start the trend.</p>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Total portfolio value</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => '$' + Math.round(v / 1000000) + 'M'} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                    formatter={(v) => [money(v), 'Portfolio']}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#valGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Target className="w-3 h-3" /> Confidence per trade</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                    formatter={(v) => [`${v}%`, 'Confidence']}
                    labelFormatter={(_, p) => {
                      const item = p?.[0]?.payload;
                      return item ? `${item.label} · ${item.asset} · ${item.won ? 'WIN' : 'open/loss'}` : '';
                    }}
                  />
                  <ReferenceLine y={90} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="confidence" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--chart-1))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}