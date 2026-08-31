import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, CheckCircle2, Loader2, RefreshCw, Link2, Unlink, Milestone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { money } from '@/components/ideas/format';

const CONNECTOR_ID = '69ddcb305a599e0b4a1b3cff';

// Unified roadmap: LifePlan milestones + the user's real Google Calendar events
// (daily routine) on one chronological timeline. Connect/sync Google Calendar.
export default function CalendarRoadmap({ lifePlanId }) {
  const [plan, setPlan] = useState(null);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('calendarRoadmap', { days: 365 });
      const data = res.data || res;
      setConnected(!!data.connected);
      setEvents(data.events || []);
    } catch {
      setConnected(false);
      setEvents([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    if (lifePlanId) {
      try {
        const p = await base44.entities.LifePlan.get(lifePlanId);
        setPlan(p);
      } catch { /* ignore */ }
    }
    await fetchRoadmap();
    setLoading(false);
  }, [lifePlanId, fetchRoadmap]);

  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) { clearInterval(timer); fetchRoadmap(); }
      }, 500);
    } catch (e) { setError(e.message || 'Connection failed'); }
  };

  const disconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setEvents([]);
    } catch (e) { setError(e.message || 'Disconnect failed'); }
  };

  const sync = async () => {
    if (!lifePlanId) return;
    setSyncing(true);
    setError(null);
    try {
      await base44.functions.invoke('syncLifePlanToCalendar', { life_plan_id: lifePlanId });
      await load();
    } catch (e) {
      setError(e.message || 'Sync failed — connect your calendar first.');
    }
    setSyncing(false);
  };

  // Merge milestones + calendar events into one sorted timeline
  const milestones = (plan?.milestones || []).map((m) => ({
    type: 'milestone',
    date: m.start || m.date,
    title: m.label,
    detail: m.event || '',
    value: m.target_net_worth,
  }));
  const calEvents = events.map((e) => ({
    type: 'event',
    date: e.start,
    title: e.summary,
    detail: e.location || '',
    allDay: e.all_day,
  }));
  const merged = [...milestones, ...calEvents]
    .filter((x) => x.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Life Roadmap × Daily Routine</h3>
          {connected ? (
            <span className="text-[10px] flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Calendar connected</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Not connected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              {lifePlanId && (
                <Button size="sm" variant="outline" className="rounded-full" disabled={syncing} onClick={sync}>
                  {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync milestones
                </Button>
              )}
              <Button size="sm" variant="ghost" className="rounded-full" onClick={disconnect}>
                <Unlink className="w-3.5 h-3.5" /> Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" className="rounded-full" onClick={connect}>
              <Link2 className="w-3.5 h-3.5" /> Connect Google Calendar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-500 bg-rose-500/10 rounded-lg p-2.5">{error}</div>
      )}

      {!connected && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connect your Google Calendar to see your life milestones alongside your daily routine — meetings, commitments, and destiny on one timeline.</p>
        </div>
      )}

      {connected && merged.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No upcoming milestones or calendar events in the next year. Sync your milestones or add events to your Google Calendar.</p>
        </div>
      )}

      {connected && merged.length > 0 && (
        <div className="relative pl-6">
          {/* vertical line */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-3">
            {merged.map((item, i) => {
              const isMilestone = item.type === 'milestone';
              const d = new Date(item.date);
              return (
                <div key={i} className="relative flex items-start gap-3">
                  <span
                    className={cn(
                      'absolute -left-[18px] top-1.5 w-3 h-3 rounded-full border-2 border-background',
                      isMilestone ? 'bg-primary' : 'bg-muted-foreground/50'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {isMilestone ? (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                          <Milestone className="w-2.5 h-2.5" /> Milestone
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Routine
                        </span>
                      )}
                    </div>
                    <p className={cn('text-sm mt-0.5', isMilestone ? 'font-medium' : '')}>{item.title}</p>
                    {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                    {isMilestone && item.value != null && (
                      <p className="text-xs font-medium mt-0.5">{money(item.value)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}