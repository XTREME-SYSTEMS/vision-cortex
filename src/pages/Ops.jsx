import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Stat from '@/components/ui/stat';

const tone = {
  info: 'text-muted-foreground border-border bg-muted/40',
  success: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10',
  warn: 'text-amber-500 border-amber-500/40 bg-amber-500/10',
  error: 'text-rose-500 border-rose-500/40 bg-rose-500/10',
};

export default function Ops() {
  const [logs, setLogs] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.entities.AgentLog.list('-created_date', 100).then(setLogs);
  }, []);

  const shown = useMemo(
    () => (logs || []).filter((l) => filter === 'all' || l.level === filter),
    [logs, filter]
  );

  const stats = useMemo(() => {
    if (!logs) return null;
    return {
      total: logs.length,
      healed: logs.filter((l) => l.auto_action).length,
      open: logs.filter((l) => ['warn', 'error'].includes(l.level) && !l.resolved).length,
    };
  }, [logs]);

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Self-Reflection Loop</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">Ops, auto-audit & self-healing.</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Events" value={stats.total} sub="last 24h" />
          <Stat label="Auto-healed" value={stats.healed} sub="no human touch" />
          <Stat label="Open issues" value={stats.open} sub="needs attention" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['all', 'success', 'info', 'warn', 'error'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs capitalize transition-colors ${
              filter === f ? 'bg-foreground text-background' : 'border border-border/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {logs === null && <p className="text-sm text-muted-foreground">Reading logs…</p>}
        {shown.map((l) => (
          <div key={l.id} className="rounded-xl border border-border/60 bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${tone[l.level]}`}>{l.level}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{l.message}</p>
              {l.detail && <p className="text-xs text-muted-foreground mt-0.5">{l.detail}</p>}
              {l.auto_action && <p className="text-xs text-emerald-500 mt-1">Auto-action · {l.auto_action}</p>}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{l.agent_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}