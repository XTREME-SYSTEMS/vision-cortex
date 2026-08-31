import React from 'react';
import { Card } from '@/components/ui/card';

const scoreColor = (n, max = 10) => {
  const pct = n / max;
  if (pct >= 0.75) return 'text-emerald-500';
  if (pct >= 0.5) return 'text-amber-500';
  return 'text-rose-500';
};

export default function AggregatePanel({ aggregate, count }) {
  if (!aggregate) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg experience</div>
          <div className={`text-3xl font-heading ${scoreColor(aggregate.avg_experience_score)}`}>{aggregate.avg_experience_score?.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">/ 10 across {count} users</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg success prob.</div>
          <div className={`text-3xl font-heading ${scoreColor(aggregate.avg_success_probability, 1)}`}>{(aggregate.avg_success_probability * 100).toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">launched + monetized</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Serves best</div>
          <div className="text-sm font-medium leading-tight mt-1">{aggregate.strongest_user_type || '—'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Serves worst</div>
          <div className="text-sm font-medium leading-tight mt-1 text-rose-500">{aggregate.weakest_user_type || '—'}</div>
        </Card>
      </div>

      {aggregate.universal_gaps?.length > 0 && (
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-rose-500/80 mb-2">Universal gaps (affect nearly every user type)</div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {aggregate.universal_gaps.map((g, i) => <li key={i}>• {g}</li>)}
          </ul>
        </Card>
      )}

      <Card className="p-4 border-foreground/20">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Overall verdict</div>
        <p className="text-sm leading-relaxed">{aggregate.overall_verdict}</p>
      </Card>
    </div>
  );
}