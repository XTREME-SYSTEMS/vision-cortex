import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const scoreColor = (n, max = 10) => {
  const pct = n / max;
  if (pct >= 0.75) return 'text-emerald-500';
  if (pct >= 0.5) return 'text-amber-500';
  return 'text-rose-500';
};

const riskColor = { low: 'bg-sky-500/10 text-sky-600', medium: 'bg-amber-500/10 text-amber-600', high: 'bg-orange-500/10 text-orange-600', extreme: 'bg-rose-500/10 text-rose-600' };

export default function UserCard({ user }) {
  if (!user) return null;
  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg leading-tight">{user.name}, {user.age}</h3>
          <p className="text-xs text-muted-foreground">{user.archetype}</p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-heading ${scoreColor(user.experience_score)}`}>{user.experience_score?.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">exp score</div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{user.background}</p>
      <p className="text-xs italic text-muted-foreground/80 leading-relaxed">{user.personality_summary}</p>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={riskColor[user.risk_tolerance] || ''}>{user.risk_tolerance} risk</Badge>
        <Badge variant="outline">Tech {user.tech_savviness}/10</Badge>
        <Badge variant="outline">Clarity {user.goal_clarity}/10</Badge>
      </div>

      <div className="border-l-2 border-foreground/20 pl-3 py-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Their vision</div>
        <p className="text-sm leading-relaxed">"{user.vision}"</p>
      </div>

      {user.recommendation && (
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">System recommends</div>
          <p className="text-sm font-medium">{user.recommendation.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{user.recommendation.one_liner}</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{user.recommendation.why}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-emerald-600 font-medium mb-1">✓ Liked</div>
          <ul className="space-y-0.5 text-muted-foreground">
            {(user.liked || []).map((l, i) => <li key={i}>• {l}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-rose-600 font-medium mb-1">✗ Disliked</div>
          <ul className="space-y-0.5 text-muted-foreground">
            {(user.disliked || []).map((l, i) => <li key={i}>• {l}</li>)}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2.5">
        <div className="text-[10px] uppercase tracking-wider text-rose-500/80 mb-1">Gaps for this user</div>
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {(user.gaps || []).map((g, i) => <li key={i}>• {g}</li>)}
        </ul>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 mt-auto">
        <span className="text-xs text-muted-foreground">Success probability</span>
        <span className={`text-sm font-medium ${scoreColor(user.success_probability, 1)}`}>{(user.success_probability * 100).toFixed(0)}%</span>
      </div>
    </Card>
  );
}