import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, CheckCircle2, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Credit-Free Loop Panel — reads the autonomous loop state directly from
// Supabase. Zero Base44 credits consumed. Shows the Vercel-cron-driven loop
// that runs on Groq + Supabase instead of Base44 workflows + InvokeLLM.

let _sb = null;
function getSupabase() {
  if (_sb) return _sb;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

export default function CreditFreeLoopPanel() {
  const [state, setState] = useState(null);
  const [runs, setRuns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setError('Supabase not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [s, r, l] = await Promise.all([
          sb.from('loop_state').select('*').eq('id', 1).single(),
          sb.from('deep_runs').select('*').order('created_at', { ascending: false }).limit(5),
          sb.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(8),
        ]);
        setState(s.data);
        setRuns(r.data || []);
        setLogs(l.data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading credit-free loop…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm text-amber-600 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Credit-free loop not connected</p>
          <p className="text-xs mt-0.5 text-muted-foreground">{error}</p>
          <p className="text-xs mt-1">Run <code className="text-[10px] bg-muted px-1 rounded">supabase/autonomous_loop.sql</code> in Supabase and set <code className="text-[10px] bg-muted px-1 rounded">VITE_SUPABASE_URL</code> + <code className="text-[10px] bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code> env vars.</p>
        </div>
      </div>
    );
  }

  const totalCycles = state?.total_cycles || 0;
  const totalApproved = state?.total_approved || 0;
  const avgScore = state?.avg_score || 0;
  const lastScore = state?.last_score || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">Credit-Free Loop</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Vercel Cron → Supabase → Groq</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Cycles" value={totalCycles} />
        <Stat label="Approved" value={totalApproved} accent="emerald" />
        <Stat label="Avg Score" value={`${avgScore.toFixed(2)}`} />
        <Stat label="Last" value={`${(lastScore * 100).toFixed(0)}%`} accent={lastScore >= 0.7 ? 'emerald' : 'amber'} />
      </div>

      {state?.last_task_title && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-muted/50 border border-border/40">
          <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="truncate">Last: {state.last_task_title}</span>
          <span className="text-muted-foreground ml-auto shrink-0">
            {state.last_cycle_at ? new Date(state.last_cycle_at).toLocaleTimeString() : ''}
          </span>
        </div>
      )}

      {runs.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Recent Runs</p>
          {runs.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/30">
              {r.is_approved ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              )}
              <span className="truncate font-mono text-[10px]">{r.run_id}</span>
              <span className="ml-auto text-muted-foreground shrink-0">{(r.aggregate_score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Activity</p>
          {logs.slice(0, 4).map((l) => (
            <div key={l.id} className="text-[11px] px-2.5 py-1 rounded text-muted-foreground truncate">
              <span className={cn(
                'font-medium',
                l.level === 'success' && 'text-emerald-600',
                l.level === 'warn' && 'text-amber-600',
                l.level === 'error' && 'text-destructive',
              )}>
                {l.agent_name}
              </span>
              {' · '}
              {l.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        'text-lg font-semibold tabular-nums',
        accent === 'emerald' && 'text-emerald-600',
        accent === 'amber' && 'text-amber-600',
      )}>{value}</p>
    </div>
  );
}