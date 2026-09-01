import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crosshair, ChevronDown, ChevronRight, ExternalLink, AlertTriangle, Sparkles, DollarSign, MapPin, Cpu, Wrench, Zap, ShieldAlert, Rocket, Target, Users, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryColor = {
  billionaire_deal: 'bg-amber-500/10 text-amber-600',
  algo_trading: 'bg-blue-500/10 text-blue-600',
  data_market: 'bg-purple-500/10 text-purple-600',
  hidden_program: 'bg-rose-500/10 text-rose-600',
  deal_timing: 'bg-orange-500/10 text-orange-600',
  ai_wealth: 'bg-emerald-500/10 text-emerald-600',
  digital_expert: 'bg-sky-500/10 text-sky-600',
  wealthy_secret: 'bg-indigo-500/10 text-indigo-600',
  emerging_system: 'bg-teal-500/10 text-teal-600',
  shadow_money_hunt: 'bg-muted text-muted-foreground',
};

// Parse the labeled summary into structured sections
function parseSummary(summary) {
  if (!summary) return {};
  const sections = {};
  const labelMap = {
    '[METHOD]': 'method',
    '[LOCATION]': 'location',
    '[WEALTH POTENTIAL]': 'wealth',
    '[ALGORITHM/DATA]': 'algorithm',
    '[BUILD SYSTEM VALUE]': 'buildValue',
    '[TRICKS]': 'tricks',
    '[ALGORITHMS]': 'algorithms',
    '[OBTAIN ASAP]': 'obtainAsap',
    '[FAILURE POINTS]': 'failurePoints',
    '[COMMON PITFALLS]': 'pitfalls',
    '[COMPETITOR WEAKNESSES]': 'competitorWeaknesses',
  };
  const parts = summary.split(/\n\n/);
  for (const part of parts) {
    for (const [label, key] of Object.entries(labelMap)) {
      if (part.startsWith(label)) {
        sections[key] = part.slice(label.length).trim();
      }
    }
  }
  // If no labels found, treat the whole thing as method (legacy entries)
  if (Object.keys(sections).length === 0 && summary.trim()) {
    sections.method = summary.trim();
  }
  return sections;
}

function DetailSection({ icon: Icon, label, value, tone }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className={cn('text-[10px] uppercase tracking-wider flex items-center gap-1', tone || 'text-muted-foreground')}>
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function IntelCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const sections = parseSummary(item.summary);
  const avoid = item.correlations?.[0];

  return (
    <div className="border-l-4 border-border rounded-lg bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{item.headline}</div>
            {sections.method && !expanded && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sections.method}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.category && <Badge variant="outline" className={cn('text-[10px]', categoryColor[item.category] || categoryColor.shadow_money_hunt)}>{item.category.replace(/_/g, ' ')}</Badge>}
            {item.impact_score != null && <Badge variant="outline" className="text-[10px]">{item.impact_score}/10</Badge>}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pl-7 space-y-4">
            <DetailSection icon={Crosshair} label="Method" value={sections.method} />
            <DetailSection icon={MapPin} label="Location" value={sections.location} tone="text-sky-600" />
            <DetailSection icon={DollarSign} label="Wealth Potential" value={sections.wealth} tone="text-emerald-600" />
            <DetailSection icon={Cpu} label="Algorithm / Data" value={sections.algorithm} tone="text-purple-600" />
            <DetailSection icon={Sparkles} label="Build System Value" value={sections.buildValue} tone="text-indigo-600" />
            <DetailSection icon={Wrench} label="Tricks" value={sections.tricks} tone="text-amber-600" />
            <DetailSection icon={Cpu} label="Algorithms" value={sections.algorithms} tone="text-blue-600" />
            <DetailSection icon={Rocket} label="Obtain ASAP" value={sections.obtainAsap} tone="text-emerald-600" />

            {/* Risk Analysis Section */}
            <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-rose-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risk Analysis</p>
              <DetailSection icon={Target} label="Failure Points" value={sections.failurePoints} tone="text-rose-600" />
              <DetailSection icon={Bug} label="Common Pitfalls" value={sections.pitfalls} tone="text-amber-600" />
              <DetailSection icon={Users} label="Competitor Weaknesses" value={sections.competitorWeaknesses} tone="text-indigo-600" />
            </div>

            {avoid && (
              <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-rose-600 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Avoid</p>
                <p className="text-sm leading-relaxed text-rose-600/90">{avoid}</p>
              </div>
            )}

            {item.signals?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Action Steps</p>
                <ol className="space-y-1 text-sm">
                  {item.signals.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-muted-foreground shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                <ExternalLink className="w-3 h-3 shrink-0" /> {item.url}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MoneyHuntPanel() {
  const [items, setItems] = useState(null);
  const [hunting, setHunting] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const load = useCallback(async () => {
    const all = await base44.entities.IntelFeed.filter({ source: 'Shadow Money Hunt' }, '-created_date', 100).catch(() => []);
    setItems(all);
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.IntelFeed.subscribe((event) => {
      if (event.type === 'create' && event.data?.source === 'Shadow Money Hunt') {
        setItems((prev) => [event.data, ...(prev || [])].slice(0, 100));
      }
    });
    return unsubscribe;
  }, [load]);

  const runHunt = async () => {
    setHunting(true);
    try {
      const res = await base44.functions.invoke('shadowMoneyHunt', {});
      const data = res.data || res;
      setLastRun(data);
      await load();
    } catch { /* ignore */ }
    setHunting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Crosshair className="w-4 h-4" /> Money Hunt Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full details — build system value, tricks, algorithms, obtain-ASAP paths, and what to avoid. {items?.length || 0} items logged.
          </p>
        </div>
        <Button size="sm" onClick={runHunt} disabled={hunting} className="rounded-full">
          {hunting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          Send Shadow Hunting
        </Button>
      </div>

      {hunting && (
        <Card className="p-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Shadow is following the money — hunting deals, algorithms, data markets, and secrets…</span>
        </Card>
      )}

      {lastRun && !hunting && (
        <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs text-emerald-600">{lastRun.found} intelligence items delivered. {lastRun.executive_summary?.slice(0, 200)}…</p>
        </Card>
      )}

      {items === null && !hunting && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}

      {items?.length === 0 && !hunting && (
        <Card className="p-6 text-center">
          <Crosshair className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No intelligence yet. Send Shadow hunting to follow the money.</p>
        </Card>
      )}

      {items?.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => <IntelCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}