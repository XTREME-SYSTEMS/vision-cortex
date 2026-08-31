import { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { money } from '@/components/ideas/format';

// Scrollable, searchable list of generated strategies with a recommended
// highlight. User picks one to carry into simulation.
export default function StrategyList({ strategies, recommendation, selectedId, onSelect, topN }) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(!topN);
  const base = strategies.filter((s) => {
    const t = `${s.title} ${s.one_liner} ${s.archetype}`.toLowerCase();
    return !q || t.includes(q.toLowerCase());
  });
  const filtered = showAll ? base : base.slice(0, topN || 10);

  return (
    <div className="space-y-4">
      {recommendation?.reasoning && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-primary mb-1">Recommended strategy</p>
          <p className="text-sm leading-relaxed">{recommendation.reasoning}</p>
        </div>
      )}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${strategies.length} strategies…`}
          className="pl-9 rounded-full"
        />
      </div>
      <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
        {filtered.map((s) => {
          const isRec = recommendation?.strategy_id === s.id;
          const isSel = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                'w-full text-left p-3.5 rounded-xl border transition-colors',
                isSel
                  ? 'border-primary bg-primary/5'
                  : isRec
                  ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                  : 'border-border hover:border-foreground/30 hover:bg-muted/40'
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                )}>
                  {isSel && <Check className="w-3 h-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[15px]">{s.title}</p>
                    {isRec && <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Best</span>}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.archetype}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.one_liner}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                    <span>Score: {s.score}/100</span>
                    <span>Capital: {money(s.capital_required_usd)}</span>
                    <span>Profit in: {s.time_to_profit_days}d</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {topN && !q && base.length > (topN || 10) && (
          <button onClick={() => setShowAll((v) => !v)} className="text-sm text-primary hover:underline pt-2">
            {showAll ? 'Show top 10 only' : `Show all ${base.length} strategies`}
          </button>
        )}
      </div>
    </div>
  );
}