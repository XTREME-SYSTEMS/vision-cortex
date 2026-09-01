import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, RefreshCw, DollarSign, Target, Trophy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmtUsd(n) {
  if (!n || n === 0) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function PerformanceLog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('shadowPerformanceLog', {});
      setData(res.data || res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  const s = data.summary || {};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> Performance Log — Predicted vs Actual
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Tracks every launched project's success rate and revenue</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="rounded-full shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Projects', value: s.total_projects || 0, icon: Target, color: 'text-blue-600' },
          { label: 'Launched', value: s.launched || 0, icon: TrendingUp, color: 'text-amber-600' },
          { label: 'Monetized', value: s.monetized || 0, icon: DollarSign, color: 'text-purple-600' },
          { label: 'Revenue Generating', value: s.revenue_generating || 0, icon: Trophy, color: 'text-emerald-600' },
          { label: 'Success Rate', value: `${s.success_rate || 0}%`, icon: TrendingUp, color: s.success_rate >= 50 ? 'text-emerald-600' : 'text-muted-foreground' },
        ].map((stat) => (
          <Card key={stat.label} className="p-2.5 text-center">
            <stat.icon className={cn('w-3.5 h-3.5 mx-auto mb-1', stat.color)} />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue Summary */}
      <Card className={cn('p-4', (s.total_actual || 0) > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : '')}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Actual Revenue</p>
            <p className="text-2xl font-bold text-emerald-600">{fmtUsd(s.total_actual || 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Predicted (Monthly)</p>
            <p className="text-2xl font-bold text-muted-foreground">{fmtUsd(s.total_predicted_monthly || 0)}</p>
          </div>
        </div>
      </Card>

      {/* Project Table */}
      <Card className="p-3">
        {(!data.projects || data.projects.length === 0) ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No projects yet. Run the Path to Money pipeline to start tracking performance.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.projects.map((p) => {
              const hitTarget = p.actual_revenue > 0 && p.predicted_monthly > 0 && p.actual_revenue >= p.predicted_monthly;
              const hasRevenue = p.actual_revenue > 0;
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card hover:border-border transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{p.stage}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-muted-foreground">
                        Predicted: <span className="font-medium text-foreground">{fmtUsd(p.predicted_monthly)}/mo</span>
                      </span>
                      <span className={hasRevenue ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        Actual: <span className={hasRevenue ? 'text-emerald-600' : ''}>{fmtUsd(p.actual_revenue)}</span>
                      </span>
                    </div>
                  </div>
                  {p.stripe_payment_link && (
                    <a
                      href={p.stripe_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5">
                        <ExternalLink className="w-3 h-3" /> Pay
                      </Button>
                    </a>
                  )}
                  {hasRevenue ? (
                    hitTarget ? <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" /> : <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : p.has_payment_link ? (
                    <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}