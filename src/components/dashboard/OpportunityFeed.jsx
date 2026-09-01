import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RefreshCw, Radar } from 'lucide-react';
import OpportunityRow from './OpportunityRow';

export default function OpportunityFeed() {
  const [opps, setOpps] = useState(null);
  const [q, setQ] = useState('');
  const [sweeping, setSweeping] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const list = await base44.entities.Opportunity.list('-score', 100);
    setOpps(list);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Opportunity.subscribe(() => load());
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!opps) return [];
    const s = q.toLowerCase();
    return opps.filter((o) => {
      const matchesQ = !s || [o.title, o.description, o.industry, o.source, ...(o.keywords || [])].join(' ').toLowerCase().includes(s);
      const matchesFilter = filter === 'all' ||
        (filter === 'new' && o.status === 'new') ||
        (filter === 'researched' && o.status === 'researched') ||
        (filter === 'responded' && (o.status === 'responded' || o.status === 'followed_up')) ||
        (filter === 'ready' && o.response_status === 'drafted');
      return matchesQ && matchesFilter;
    });
  }, [opps, q, filter]);

  const handleSweep = async () => {
    setSweeping(true);
    try {
      await base44.functions.invoke('opportunitySweep', { max_sources: 5 });
      await load();
    } catch (e) {
      console.error(e);
    }
    setSweeping(false);
  };

  const stats = useMemo(() => {
    if (!opps?.length) return null;
    return {
      total: opps.length,
      new: opps.filter(o => o.status === 'new').length,
      ready: opps.filter(o => o.response_status === 'drafted').length,
      sent: opps.filter(o => o.response_status === 'sent' || o.response_status === 'followed_up').length,
      avgScore: Math.round(opps.reduce((a, o) => a + (o.score || 0), 0) / opps.length),
    };
  }, [opps]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Radar className="w-6 h-6 text-primary" /> Live Opportunity Feed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scraped daily at 3am from Craigslist, Reddit, Hacker News, Google, and more — people actively requesting websites, apps, AI, automation & data services.
          </p>
        </div>
        <Button onClick={handleSweep} disabled={sweeping} variant="outline" size="sm">
          {sweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {sweeping ? 'Sweeping…' : 'Run Sweep Now'}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border p-3"><p className="text-2xl font-semibold">{stats.total}</p><p className="text-xs text-muted-foreground">Total found</p></div>
          <div className="rounded-lg border p-3"><p className="text-2xl font-semibold text-blue-500">{stats.new}</p><p className="text-xs text-muted-foreground">New</p></div>
          <div className="rounded-lg border p-3"><p className="text-2xl font-semibold text-amber-500">{stats.ready}</p><p className="text-xs text-muted-foreground">Ready to send</p></div>
          <div className="rounded-lg border p-3"><p className="text-2xl font-semibold text-emerald-500">{stats.sent}</p><p className="text-xs text-muted-foreground">Responded</p></div>
          <div className="rounded-lg border p-3"><p className="text-2xl font-semibold">{stats.avgScore}</p><p className="text-xs text-muted-foreground">Avg score</p></div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities…" className="pl-9 rounded-full" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'new', 'ready', 'responded'].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
              {f === 'ready' ? 'Ready to send' : f}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {opps === null && <p className="text-sm text-muted-foreground">Loading opportunities…</p>}
        {opps?.length === 0 && <p className="text-sm text-muted-foreground">No opportunities yet — the daily sweep runs at 3am, or click "Run Sweep Now" above.</p>}
        {filtered.length === 0 && opps?.length > 0 && <p className="text-sm text-muted-foreground">No matches for your filter.</p>}
        {filtered.map((opp) => (
          <OpportunityRow key={opp.id} opp={opp} onRefresh={load} />
        ))}
      </div>
    </div>
  );
}