import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { money } from '@/components/ideas/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { FlaskConical, Loader2, Plus, Trash2, Undo2, Play, RefreshCw } from 'lucide-react';

const DEFAULT_ASSUMPTIONS = [
  { name: 'Starting capital', value: 5000, unit: 'usd' },
  { name: 'Monthly new users', value: 200, unit: 'users' },
  { name: 'Price per user', value: 29, unit: 'usd/mo' },
  { name: 'Monthly churn', value: 5, unit: '%' },
];

export default function Simulation() {
  const [ideas, setIdeas] = useState([]);
  const [ideaId, setIdeaId] = useState('');
  const [strategy, setStrategy] = useState('');
  const [horizon, setHorizon] = useState(365);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reverseValue, setReverseValue] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    base44.entities.Idea.list('rank', 20).then((r) => { setIdeas(r || []); if (r?.[0]) { setIdeaId(r[0].id); setStrategy(r[0].title); } }).catch(() => {});
  }, []);

  const setAssumption = (i, field, val) => {
    const next = [...assumptions];
    next[i] = { ...next[i], [field]: field === 'value' ? Number(val) : val };
    setAssumptions(next);
  };
  const addAssumption = () => setAssumptions([...assumptions, { name: '', value: 0, unit: '' }]);
  const removeAssumption = (i) => setAssumptions(assumptions.filter((_, idx) => idx !== i));

  const run = async (reverseTarget) => {
    setLoading(true); setErr('');
    try {
      const payload = { idea_id: ideaId || undefined, strategy_name: strategy || 'Untitled strategy', horizon_days: horizon, assumptions };
      if (reverseTarget) payload.reverse_target = reverseTarget;
      if (sim?.id) payload.simulation_id = sim.id;
      const res = await base44.functions.invoke('simulateStrategy', payload);
      setSim(res.data?.simulation);
    } catch (e) {
      setErr('Simulation failed — try again.');
    } finally { setLoading(false); }
  };

  const forecast = sim?.forecast || [];
  const metrics = sim?.metrics || {};

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Simulation Studio · Step 3</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Steer before you build.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Every business variable is a line item with a downstream financial impact. Forecast the horizon, watch the live bottom line, then reverse-engineer what it takes to hit your goal.
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        {/* Controls */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-4 h-fit">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Opportunity</label>
            <Select value={ideaId} onValueChange={(v) => { setIdeaId(v); const id = ideas.find((i) => i.id === v); if (id) setStrategy(id.title); }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick an opportunity" /></SelectTrigger>
              <SelectContent>{ideas.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Strategy name</label>
            <Input value={strategy} onChange={(e) => setStrategy(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Horizon</label>
            <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="1095">3 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Assumptions (line items)</label>
              <button onClick={addAssumption} className="text-muted-foreground hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-2">
              {assumptions.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input value={a.name} onChange={(e) => setAssumption(i, 'name', e.target.value)} placeholder="Name" className="h-8 text-xs flex-1" />
                  <Input type="number" value={a.value} onChange={(e) => setAssumption(i, 'value', e.target.value)} className="h-8 text-xs w-20" />
                  <Input value={a.unit} onChange={(e) => setAssumption(i, 'unit', e.target.value)} placeholder="unit" className="h-8 text-xs w-20" />
                  <button onClick={() => removeAssumption(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => run()} disabled={loading} className="flex-1 rounded-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run forecast
            </Button>
            {sim && (
              <Button variant="outline" onClick={() => run()} disabled={loading} className="rounded-full shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regenerate
              </Button>
            )}
          </div>

          <div className="pt-3 border-t border-border/50">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Reverse-engineer a target</label>
            <div className="flex gap-2 mt-1.5">
              <Input type="number" value={reverseValue} onChange={(e) => setReverseValue(e.target.value)} placeholder="e.g. 1000000 (profit)" className="rounded-full" />
              <Button variant="outline" className="rounded-full shrink-0" disabled={loading || !reverseValue} onClick={() => run({ kind: 'profit', value: Number(reverseValue) })}>
                <Undo2 className="w-4 h-4" /> Reverse
              </Button>
            </div>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </section>

        {/* Results */}
        <section className="space-y-5">
          {!sim && !loading && (
            <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
              <FlaskConical className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Set your assumptions and run a forecast. The live bottom line appears here.</p>
            </div>
          )}
          {loading && !sim && (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          )}
          {sim && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric label="Total revenue" value={money(metrics.total_revenue)} />
                <Metric label="Total cost" value={money(metrics.total_cost)} />
                <Metric label="Net profit" value={money(metrics.total_profit)} tone={metrics.total_profit >= 0 ? 'pos' : 'neg'} />
                <Metric label="ROI" value={`${Math.round(metrics.roi_pct || 0)}%`} />
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <h3 className="font-medium mb-4">Horizon forecast</h3>
                {forecast.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tickFormatter={(d) => `d${d}`} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={48} />
                      <Tooltip formatter={(v) => money(v)} labelFormatter={(d) => `Day ${d}`} />
                      <ReferenceLine y={0} stroke="currentColor" className="text-border" />
                      <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="profit" name="Monthly profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">No forecast data.</p>}
                {metrics.break_even_day != null && metrics.break_even_day > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">Break-even at day {Math.round(metrics.break_even_day)}.</p>
                )}
              </div>

              {sim.reverse_required_changes?.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Undo2 className="w-4 h-4" />
                    <h3 className="font-medium">Reverse-engineered path to {money(sim.reverse_target?.value)}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sim.reverse_feasible ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'}`}>
                      {sim.reverse_feasible ? 'Feasible' : 'Likely infeasible'}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {sim.reverse_required_changes.map((c, i) => (
                      <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                        <span className="font-mono text-xs text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  const c = tone === 'pos' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'neg' ? 'text-destructive' : '';
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-display text-xl mt-0.5 ${c}`}>{value}</p>
    </div>
  );
}