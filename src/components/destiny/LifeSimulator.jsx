import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, AlertTriangle, Zap, TrendingUp, Heart, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { money } from '@/components/ideas/format';

const HORIZONS = ['1m', '3m', '6m', '1y', '2y', '3y', '5y', '10y', '15y', '20y'];

const SCENARIO_COLOR = {
  conservative: '#64748b',
  base: '#0ea5e9',
  aggressive: '#22c55e',
};

const EVENT_ICON = {
  'Death of a loved one': Skull,
  Divorce: Heart,
  'Depression cycle / burnout': AlertTriangle,
  'Health crisis': AlertTriangle,
  'Market crash / recession': TrendingUp,
  'Windfall / liquidity event': Zap,
  'Hyperfocus breakthrough': Zap,
  'Marriage / partnership': Heart,
};

// The interactive life simulator: horizon selector, net-worth chart, life events,
// and decision points the user can override (re-runs the sim on each change).
export default function LifeSimulator({ vision, strategy, persona, onDone }) {
  const [horizon, setHorizon] = useState('1y');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [choices, setChoices] = useState([]); // { id, prompt, choice }
  const [error, setError] = useState(null);

  const run = async (overrideChoices = choices) => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('simulateLife', {
        vision, strategy, persona, horizon, choices: overrideChoices,
      });
      setResult(res.data || res);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const chooseOption = (dp, option) => {
    const next = choices.filter((c) => c.id !== dp.id);
    next.push({ id: dp.id, prompt: dp.prompt, choice: option });
    setChoices(next);
    run(next);
  };

  const chartData = result?.timeline?.map((p) => ({ label: p.label, net_worth: Math.round(p.net_worth || 0) })) || [];

  return (
    <div className="space-y-8">
      {/* Horizon selector */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Time horizon</p>
        <div className="flex flex-wrap gap-2">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => { setHorizon(h); setResult(null); setChoices([]); }}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-sm border transition-colors',
                horizon === h ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
              )}
            >
              {h === '1m' ? '1 month' : h === '3m' ? '3 months' : h === '6m' ? '6 months' : h}
            </button>
          ))}
        </div>
      </div>

      {!result && (
        <Button onClick={() => run()} disabled={running} className="rounded-full h-11 px-6">
          {running ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
          {running ? 'Simulating your life…' : `Run the ${horizon} life simulation`}
        </Button>
      )}

      {result && (
        <>
          {/* Net worth chart */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Projected net worth</p>
              <Button variant="outline" size="sm" className="rounded-full" disabled={running} onClick={() => run()}>
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Re-run'}
              </Button>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={(v) => money(v)} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} formatter={(v) => money(v)} />
                  <Area type="monotone" dataKey="net_worth" stroke="#0ea5e9" strokeWidth={2} fill="url(#nw)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outcomes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.outcomes?.map((o) => (
              <div key={o.scenario} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium capitalize">{o.scenario}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${SCENARIO_COLOR[o.scenario]}20`, color: SCENARIO_COLOR[o.scenario] }}>
                    {o.probability}%
                  </span>
                </div>
                <p className="font-display text-2xl mt-2">{money(o.final_net_worth)}</p>
                <p className="text-xs text-muted-foreground mt-1">{o.summary}</p>
              </div>
            ))}
          </div>

          {/* Life events */}
          {result.life_events?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Life events modeled</p>
              <div className="space-y-2">
                {result.life_events.map((ev, i) => {
                  const Icon = EVENT_ICON[ev.kind] || AlertTriangle;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ev.kind} <span className="text-muted-foreground font-normal">· {ev.period_label}</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Probability: {ev.probability}% · Impact: {ev.financial_impact}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive decision points */}
          {result.decision_points?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Decision points</p>
              <p className="text-xs text-muted-foreground mb-3">The AI auto-picks the best choice (highlighted). Tap any option to override it — the simulation re-runs and the outcome changes.</p>
              <div className="space-y-4">
                {result.decision_points.map((dp) => {
                  const userChoice = choices.find((c) => c.id === dp.id)?.choice;
                  return (
                    <div key={dp.id} className="rounded-xl border border-border p-4">
                      <p className="text-sm font-medium">{dp.prompt}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{dp.period_label} · AI recommends: {dp.ai_choice} — {dp.rationale}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {dp.options?.map((opt) => {
                          const isAi = opt === dp.ai_choice && !userChoice;
                          const isUser = opt === userChoice;
                          return (
                            <button
                              key={opt}
                              onClick={() => chooseOption(dp, opt)}
                              disabled={running}
                              className={cn(
                                'px-3 py-1.5 rounded-full text-xs border transition-colors',
                                isUser ? 'bg-primary text-primary-foreground border-primary' : isAi ? 'border-primary/50 text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                              )}
                            >
                              {opt}
                              {isUser && ' · your pick'}
                              {isAi && !isUser && ' · AI pick'}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-2">Est. impact: {dp.financial_impact}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {result.summary && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-primary mb-1">Most likely path</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>
          )}

          <Button onClick={() => onDone(result)} className="rounded-full h-11 px-6">
            Lock this plan & continue
          </Button>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}