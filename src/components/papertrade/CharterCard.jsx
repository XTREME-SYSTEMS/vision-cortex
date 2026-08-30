import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ShieldCheck, Lock, Target } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function CharterCard({ portfolio, trades, onGenerate, generating, blueprint, blueprintError }) {
  const streak = portfolio?.consecutive_wins || 0;
  const resolved = trades.filter((t) => t.status === 'resolved_won' || t.status === 'resolved_lost');
  const wins = resolved.filter((t) => t.status === 'resolved_won').length;
  const winRate = resolved.length ? (wins / resolved.length) * 100 : 0;
  const avgConf = resolved.length ? resolved.reduce((s, t) => s + (t.confidence || 0), 0) / resolved.length : 0;
  const gateMet = streak >= 10 && avgConf >= 90;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
        <ShieldCheck className="w-3.5 h-3.5" /> Council Charter — Exit the Matrix
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed max-w-3xl">
        The Council designs and operates a fully digital, AI-run 24/7 business with minimal capital.
        Proof gate: <span className="text-foreground font-medium">10 consecutive winning cycles</span> and
        <span className="text-foreground font-medium"> 90% average confidence</span> on the paper fund must be met
        before the operator commits real capital to scale. Shadow operates covertly throughout.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win streak</p>
          <p className="font-display text-2xl">{streak}<span className="text-sm text-muted-foreground">/10</span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win rate</p>
          <p className="font-display text-2xl">{winRate.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg confidence</p>
          <p className="font-display text-2xl">{avgConf.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Proof gate</p>
          <p className={`font-display text-2xl flex items-center gap-1.5 ${gateMet ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {gateMet ? <><ShieldCheck className="w-5 h-5" /> Met</> : <><Lock className="w-5 h-5" /> Locked</>}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-border/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4" /> Digital business blueprint</p>
            <p className="text-xs text-muted-foreground mt-0.5">Have the Council design the autonomous 24/7 business to run once the gate is met.</p>
          </div>
          <Button onClick={onGenerate} disabled={generating} variant="outline">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Designing…</> : <><Sparkles className="w-4 h-4" /> Generate blueprint</>}
          </Button>
        </div>

        {blueprintError && <p className="text-xs text-rose-600 mt-3">{blueprintError}</p>}

        {blueprint && (
          <div className="mt-4 rounded-lg border border-border/60 p-4 bg-muted/30">
            <p className="font-medium">{blueprint.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{blueprint.one_liner}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
              <span>Launch cost: <span className="text-foreground">${fmt(blueprint.launch_cost_usd)}</span></span>
              <span>Est. monthly profit: <span className="text-foreground">${fmt(blueprint.est_monthly_profit_usd)}</span></span>
              <span>Time to launch: <span className="text-foreground">{blueprint.time_to_launch_days || '—'} days</span></span>
            </div>
            {blueprint.automation_plan && (
              <p className="text-xs text-foreground/70 mt-3 leading-relaxed line-clamp-4">{blueprint.automation_plan}</p>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-2">Saved to Opportunities as a strategized idea.</p>
          </div>
        )}
      </div>
    </Card>
  );
}