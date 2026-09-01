import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';

export default function ProfitabilityChart() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [queue, ideas] = await Promise.all([
        base44.entities.BuildQueue.filter({ source: 'shadow_build_strategy' }, '-priority', 50).catch(() => []),
        base44.entities.Idea.list('-score', 100).catch(() => []),
      ]);
      const ideaMap = {};
      for (const idea of ideas) ideaMap[idea.id] = idea;

      const chartData = queue
        .map((q) => {
          const idea = q.idea_id ? ideaMap[q.idea_id] : null;
          return {
            name: (q.business_name || q.title || 'Untitled').substring(0, 18),
            profit: idea?.est_monthly_profit_usd || q.predicted_revenue_monthly || 0,
            stage: q.stage,
          };
        })
        .filter((d) => d.profit > 0)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);

      setData(chartData);
    };
    load();
  }, []);

  if (!data) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
        <BarChart3 className="w-4 h-4" /> Top Queued Projects — Estimated Monthly Profit
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No queued projects with profit estimates yet. Run the Path to Money pipeline to generate strategies.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} interval={0} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v) => [`$${v.toLocaleString()}/mo`, 'Est. Profit']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.stage === 'launched' ? '#10b981' : entry.stage === 'building' ? '#f59e0b' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Queued</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Building</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Launched</span>
      </div>
    </Card>
  );
}