import React from 'react';
import { Link2, MapPin, TrendingUp } from 'lucide-react';
import { categoryAccent } from '@/components/intel/categoryAccent';

export default function IntelRow({ item }) {
  const accent = categoryAccent(item.category);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center text-[10px] font-display text-white" style={{ background: accent }}>
          {item.category.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.category}</span>
            {item.region && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" />{item.region}
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: accent }}>
              <TrendingUp className="w-3 h-3" />{item.impact_score}
            </span>
          </div>
          <h3 className="mt-1 font-display text-lg leading-tight">{item.headline}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>

      {item.signals?.length > 0 && (
        <ul className="space-y-1">
          {item.signals.map((s, i) => (
            <li key={i} className="text-xs text-foreground/80 flex gap-2">
              <span className="text-muted-foreground">•</span>{s}
            </li>
          ))}
        </ul>
      )}

      {item.correlations?.length > 0 && (
        <div className="border-t border-border/40 pt-2 space-y-1">
          {item.correlations.map((c, i) => (
            <p key={i} className="text-xs italic text-muted-foreground flex gap-2">
              <Link2 className="w-3 h-3 mt-0.5 shrink-0" />{c}
            </p>
          ))}
        </div>
      )}

      {item.source && (
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-2">{item.source}</a>
          ) : item.source}
        </p>
      )}
    </div>
  );
}