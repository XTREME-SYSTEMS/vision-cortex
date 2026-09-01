import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, X, Lightbulb, TrendingUp, Target, Activity, CheckCircle2, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityStyle = {
  critical: 'border-rose-500/40 bg-rose-500/5',
  warn: 'border-amber-500/40 bg-amber-500/5',
  info: 'border-sky-500/40 bg-sky-500/5',
};

const severityIcon = {
  critical: Activity,
  warn: TrendingUp,
  info: Target,
};

const priorityStyle = {
  immediate: 'bg-rose-500/10 text-rose-600',
  'short-term': 'bg-amber-500/10 text-amber-600',
  'long-term': 'bg-sky-500/10 text-sky-600',
};

function DriftAlertCard({ notification, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const body = (() => {
    try { return JSON.parse(notification.body); } catch { return { alert_body: notification.body }; }
  })();
  const Icon = severityIcon[notification.severity] || Target;
  const corrections = body.course_corrections || [];

  return (
    <Card className={cn('p-4 border-l-4', severityStyle[notification.severity])}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5 shrink-0',
          notification.severity === 'critical' ? 'text-rose-500' : notification.severity === 'warn' ? 'text-amber-500' : 'text-sky-500')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">{notification.title}</p>
            <button onClick={() => onDismiss(notification.id)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {body.alert_body && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{body.alert_body}</p>}

          {body.optimal_adjustment && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Optimal adjustment</p>
                <p className="text-xs leading-relaxed">{body.optimal_adjustment}</p>
              </div>
            </div>
          )}

          {corrections.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-3"
            >
              {expanded ? 'Hide' : 'Show'} {corrections.length} course correction{corrections.length > 1 ? 's' : ''}
            </button>
          )}

          {expanded && corrections.length > 0 && (
            <div className="mt-2 space-y-2">
              {corrections.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="leading-relaxed">{c.action}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {c.priority && <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded', priorityStyle[c.priority])}>{c.priority}</span>}
                      {c.rationale && <span className="text-[10px] text-muted-foreground">{c.rationale}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function DriftAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [checking, setChecking] = useState(false);
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const load = useCallback(async () => {
    try {
      const notifs = await base44.entities.Notification.filter({ read: false }, '-created_date', 10).catch(() => []);
      // Filter to drift-related notifications only
      const driftNotifs = notifs.filter((n) => n.kind === 'loss' || n.kind === 'drawdown');
      setAlerts(driftNotifs);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('detectLifeDrift', {});
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        setLastCheck(data);
        await load();
      }
    } catch (e) {
      setError(e.message || 'Drift check failed');
    }
    setChecking(false);
  };

  const autoHeal = async () => {
    setHealing(true);
    setHealResult(null);
    try {
      const res = await base44.functions.invoke('healDestinyEngine', {});
      const data = res?.data || res;
      if (data?.error) {
        setHealResult({ ok: false, msg: data.error });
      } else {
        const r = data?.remediation || data;
        const summary = r
          ? Object.entries(r).filter(([k]) => k !== 'skipped').map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')
          : 'Healing complete';
        setHealResult({ ok: true, msg: summary });
        await load();
      }
    } catch (e) {
      setHealResult({ ok: false, msg: e?.message || 'Heal failed' });
    }
    setHealing(false);
  };

  const dismiss = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setAlerts((prev) => (prev || []).filter((a) => a.id !== id));
  };

  const dismissAll = async () => {
    if (!alerts?.length) return;
    for (const a of alerts) {
      await base44.entities.Notification.update(a.id, { read: true });
    }
    setAlerts([]);
  };

  const count = alerts?.length || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className={cn('w-4 h-4', count > 0 ? 'text-amber-500' : 'text-emerald-500')} />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Drift Sentinel {count > 0 && `· ${count} active alert${count > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={dismissAll}>
              Dismiss all
            </Button>
          )}
          <div className="flex items-center gap-2">
            {count > 0 && (
              <Button variant="default" size="sm" className="rounded-full gap-1.5" disabled={healing} onClick={autoHeal}>
                {healing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HeartPulse className="w-3.5 h-3.5" />}
                {healing ? 'Healing…' : 'Auto-Heal'}
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-full" disabled={checking} onClick={runCheck}>
              {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Check now
            </Button>
          </div>
        </div>
      </div>

      {healResult && (
        <Card className={cn('p-3', healResult.ok ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5')}>
          <p className={cn('text-xs leading-relaxed', healResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {healResult.ok && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
            {healResult.msg}
          </p>
        </Card>
      )}

      {error && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/5">
          <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
        </Card>
      )}

      {alerts === null && (
        <Card className="p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></Card>
      )}

      {alerts?.length === 0 && !checking && (
        <Card className="p-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            {lastCheck?.message || 'No drift detected — you are on track with your optimal strategy.'}
          </p>
        </Card>
      )}

      {alerts?.length > 0 && (
        <div className="space-y-2.5">
          {alerts.map((n) => (
            <DriftAlertCard key={n.id} notification={n} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </div>
  );
}