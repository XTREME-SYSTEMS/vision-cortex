import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { money } from '@/components/ideas/format';
import { Sunrise, TrendingUp, Zap, Award, RefreshCw } from 'lucide-react';

export default function MorningBrief() {
  const [pipes, setPipes] = useState(null);
  const [log, setLog] = useState('');

  const load = async () => {
    setPipes(null);
    try {
      const rows = await base44.entities.Idea.filter({ discovered_by: 'nightly_prep' }, '-created_date', 10);
      setPipes(rows);
      const logs = await base44.entities.AgentLog.filter({ category: 'nightly_prep' }, '-created_date', 1);
      setLog(logs[0]?.message || '');
    } catch { setPipes([]); }
  };

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('nightly-prep-done', h);
    return () => window.removeEventListener('nightly-prep-done', h);
  }, []);

  if (!pipes) return null;

  if (pipes.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
        <Sunrise className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No morning brief yet. The nightly ritual runs at 3am ET — or press “Prep 10 pipelines now” above to run it on demand.</p>
      </section>
    );
  }

  const highest = [...pipes].sort((a, b) => (b.est_monthly_profit_usd || 0) - (a.est_monthly_profit_usd || 0))[0];
  const fastest = [...pipes].sort((a, b) => (a.time_to_launch_days || 999) - (b.time_to_launch_days || 999))[0];
  const best = [...pipes].sort((a, b) => (b.probability_of_success || 0) - (a.probability_of_success || 0))[0];
  const totalCost = pipes.reduce((a, p) => a + (p.launch_cost_usd || 0), 0);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sunrise className="w-4 h-4" />
        <h2 className="font-medium">Morning Brief — 10 Pipelines Ready</h2>
        <button onClick={load} className="ml-auto text-muted-foreground hover:text-foreground"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3.5 h-3.5" /> Highest return</div>
          <p className="text-sm font-medium truncate">{highest?.title}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{money(highest?.est_monthly_profit_usd)}/mo</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Zap className="w-3.5 h-3.5" /> Fastest return</div>
          <p className="text-sm font-medium truncate">{fastest?.title}</p>
          <p className="text-xs text-muted-foreground">{fastest?.time_to_launch_days || 0} days to launch</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Award className="w-3.5 h-3.5" /> Best balance</div>
          <p className="text-sm font-medium truncate">{best?.title}</p>
          <p className="text-xs text-muted-foreground">{Math.round(best?.probability_of_success || 0)}% success · {money(best?.launch_cost_usd)} cost</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>Total launch cost: {money(totalCost)}</span>
        <span>{pipes.length} pipelines</span>
      </div>
      <div className="space-y-1">
        {pipes.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
            <span className="font-medium truncate flex-1">{p.title}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">{money(p.est_monthly_profit_usd)}/mo</span>
            <span className="text-xs text-muted-foreground shrink-0 w-14 text-right">{p.time_to_launch_days || 0}d</span>
          </div>
        ))}
      </div>
      {log && <p className="text-xs text-muted-foreground mt-3 italic">{log}</p>}
    </section>
  );
}