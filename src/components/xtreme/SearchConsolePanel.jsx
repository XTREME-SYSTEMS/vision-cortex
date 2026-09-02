import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Search, TrendingUp, MousePointerClick, Eye, Map, RefreshCw, AlertCircle } from 'lucide-react';

const SITE_URL = 'thevisioncortex.com';

export default function SearchConsolePanel() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const rows = await base44.entities.SearchConsoleMetrics.filter(
        { site_url: SITE_URL },
        '-report_date',
        1
      );
      setMetrics(rows?.[0] || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await base44.functions.invoke('searchConsoleSync', { site_url: SITE_URL, period_days: 7 });
      await load();
    } catch (e) {
      setError(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading Search Console data…</div>;
  }

  const hasData = metrics && (metrics.clicks > 0 || metrics.impressions > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4" />
        <h2 className="font-display text-xl tracking-tight">Google Search Console</h2>
        <Badge variant="outline" className="text-[9px] ml-1">{SITE_URL}</Badge>
        <Button onClick={sync} disabled={syncing} variant="outline" size="sm" className="rounded-full ml-auto h-7">
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </Button>
      </div>

      {error && (
        <Card className="p-3 border-destructive/30 bg-destructive/5">
          <p className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>
        </Card>
      )}

      {/* Aggregate metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 text-muted-foreground"><MousePointerClick className="w-3 h-3" /><p className="text-[10px] uppercase tracking-widest">Clicks</p></div>
          <p className="font-display text-2xl mt-1">{metrics?.clicks ?? 0}</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 text-muted-foreground"><Eye className="w-3 h-3" /><p className="text-[10px] uppercase tracking-widest">Impressions</p></div>
          <p className="font-display text-2xl mt-1">{metrics?.impressions ?? 0}</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="w-3 h-3" /><p className="text-[10px] uppercase tracking-widest">CTR</p></div>
          <p className="font-display text-2xl mt-1">{metrics ? (metrics.ctr * 100).toFixed(1) : '0'}<span className="text-sm text-muted-foreground">%</span></p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 text-muted-foreground"><Search className="w-3 h-3" /><p className="text-[10px] uppercase tracking-widest">Avg Position</p></div>
          <p className="font-display text-2xl mt-1">{metrics ? metrics.position.toFixed(1) : '0'}</p>
        </Card>
      </div>

      {!hasData && (
        <Card className="p-4 border-border/60 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            No search data yet for {SITE_URL}. This is expected for a newly verified site — Google Search Console data has a ~2-day lag. The daily automated sync will populate metrics as impressions accumulate.
          </p>
        </Card>
      )}

      {metrics?.synced_at && (
        <p className="text-[10px] text-muted-foreground">
          Last sync: {new Date(metrics.synced_at).toLocaleString()} · Report period: {metrics.report_date} ({metrics.period_days}d)
        </p>
      )}

      {/* Top queries */}
      {metrics?.top_queries?.length > 0 && (
        <Card className="p-4 border-border/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Top Queries</p>
          <div className="space-y-1.5">
            {metrics.top_queries.slice(0, 10).map((q, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                <span className="flex-1 truncate">{q.query}</span>
                <span className="font-mono text-xs text-muted-foreground">{q.clicks} clicks</span>
                <span className="font-mono text-xs text-muted-foreground w-16 text-right">#{q.position.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top pages */}
      {metrics?.top_pages?.length > 0 && (
        <Card className="p-4 border-border/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Top Pages</p>
          <div className="space-y-1.5">
            {metrics.top_pages.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-sky-500 hover:underline">{p.url.replace(/^https?:\/\//, '')}</a>
                <span className="font-mono text-xs text-muted-foreground">{p.clicks} clicks</span>
                <span className="font-mono text-xs text-muted-foreground w-16 text-right">{p.impressions} imp</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sitemaps */}
      {metrics?.sitemaps?.length > 0 && (
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 mb-2"><Map className="w-3 h-3 text-muted-foreground" /><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sitemaps</p></div>
          <div className="space-y-2">
            {metrics.sitemaps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate font-mono text-xs">{s.path}</span>
                <Badge variant="outline" className={cn('text-[9px]', s.errors > 0 ? 'border-rose-500/40 text-rose-500' : 'border-emerald-500/40 text-emerald-500')}>
                  {s.indexed}/{s.submitted}
                </Badge>
                {s.errors > 0 && <Badge variant="destructive" className="text-[9px]">{s.errors} err</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}