import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, TrendingUp, TrendingDown, Minus, Flame, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const momentumIcon = {
  rising: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
  peak: <Flame className="w-3.5 h-3.5 text-amber-600" />,
  cooling: <TrendingDown className="w-3.5 h-3.5 text-blue-600" />,
  dormant: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
};

const sentimentColor = {
  euphoric: 'text-emerald-600 bg-emerald-500/10',
  positive: 'text-emerald-600 bg-emerald-500/5',
  neutral: 'text-muted-foreground bg-muted',
  negative: 'text-rose-600 bg-rose-500/10',
  fearful: 'text-rose-600 bg-rose-500/5',
};

const windowColor = {
  wide_open: 'text-emerald-600',
  open: 'text-emerald-600',
  early: 'text-blue-600',
  closing: 'text-amber-600',
};

function ScoreBar({ score, max = 10, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${(score / max) * 100}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground shrink-0">{score}/{max}</span>
    </div>
  );
}

function SentimentCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  // Parse from summary sections
  const sections = {};
  (item.summary || '').split('\n\n').forEach((part) => {
    const m = part.match(/^\[(.+?)\]\s*(.*)/s);
    if (m) sections[m[1]] = m[2].trim();
  });

  const excitement = item.impact_score || 0;
  const momentum = sections.MOMENTUM || 'dormant';
  const sentiment = sections.SENTIMENT || 'neutral';
  const viral = parseInt(sections['VIRAL POTENTIAL'] || '0');
  const density = parseInt(sections['COMPETITOR DENSITY'] || '0');
  const window = sections['OPPORTUNITY WINDOW'] || 'unknown';
  const buzzTerms = (sections['BUZZ TERMS'] || '').split(', ').filter(Boolean);
  const platforms = (sections.PLATFORMS || '').split(', ').filter(Boolean);

  return (
    <div className="border-l-4 border-border rounded-lg bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-3 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          {momentumIcon[momentum]}
          <span className="text-sm font-medium">{item.category}</span>
          <Badge variant="outline" className={cn('text-[10px]', sentimentColor[sentiment])}>{sentiment}</Badge>
          <Badge variant="outline" className={cn('text-[10px]', windowColor[window])}>{window.replace(/_/g, ' ')}</Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Excitement</p>
            <ScoreBar score={excitement} color="bg-amber-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Viral Potential</p>
            <ScoreBar score={viral} color="bg-rose-500" />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Competitor Density</p>
              <ScoreBar score={density} color="bg-blue-500" />
            </div>
          </div>
          {buzzTerms.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Buzz Terms</p>
              <div className="flex flex-wrap gap-1">
                {buzzTerms.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            </div>
          )}
          {platforms.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Top Platforms</p>
              <div className="flex flex-wrap gap-1">
                {platforms.map((p, i) => <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>)}
              </div>
            </div>
          )}
          {sections.SUMMARY && <p className="text-sm text-foreground/90 leading-relaxed">{sections.SUMMARY}</p>}
          {item.signals?.length > 0 && (
            <div className="space-y-1">
              {item.signals.slice(0, 3).map((s, i) => (
                <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" /> {s}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SentimentTracker() {
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    const data = await base44.entities.IntelFeed.filter({ source: 'Shadow Sentiment' }, '-created_date', 20).catch(() => []);
    setItems(data);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.IntelFeed.subscribe((event) => {
      if (event.type === 'create' && event.data?.source === 'Shadow Sentiment') {
        setItems((prev) => [event.data, ...(prev || [])].slice(0, 20));
      }
    });
    return unsub;
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('shadowSentiment', {});
      const data = res.data || res;
      if (data.error) setError(data.error);
      else { setPulse(data.market_pulse); await load(); }
    } catch (e) { setError(e.message); }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Sentiment Tracker
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Social media + news market excitement per niche.</p>
        </div>
        <Button size="sm" onClick={run} disabled={running} className="rounded-full">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          Scan Sentiment
        </Button>
      </div>

      {pulse && (
        <Card className="p-3 bg-blue-500/5 border-blue-500/20">
          <p className="text-xs text-blue-700 dark:text-blue-400">{pulse}</p>
        </Card>
      )}

      {error && <Card className="p-3 border-rose-500/30 bg-rose-500/5"><p className="text-xs text-rose-600">{error}</p></Card>}

      {items?.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => <SentimentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}