import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import IntelRow from '@/components/intel/IntelRow';
import IntelCharts from '@/components/intel/IntelCharts';

export default function Intel() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('All');
  const [busy, setBusy] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeCategory, setScrapeCategory] = useState('');
  const [scraping, setScraping] = useState(false);

  const load = () => base44.entities.IntelFeed.list('-created_date', 200).then(setItems);
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    if (!items) return ['All'];
    return ['All', ...new Set(items.map((i) => i.category))];
  }, [items]);

  const filtered = useMemo(
    () => (filter === 'All' ? (items || []) : (items || []).filter((i) => i.category === filter)),
    [items, filter]
  );

  const byCategory = useMemo(() => {
    if (!items) return [];
    const map = {};
    items.forEach((i) => { map[i.category] = (map[i.category] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [items]);

  const avgImpact = useMemo(
    () => (items?.length ? Math.round(items.reduce((a, i) => a + (i.impact_score || 0), 0) / items.length) : 0),
    [items]
  );

  const runIngest = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke('ingestIntel', {});
      await load();
    } catch {
      // surface nothing; user can retry
    } finally {
      setBusy(false);
    }
  };

  const scrapeDeep = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      await base44.functions.invoke('cloudBrowserIntel', {
        url: scrapeUrl.trim(),
        category: scrapeCategory.trim() || 'Cloud Browser Scrape'
      });
      await load();
      setScrapeUrl('');
      setScrapeCategory('');
    } catch {
      // ignore
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Cloud Browser · Daily Ingestion</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Worldwide intelligence, correlated.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Live sweep across markets, crypto, AI, policy, weather, and the threads where people build — scored for leverage and mapped to what it moves.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={runIngest} disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {busy ? 'Ingesting…' : 'Run ingestion now'}
        </Button>
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {items?.length || 0} signals · avg impact {avgImpact}
        </span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Cloud browser · deep scrape</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="https://source-url.com"
            className="flex-1"
          />
          <Input
            value={scrapeCategory}
            onChange={(e) => setScrapeCategory(e.target.value)}
            placeholder="Category (optional)"
            className="sm:w-48"
          />
          <Button onClick={scrapeDeep} disabled={scraping || !scrapeUrl.trim()} className="rounded-full sm:w-auto">
            {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {scraping ? 'Scraping…' : 'Scrape'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Spins up a real browser session on your cloud browser, extracts the page, and structures it into signals here.</p>
      </div>

      <IntelCharts data={byCategory} />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest border transition-colors ${
              filter === c ? 'bg-foreground text-background border-foreground' : 'border-border/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items === null && <p className="text-sm text-muted-foreground">Connecting to the ingestion core…</p>}
        {filtered.length === 0 && items && <p className="text-sm text-muted-foreground">No signals in this channel yet.</p>}
        {filtered.map((it) => <IntelRow key={it.id} item={it} />)}
      </div>
    </div>
  );
}