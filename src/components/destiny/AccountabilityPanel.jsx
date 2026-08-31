import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CoachChat from '@/components/destiny/CoachChat';
import CalendarRoadmap from '@/components/destiny/CalendarRoadmap';
import { money } from '@/components/ideas/format';
import { cn } from '@/lib/utils';

// The accountability layer: shows the locked Life Plan, syncs milestones to the
// user's own Google Calendar (via CalendarRoadmap), logs reality vs the
// simulation (with a calibration score), and hosts the personal AI coach.
export default function AccountabilityPanel({ lifePlanId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);
  const [reality, setReality] = useState(null);

  const load = async () => {
    if (!lifePlanId) { setLoading(false); return; }
    try {
      const p = await base44.entities.LifePlan.get(lifePlanId);
      setPlan(p);
      setReality({ log: p.reality_log || [], score: p.calibration_score, status: p.status });
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [lifePlanId]);

  const logReality = async () => {
    setLogging(true);
    try {
      const res = await base44.functions.invoke('trackReality', {
        life_plan_id: lifePlanId,
        actual: { actual_net_worth: Number(actual), note },
        recalibrate: true,
      });
      setReality({ log: res.data?.reality_log || [], score: res.data?.calibration_score, status: res.data?.status });
      setActual(''); setNote('');
    } catch { /* ignore */ }
    setLogging(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!plan) return <p className="text-muted-foreground">Lock a plan from your life simulation first.</p>;

  return (
    <div className="space-y-8">
      {/* Plan summary */}
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-primary" />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your locked plan</p>
        </div>
        <p className="font-display text-2xl">{plan.strategy?.title}</p>
        <p className="text-sm text-muted-foreground">{plan.strategy?.one_liner}</p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <span className="text-muted-foreground">Horizon: <span className="text-foreground">{plan.horizon}</span></span>
          <span className="text-muted-foreground">Target: <span className="text-foreground font-medium">{money(plan.target_final_net_worth)}</span></span>
          <span className="text-muted-foreground">Milestones: <span className="text-foreground">{plan.milestones?.length || 0}</span></span>
          {reality?.score != null && (
            <span className="text-muted-foreground">Calibration: <span className={cn('font-medium', (reality.score || 0) >= 70 ? 'text-emerald-500' : (reality.score || 0) >= 40 ? 'text-amber-500' : 'text-rose-500')}>{reality.score}/100</span></span>
          )}
        </div>
        {reality?.status === 'off_track' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-500"><AlertTriangle className="w-4 h-4" /> Plan is off-track — your coach can recalibrate from reality.</div>
        )}
      </div>

      {/* Milestones */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Milestone timeline</p>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {plan.milestones?.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{m.date}</span>
              <span className="text-sm flex-1">{m.label}{m.event ? ` — ${m.event}` : ''}</span>
              <span className="text-sm font-medium">{money(m.target_net_worth)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar roadmap — milestones alongside daily routine */}
      <div className="rounded-xl border border-border p-4">
        <CalendarRoadmap lifePlanId={lifePlanId} />
      </div>

      {/* Reality log */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-primary" /><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Log reality vs simulation</p></div>
        <div className="flex gap-2">
          <Input type="number" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Actual net worth today" className="rounded-full" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? (optional)" className="rounded-full" />
          <Button className="rounded-full shrink-0" disabled={logging || !actual} onClick={logReality}>{logging ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log'}</Button>
        </div>
        {reality?.log?.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
            {reality.log.slice().reverse().map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground w-24 shrink-0">{r.date}</span>
                <span className="flex-1">Actual {money(r.actual_net_worth)} vs expected {money(r.expected_net_worth)}</span>
                <span className={cn('font-medium', (r.variance || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{r.variance >= 0 ? '+' : ''}{money(r.variance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coach */}
      <CoachChat lifePlanId={lifePlanId} />
    </div>
  );
}