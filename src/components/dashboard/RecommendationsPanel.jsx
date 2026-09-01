import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, ArrowUpRight, ShieldCheck, Wrench, CheckCircle2, Loader2 } from 'lucide-react';

const STATUS_STYLE = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  implemented: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  audited: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
  blocked: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function RecommendationsPanel() {
  const [recs, setRecs] = useState(null);
  const [running, setRunning] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const load = () => {
    base44.entities.SystemEnhancement.list('-created_date', 6)
      .then((r) => setRecs(r || []))
      .catch(() => setRecs([]));
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.SystemEnhancement?.subscribe?.(() => load());
    return () => unsub && unsub();
  }, []);

  const runNow = async () => {
    setRunning(true);
    setActionMsg(null);
    try {
      await base44.functions.invoke('autoRecommend', {});
      load();
    } catch (_e) {
      /* ignore — toast */
    } finally {
      setRunning(false);
    }
  };

  const implementAll = async () => {
    setImplementing(true);
    setActionMsg(null);
    try {
      const res = await base44.functions.invoke('autoEnhanceAll', { max_per_run: 5 });
      const data = res?.data || res;
      setActionMsg({ ok: true, msg: `Implemented: ${data?.implemented ?? 'done'}` });
      load();
    } catch (e) {
      setActionMsg({ ok: false, msg: e?.message || 'Implement failed' });
    }
    setImplementing(false);
  };

  const validateAll = async () => {
    setValidating(true);
    setActionMsg(null);
    try {
      const res = await base44.functions.invoke('auditDestinyEngine', {});
      const data = res?.data || res;
      if (data?.error) {
        setActionMsg({ ok: false, msg: data.error });
      } else {
        setActionMsg({ ok: true, msg: data?.summary || 'Validation complete' });
      }
      load();
    } catch (e) {
      setActionMsg({ ok: false, msg: e?.message || 'Validate failed' });
    }
    setValidating(false);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-xl bg-foreground text-background grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-display text-[15px] tracking-tight">System Recommendations</h3>
            <p className="text-[11px] text-muted-foreground">The system reflecting on itself — autonomously.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={runNow}
            disabled={running || implementing || validating}
            className="text-[12px] px-3 py-1.5 rounded-full border border-border/60 hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            {running ? 'Reflecting…' : 'Reflect'}
          </button>
          <button
            onClick={implementAll}
            disabled={running || implementing || validating}
            className="text-[12px] px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {implementing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
            {implementing ? 'Implementing…' : 'Implement'}
          </button>
          <button
            onClick={validateAll}
            disabled={running || implementing || validating}
            className="text-[12px] px-3 py-1.5 rounded-full border border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/5 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {validating ? 'Validating…' : 'Validate'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`text-[11px] mb-2 px-3 py-1.5 rounded-lg ${actionMsg.ok ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' : 'text-red-600 dark:text-red-400 bg-red-500/5'}`}>
          {actionMsg.msg}
        </div>
      )}

      <div className="space-y-2.5">
        {recs === null && <p className="text-sm text-muted-foreground">Loading recommendations…</p>}
        {recs?.length === 0 && <p className="text-sm text-muted-foreground">No recommendations yet. The engine runs every 4 hours.</p>}
        {recs?.map((r) => (
          <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-background/40 border border-border/40">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-snug truncate">{r.title}</p>
              {r.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] || 'bg-muted text-muted-foreground'}`}>
                  {r.status?.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-muted-foreground">{r.category}</span>
                {r.source === 'autonomous' && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> auto
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground shrink-0">P{r.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}