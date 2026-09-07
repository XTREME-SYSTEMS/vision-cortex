import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Clock, Play, Square, RefreshCw, DollarSign, Loader2, Timer, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TimeclockDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('timeclockManager', { action: 'status' });
      setStatus(res);
    } catch (e) {
      console.error('Timeclock status failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const handleAction = async (action, extra = {}) => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('timeclockManager', { action, ...extra });
      setResult(res);
      await load();
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading timeclock...</div>;
  }

  const activeEntries = status?.active_entries || [];
  const agentBreakdown = status?.agent_breakdown || [];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <StatCard icon={Clock} label="Active" value={status?.active_count || 0} color="text-blue-500" />
        <StatCard icon={CheckCircle2} label="Completed" value={status?.completed_entries || 0} color="text-emerald-500" />
        <StatCard icon={Timer} label="Hours" value={status?.total_hours || 0} color="text-cyan-500" />
        <StatCard icon={DollarSign} label="INF Paid" value={status?.total_inf_payments || 0} color="text-violet-500" />
        <StatCard icon={AlertCircle} label="Unpaid" value={status?.unpaid_count || 0} color="text-amber-500" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleAction('sync_from_tasks')}
          disabled={actionLoading}
          className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sync from Google Tasks
        </button>
        <button
          onClick={() => handleAction('clock_in_scheduled')}
          disabled={actionLoading}
          className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Clock In Scheduled
        </button>
        <button
          onClick={() => handleAction('process_payments')}
          disabled={actionLoading}
          className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
          Process Payments
        </button>
      </div>

      {result && (
        <div className={cn(
          'rounded-md border p-2.5 text-xs',
          result.error ? 'border-red-500/30 bg-red-500/5 text-red-500' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600'
        )}>
          {result.error ? (
            <span>Error: {result.error}</span>
          ) : (
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}

      {/* Active Entries */}
      <div>
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          Active Time Entries ({activeEntries.length})
        </h4>
        {activeEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active time entries. Clock in agents to begin tracking.</p>
        ) : (
          <div className="space-y-1.5">
            {activeEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
                <div className="h-8 w-8 rounded-md bg-blue-500/10 grid place-items-center shrink-0">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{entry.agent_name}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.task_type} · since {new Date(entry.clock_in).toLocaleTimeString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.google_task_id ? (
                    <span className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> GTask
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">No GTask</span>
                  )}
                  <button
                    onClick={() => handleAction('clock_out', { entry_id: entry.id })}
                    disabled={actionLoading}
                    className="flex items-center gap-1 h-7 px-2 text-[10px] rounded-md border border-border hover:bg-accent transition-colors"
                  >
                    <Square className="w-3 h-3" /> Clock Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Breakdown */}
      <div>
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-violet-500" />
          Agent Time & Payments
        </h4>
        {agentBreakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No completed time entries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border/40">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Agent</th>
                  <th className="px-3 py-2 font-medium text-right">Entries</th>
                  <th className="px-3 py-2 font-medium text-right">Hours</th>
                  <th className="px-3 py-2 font-medium text-right">INF Earned</th>
                  <th className="px-3 py-2 font-medium text-right">Unpaid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {agentBreakdown
                  .sort((a, b) => (b.inf_earned || 0) - (a.inf_earned || 0))
                  .map((agent, i) => (
                    <tr key={i} className="hover:bg-muted/10">
                      <td className="px-3 py-2 font-medium">{agent.agent_name}</td>
                      <td className="px-3 py-2 text-right font-mono">{agent.entries}</td>
                      <td className="px-3 py-2 text-right font-mono">{agent.hours}</td>
                      <td className="px-3 py-2 text-right font-mono text-violet-500">{agent.inf_earned || 0}</td>
                      <td className="px-3 py-2 text-right">
                        {agent.unpaid_entries > 0 ? (
                          <span className="text-amber-500 font-mono">{agent.unpaid_entries}</span>
                        ) : (
                          <span className="text-emerald-500">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}