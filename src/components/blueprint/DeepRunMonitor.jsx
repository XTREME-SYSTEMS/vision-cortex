import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CFG = {
  passed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Failed' },
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Running' },
  repairable: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Repairable' },
};

export default function DeepRunMonitor() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, passed: 0, approved: 0, avgScore: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.DeepRun.list('-created_date', 30);
      setRuns(list || []);
      const total = (list || []).length;
      const passed = (list || []).filter(r => r.status === 'passed').length;
      const approved = (list || []).filter(r => r.is_approved).length;
      const avgScore = total > 0
        ? Math.round(((list || []).reduce((s, r) => s + (r.aggregate_score || 0), 0) / total) * 100)
        : 0;
      setStats({ total, passed, approved, avgScore });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" /> DEEP Run Monitor — The Proof
        </h3>
        <button onClick={load} disabled={loading} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="text-[10px] text-muted-foreground">Total Runs</div>
          <div className="text-lg font-mono font-bold">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-emerald-500/5 p-2">
          <div className="text-[10px] text-muted-foreground">Passed</div>
          <div className="text-lg font-mono font-bold text-emerald-500">{stats.passed}</div>
        </div>
        <div className="rounded-lg bg-violet-500/5 p-2">
          <div className="text-[10px] text-muted-foreground">100% Approved</div>
          <div className="text-lg font-mono font-bold text-violet-500">{stats.approved}</div>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="text-[10px] text-muted-foreground">Avg Score</div>
          <div className="text-lg font-mono font-bold">{stats.avgScore}%</div>
        </div>
      </div>

      {loading && runs.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg">
          No DEEP runs yet. Runs appear here when state machines execute — each is the proof of a deterministic cycle.
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {runs.map((run) => {
            const cfg = STATUS_CFG[run.status] || STATUS_CFG.failed;
            const Icon = cfg.icon;
            return (
              <div key={run.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 text-sm">
                <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.color, run.status === 'running' && 'animate-spin')} />
                <span className="font-mono text-[10px] text-muted-foreground w-28 truncate">{run.run_id}</span>
                <span className="text-[11px] text-foreground flex-1 truncate">{run.spec_id}</span>
                <span className={cn('text-[10px] font-mono font-semibold', run.is_approved ? 'text-violet-500' : 'text-muted-foreground')}>
                  {(run.aggregate_score * 100).toFixed(0)}%
                </span>
                {run.is_approved && <span className="text-[9px] text-violet-500 bg-violet-500/10 px-1 rounded">∞</span>}
                <span className="text-[9px] text-muted-foreground/60">{run.cost_credits_used}cr</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}