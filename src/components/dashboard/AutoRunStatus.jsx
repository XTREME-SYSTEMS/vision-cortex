import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Activity, Loader2, Radio, Zap, Brain, Globe, Wrench, RefreshCw } from 'lucide-react';

const AGENT_ICONS = {
  vision: Brain, shadow: Zap, quant: Activity, council: Radio,
  browser: Globe, builder: Wrench,
};

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function AutoRunStatus() {
  const [logs, setLogs] = useState(null);
  const [actions, setActions] = useState(null);
  const [systems, setSystems] = useState(null);
  const [pulse, setPulse] = useState(0);

  const load = async () => {
    const [l, a, s] = await Promise.all([
      base44.entities.AgentLog.list('-created_date', 15).catch(() => []),
      base44.entities.SystemDNA_Action.filter({ status: 'in_progress' }, '-updated_date', 10).catch(() => []),
      base44.entities.SystemDNA_System.list('category', 10).catch(() => []),
    ]);
    setLogs(l || []);
    setActions(a || []);
    setSystems(s || []);
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
      setPulse((p) => p + 1);
    }, 8000); // refresh every 8s for near-real-time
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription for instant updates
  useEffect(() => {
    const unsub = base44.entities.AgentLog.subscribe(() => load());
    return unsub;
  }, []);

  const activeCount = actions?.length || 0;
  const overallScore = systems?.length
    ? Math.round(systems.reduce((a, s) => a + (s.current_score || 0), 0) / systems.length)
    : 0;

  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Radio className="w-4 h-4 text-emerald-500" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <h3 className="text-sm font-medium">Auto-Run Status</h3>
        <span className="text-xs text-muted-foreground">— live agent activity (refreshes every 8s)</span>
        <RefreshCw className="w-3 h-3 ml-auto text-muted-foreground animate-spin-slow" style={{ animationDuration: '3s' }} />
      </div>

      {/* Live status row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</span>
          </div>
          <p className="text-xl font-bold text-emerald-500">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground">actions processing</p>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">System Score</span>
          </div>
          <p className="text-xl font-bold">{overallScore}</p>
          <p className="text-[10px] text-muted-foreground">avg verified</p>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Radio className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Loop</span>
          </div>
          <p className="text-xl font-bold text-sky-500">LIVE</p>
          <p className="text-[10px] text-muted-foreground">DNA loop 24/7</p>
        </div>
      </div>

      {/* Live activity feed */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto no-scrollbar">
        {logs === null ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No agent activity yet. The autonomous loop runs every 30 min.</p>
        ) : (
          logs.map((log) => {
            const Icon = AGENT_ICONS[log.agent_name?.toLowerCase()] || Activity;
            const levelColor = {
              success: 'text-emerald-500',
              info: 'text-sky-500',
              warn: 'text-amber-500',
              error: 'text-rose-500',
            }[log.level] || 'text-muted-foreground';
            return (
              <div key={log.id} className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5 hover:bg-muted/30 transition-colors">
                <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', levelColor)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{log.agent_name || 'system'}</span>
                    {log.auto_action && <Badge variant="outline" className="text-[8px] px-1 py-0">{log.auto_action}</Badge>}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{timeAgo(log.created_date)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active actions */}
      {actions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">In Progress</p>
          <div className="space-y-1.5">
            {actions.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-500 shrink-0" />
                <span className="truncate flex-1">{a.objective}</span>
                <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{a.priority}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}