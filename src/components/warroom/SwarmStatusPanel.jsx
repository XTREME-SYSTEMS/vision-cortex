import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Loader2, Activity, Zap, Clock, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';

export default function SwarmStatusPanel() {
  const [agents, setAgents] = useState(null);
  const [loopRuns, setLoopRuns] = useState(null);
  const [latestGap, setLatestGap] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [agentList, logs] = await Promise.all([
      base44.entities.AgentProfile.list('order', 60).catch(() => []),
      base44.entities.AgentLog.list('-created_date', 100).catch(() => []),
    ]);
    setAgents(agentList);

    // Filter for AGI self-builder loop entries
    const builderLogs = logs.filter((l) => l.category === 'agi_self_builder' || l.agent_name === 'PRIMUS' && l.category === 'orchestration');
    setLoopRuns(builderLogs.slice(0, 12));

    // Find the latest gap dispatch
    const gapLog = logs.find((l) => l.message?.includes('Dispatched') || l.message?.includes('gap'));
    setLatestGap(gapLog || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub1 = base44.entities.AgentProfile.subscribe(() => load());
    const unsub2 = base44.entities.AgentLog.subscribe(() => load());
    return () => { unsub1?.(); unsub2?.(); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading swarm status…
      </div>
    );
  }

  const activeAgents = (agents || []).filter((a) => a.status === 'active' || a.tasks_completed > 0);
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const recentLoop = loopRuns?.[0];
  const loopActive = recentLoop && new Date(recentLoop.created_date) > fiveMinAgo;

  // Compute loop timing intervals
  const intervals = [];
  if (loopRuns && loopRuns.length > 1) {
    for (let i = 0; i < loopRuns.length - 1; i++) {
      const d1 = new Date(loopRuns[i].created_date).getTime();
      const d2 = new Date(loopRuns[i + 1].created_date).getTime();
      intervals.push(Math.round((d1 - d2) / 1000));
    }
  }
  const avgInterval = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0;

  return (
    <div className="space-y-4">
      {/* Loop status header */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', loopActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40')} />
            <h3 className="text-sm font-semibold">5-Minute Autonomous Loop</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {loopActive ? 'Running' : 'Idle'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{avgInterval || 300}s avg</span>
          </div>
        </div>
        {loopRuns && loopRuns.length > 0 && (
          <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
            {loopRuns.slice(0, 8).map((r, i) => {
              const isErr = r.level === 'error' || r.level === 'warn';
              return (
                <div key={r.id} className="flex items-start gap-2 text-xs">
                  {isErr ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground leading-tight truncate">{r.message}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent status grid */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Swarm Agents — Live Status</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">{activeAgents.length} active</span>
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeAgents.map((a) => {
            const isRunning = a.last_run && (now.getTime() - new Date(a.last_run).getTime()) < 10 * 60 * 1000;
            return (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <div className={cn('w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0', isRunning ? 'bg-emerald-500 text-white' : 'bg-muted text-foreground')}>
                  {a.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium truncate">{a.name}</p>
                    {isRunning && <span className="text-[9px] text-emerald-500 font-medium animate-pulse">● live</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{a.mission || a.role || 'Operating'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">{a.tasks_completed || 0} tasks</p>
                  <p className={cn('text-[10px] font-mono', (a.health || 0) >= 100 ? 'text-emerald-500' : 'text-muted-foreground')}>{Math.min(a.health || 0, 100)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}