import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, Wallet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export default function RevenueTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('shadowRevenueCheck', {});
      const d = res.data || res;
      if (d.error) { setError(d.error); setData(null); }
      else { setData(d); setError(null); }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Revenue Verification
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Stripe-verified monetization status for launched systems.</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="rounded-full">
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      {error && <Card className="p-3 border-rose-500/30 bg-rose-500/5"><p className="text-xs text-rose-600">{error}</p></Card>}

      {data && (
        <>
          {/* Balance + summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3">
              <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                <Wallet className="w-3.5 h-3.5" />
                <p className="text-[10px] uppercase tracking-wider">Available</p>
              </div>
              <p className="text-lg font-bold">{money(data.balance?.available?.[0]?.amount || 0)}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <p className="text-[10px] uppercase tracking-wider">Pending</p>
              </div>
              <p className="text-lg font-bold">{money(data.balance?.pending?.[0]?.amount || 0)}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <p className="text-[10px] uppercase tracking-wider">Total Revenue</p>
              </div>
              <p className="text-lg font-bold">{money(data.total_revenue_usd)}</p>
            </Card>
          </div>

          {/* Project revenue breakdown */}
          {data.projects?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Per-Project Revenue</p>
              {data.projects.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.business_name || p.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.status === 'generating_revenue' ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Generating
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/5">
                          <AlertCircle className="w-2.5 h-2.5 mr-1" /> No Revenue Yet
                        </Badge>
                      )}
                      {p.transaction_count > 0 && <span className="text-xs text-muted-foreground">{p.transaction_count} txns</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-bold', p.revenue_usd > 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                      {money(p.revenue_usd)}
                    </p>
                    {p.last_payment && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(p.last_payment).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unmatched revenue */}
          {data.unmatched_count > 0 && (
            <Card className="p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                {data.unmatched_count} unmatched transaction{data.unmatched_count > 1 ? 's' : ''} totaling {money(data.unmatched_revenue_usd)} — not linked to a specific project.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}