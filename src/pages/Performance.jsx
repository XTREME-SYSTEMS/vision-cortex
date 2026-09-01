import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Activity, CheckCircle2, AlertTriangle, Radio, Loader2, Heart, TrendingUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SYSTEM_LABEL = {
  'SYS-000001': 'Vision Cortex',
  'SYS-000002': 'Cloud Browser',
  'SYS-000003': 'Auto Builder',
};

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function Performance() {
  const [systems, setSystems] = useState(null);
  const [logs, setLogs] = useState(null);
  const [agents, setAgents] = useState(null);
  const [gaps, setGaps] = useState(null);

  const load = async () => {
    const [s, l, a, g] = await Promise.all([
      base44.entities.SystemDNA_System.list('category', 10).catch(() => []),
      base44.entities.AgentLog.list('-created_date', 50).catch(() => []),
      base44.entities.AgentProfile.list('order', 30).catch(() => []),
      base44.entities.SystemDNA_Gap.filter({ status: 'open' }, '-severity', 100).catch(() => []),
    ]);
    setSystems(s || []);
    setLogs(l || []);
    setAgents(a || []);
    setGaps(g || []);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.AgentLog.subscribe(() => load());
    return unsub;
  }, []);

  // Agent success rates
  const agentStats = useMemo(() => {
    if (!logs || !agents) return [];
    return agents.map((agent) => {
      const agentLogs = logs.filter((l) => l.agent_name === agent.name);
      const success = agentLogs.filter((l) => l.level === 'success').length;
      const errors = agentLogs.filter((l) => l.level === 'error').length;
      const total = agentLogs.length || 1;
      return {
        name: agent.name,
        success: Math.round((success / total) * 100),
        errors,
        total: agentLogs.length,
        tasks: agent.tasks_completed || 0,
      };
    }).filter((a) => a.total > 0);
  }, [logs, agents]);

  const overallHealth = systems?.length
    ? Math.round(systems.reduce((a, s) => a + (s.current_score || 0), 0) / systems.length)
    : 0;

  const criticalGaps = (gaps || []).filter((g) => g.severity === 'P0' || g.is_blocking).length;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Performance · Real-Time Stack Status</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          The entire stack, at a glance.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Live health metrics, agent success rates, and system activity — updating in real-time.
        </p>
      </div>

      {/* Stack health overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stack Health</span>
          </div>
          <p className={cn('text-3xl font-bold', overallHealth >= 70 ? 'text-emerald-500' : overallHealth >= 50 ? 'text-amber-500' : 'text-rose-500')}>{overallHealth}</p>
          <p className="text-[10px] text-muted-foreground">avg verified score</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Critical Gaps</span>
          </div>
          <p className="text-3xl font-bold text-rose-500">{criticalGaps}</p>
          <p className="text-[10px] text-muted-foreground">blocking issues</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Agents</span>
          </div>
          <p className="text-3xl font-bold">{agents?.filter((a) => a.status === 'active').length || 0}</p>
          <p className="text-[10px] text-muted-foreground">of {agents?.length || 0} total</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Events (24h)</span>
          </div>
          <p className="text-3xl font-bold">{logs?.length || 0}</p>
          <p className="text-[10px] text-muted-foreground">log entries</p>
        </Card>
      </div>

      {/* System health cards */}
      <div>
        <h3 className="text-sm font-medium mb-3">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {systems?.map((sys) => {
            const score = sys.current_score || 0;
            const color = score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : score >= 25 ? 'text-orange-500' : 'text-rose-500';
            const barColor = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : score >= 25 ? 'bg-orange-500' : 'bg-rose-500';
            return (
              <Card key={sys.id} className="p-4 border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{SYSTEM_LABEL[sys.dna_id] || sys.name}</span>
                  <Badge variant="outline" className="text-[9px] capitalize">{sys.health_status}</Badge>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className={cn('text-3xl font-bold', color)}>{score}</span>
                  <span className="text-xs text-muted-foreground mb-1">/ {sys.north_star_score || 100}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
                  <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${score}%` }} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{sys.critical_gaps_count || 0} critical gaps</span>
                  <span>{sys.active_actions_count || 0} actions</span>
                  <span className="capitalize">{sys.validation_health}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Agent success rates chart */}
      {agentStats.length > 0 && (
        <Card className="p-5 border-border/60">
          <h3 className="text-sm font-medium mb-4">Agent Success Rates</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agentStats}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="success" name="Success %" radius={[4, 4, 0, 0]}>
                {agentStats.map((entry, i) => (
                  <Cell key={i} fill={entry.success >= 80 ? '#10b981' : entry.success >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Real-time activity log */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h3 className="text-sm font-medium">Live Activity Log</h3>
          <span className="text-xs text-muted-foreground">— real-time</span>
        </div>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto no-scrollbar">
          {logs === null ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No activity logged yet.</p>
          ) : (
            logs.map((log) => {
              const levelColor = {
                success: 'text-emerald-500',
                info: 'text-sky-500',
                warn: 'text-amber-500',
                error: 'text-rose-500',
              }[log.level] || 'text-muted-foreground';
              const Icon = log.level === 'error' ? AlertTriangle : log.level === 'success' ? CheckCircle2 : Activity;
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
      </Card>
    </div>
  );
}