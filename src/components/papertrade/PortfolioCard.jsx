import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Flame, Target, Trophy } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function PortfolioCard({ portfolio }) {
  if (!portfolio) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm">No fund yet. Run the first cycle to initialize the $10M paper account.</p>
      </Card>
    );
  }
  const total = portfolio.total_value || 0;
  const start = portfolio.starting_value || 10000000;
  const multiple = total / start;
  const goalMultiple = 2;
  const progress = Math.min(100, ((total - start) / (start * (goalMultiple - 1))) * 100);
  const streak = portfolio.consecutive_wins || 0;
  const rewardEarned = portfolio.status === 'reward_earned';

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" /> Portfolio Value
        </div>
        <p className="font-display text-3xl mt-2">${fmt(total)}</p>
        <p className="text-xs text-muted-foreground mt-1">Day {portfolio.day || 0} · {multiple.toFixed(2)}× start</p>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Target className="w-3.5 h-3.5" /> Daily Goal
        </div>
        <p className="font-display text-3xl mt-2">2.00×</p>
        <div className="h-1.5 rounded-full bg-muted mt-3 overflow-hidden">
          <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(1)}% to double</p>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5" /> Win Streak
        </div>
        <p className="font-display text-3xl mt-2">{streak}<span className="text-base text-muted-foreground">/10</span></p>
        <p className="text-xs text-muted-foreground mt-1">Consecutive winning cycles</p>
      </Card>
      <Card className={`p-5 ${rewardEarned ? 'border-foreground' : ''}`}>
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" /> Reward
        </div>
        <p className="font-display text-3xl mt-2">{rewardEarned ? 'EARNED' : 'Locked'}</p>
        <p className="text-xs text-muted-foreground mt-1">Unlocks at 10-win streak</p>
      </Card>
    </div>
  );
}