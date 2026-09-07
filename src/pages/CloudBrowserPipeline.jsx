import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Telescope, Play, Loader2, Link2, Activity, CheckCircle, AlertTriangle, Zap, Globe } from 'lucide-react';

const PRESET_SEEDS = {
  'Real Estate Distress': [
    'https://www.craigslist.org/about/sites',
    'https://www.reddit.com/r/realestateinvesting/',
  ],
  'Business Opportunities': [
    'https://news.ycombinator.com/',
    'https://www.reddit.com/r/Entrepreneur/',
  ],
  'Market Intelligence': [
    'https://www.reuters.com/markets/',
    'https://www.bloomberg.com/markets',
  ],
};

export default function CloudBrowserPipeline() {
  const [urls, setUrls] = useState('');
  const [category, setCategory] = useState('Cloud Browser Pipeline');
  const [extract, setExtract] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [discoverUrl, setDiscoverUrl] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState(null);
  const [status, setStatus] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await base44.functions.invoke('cloudBrowserPipeline', { action: 'status' });
      setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const runBatch = async () => {
    const urlList = urls.split('\n').map((u) => u.trim()).filter(Boolean);
    if (urlList.length === 0) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await base44.functions.invoke('cloudBrowserPipeline', {
        action: 'scrape_batch',
        urls: urlList,
        category,
        extract,
      });
      setResult(r);
      loadStatus();
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setRunning(false);
    }
  };

  const runSingle = async (url) => {
    setRunning(true);
    setResult(null);
    try {
      const r = await base44.functions.invoke('cloudBrowserPipeline', {
        action: 'scrape_single',
        url,
        category,
        extract,
      });
      setResult(r);
      loadStatus();
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setRunning(false);
    }
  };

  const discover = async () => {
    if (!discoverUrl.trim()) return;
    setDiscovering(true);
    setDiscovered(null);
    try {
      const r = await base44.functions.invoke('cloudBrowserPipeline', {
        action: 'discover',
        url: discoverUrl.trim(),
      });
      setDiscovered(r);
    } catch (e) {
      setDiscovered({ error: e.message });
    } finally {
      setDiscovering(false);
    }
  };

  const loadPreset = (presetName) => {
    const seeds = PRESET_SEEDS[presetName];
    if (seeds) {
      setUrls(seeds.join('\n'));
      setCategory(presetName);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Intelligence · Cloud Browser</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Headless scraping pipeline.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Autonomous intelligence ingestion via the stealth cloud browser — anti-detection hardened, parallel batch processing, LLM-extracted intel stored to the feed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Engine" value={status?.ok ? 'Live' : '—'} color="text-emerald-500" />
        <StatCard icon={Telescope} label="Recent Intel" value={status?.recent_intel_count ?? '—'} color="text-sky-500" />
        <StatCard icon={Globe} label="Preset Seeds" value={Object.keys(PRESET_SEEDS).length} color="text-violet-500" />
        <StatCard icon={Zap} label="Max Parallel" value="3" color="text-amber-500" />
      </div>

      {/* Batch scraper */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-medium">Batch Scrape</h3>
        </div>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(PRESET_SEEDS).map((name) => (
            <button
              key={name}
              onClick={() => loadPreset(name)}
              className="px-3 py-1 text-xs rounded-full border border-border/60 hover:bg-muted transition-colors"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Seed URLs (one per line, max 20)</Label>
            <Textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com/page-1&#10;https://example.com/page-2"
              rows={6}
              className="text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={extract} onChange={(e) => setExtract(e.target.checked)} className="rounded" />
              Extract intel via LLM
            </label>
            <Button
              onClick={runBatch}
              disabled={running || !urls.trim()}
              size="sm"
              className="ml-auto"
            >
              {running ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Scraping...</> : <><Play className="w-3.5 h-3.5 mr-1.5" /> Run Batch</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* Link discovery */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-medium">Link Discovery</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Scrape a seed page and extract sub-links for follow-up scraping.</p>
        <div className="flex gap-2">
          <Input
            value={discoverUrl}
            onChange={(e) => setDiscoverUrl(e.target.value)}
            placeholder="https://example.com"
            className="text-sm"
          />
          <Button onClick={discover} disabled={discovering || !discoverUrl.trim()} size="sm" variant="outline">
            {discovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Discover'}
          </Button>
        </div>
        {discovered && (
          <div className="mt-3 space-y-2">
            {discovered.error ? (
              <p className="text-xs text-rose-500">{discovered.error}</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{discovered.discovered_links?.length || 0} links found:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                  {discovered.discovered_links?.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate text-muted-foreground">{link}</span>
                      <button
                        onClick={() => runSingle(link)}
                        disabled={running}
                        className="ml-auto text-[10px] text-emerald-500 hover:underline shrink-0"
                      >
                        Scrape
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            {result.error ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
            <h3 className="text-sm font-medium">Result</h3>
          </div>
          {result.error ? (
            <p className="text-sm text-rose-500">{result.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard icon={Globe} label="URLs" value={result.total_urls || 1} color="text-sky-500" />
                <StatCard icon={CheckCircle} label="Succeeded" value={result.succeeded ?? 1} color="text-emerald-500" />
                <StatCard icon={AlertTriangle} label="Failed" value={result.failed ?? 0} color="text-rose-500" />
                <StatCard icon={Zap} label="Intel Items" value={result.total_intel_extracted ?? result.intel_count ?? 0} color="text-amber-500" />
              </div>
              {result.results && (
                <div className="space-y-1.5">
                  {result.results.map((r, i) => (
                    <div key={i} className={cn('flex items-center gap-2 text-xs p-2 rounded border', r.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : r.status === 'error' ? 'border-rose-500/30 bg-rose-500/5' : 'border-border/40')}>
                      {r.status === 'success' ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                      <span className="truncate flex-1 text-muted-foreground">{r.url}</span>
                      {r.intel_count !== undefined && <Badge variant="outline" className="text-[9px]">{r.intel_count} intel</Badge>}
                      {r.latency_ms !== undefined && <span className="text-[10px] text-muted-foreground">{(r.latency_ms / 1000).toFixed(1)}s</span>}
                      {r.error && <span className="text-[10px] text-rose-500 truncate max-w-32">{r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
              {result.items && result.items.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium">Extracted Intel:</p>
                  {result.items.map((item, i) => (
                    <div key={i} className="p-2.5 rounded border border-border/40 bg-muted/30">
                      <p className="text-xs font-medium">{item.headline}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
                        {item.impact_score > 0 && <span className="text-[10px] text-amber-500">Impact: {item.impact_score}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Recent intel from pipeline */}
      {status?.recent_intel && status.recent_intel.length > 0 && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Telescope className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-medium">Recent Pipeline Intel</h3>
          </div>
          <div className="space-y-2">
            {status.recent_intel.map((intel, i) => (
              <div key={i} className="p-2.5 rounded border border-border/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium flex-1 truncate">{intel.headline}</p>
                  {intel.impact_score > 0 && <Badge variant="outline" className="text-[9px] text-amber-500">{intel.impact_score}</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{intel.url}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className={cn('text-lg font-bold', color)}>{value}</span>
    </div>
  );
}