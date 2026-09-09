import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Clock, CheckCircle2, AlertTriangle, Activity, Cpu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, AreaChart, Area,
} from 'recharts';

export default function SwarmPerformance() {
  const [agents, setAgents] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [a, l] = await Promise.all([
        base44.entities.AgentProfile.list('order', 100).catch(() => []),
        base44.entities.AgentLog.list('-created_date', 200).catch(() => []),
      ]);
      setAgents(a);
      setLogs(l);
      setLoading(false);
    };
    load();
    const unsub = base44.entities.AgentLog.subscribe(() => load());
    return unsub;
  }, []);

  // Task completion per agent (bar chart)
  const taskData = useMemo(() => {
    if (!agents) return [];
    return agents
      .filter((a) => a.tasks_completed > 0)
      .map((a) => ({ name: a.name?.slice(0, 12), tasks: a.tasks_completed || 0, health: Math.min(a.health || 0, 100) }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 15);
  }, [agents]);

  // Error logs over time (by hour, last 24h)
  const errorData = useMemo(() => {
    if (!logs) return [];
    const now = new Date();
    const buckets = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = d.toLocaleString('en-US', { hour: 'numeric' });
      buckets[key] = { hour: key, errors: 0, success: 0, info: 0 };
    }
    for (const log of logs) {
      const d = new Date(log.created_date);
      const hoursAgo = (now.getTime() - d.getTime()) / (60 * 60 * 1000);
      if (hoursAgo > 24) continue;
      const key = d.toLocaleString('en-US', { hour: 'numeric' });
      if (!buckets[key]) continue;
      if (log.level === 'error') buckets[key].errors++;
      else if (log.level === 'success') buckets[key].success++;
      else buckets[key].info++;
    }
    return Object.values(buckets);
  }, [logs]);

  // 5-minute loop timing (intervals between agi_self_builder logs)
  const loopTimingData = useMemo(() => {
    if (!logs) return [];
    const builderLogs = logs
      .filter((l) => l.category === 'agi_self_builder')
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .slice(-20);
    const data = [];
    for (let i = 1; i < builderLogs.length; i++) {
      const d1 = new Date(builderLogs[i].created_date).getTime();
      const d2 = new Date(builderLogs[i - 1].created_date).getTime();
      const interval = Math.round((d1 - d2) / 1000);
      data.push({
        run: `#${i}`,
        interval,
        time: new Date(builderLogs[i].created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
    }
    return data;
  }, [logs]);

  // Summary stats
  const stats = useMemo(() => {
    if (!logs || !agents) return null;
    const last24h = logs.filter((l) => new Date(l.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000));
    const errors = last24h.filter((l) => l.level === 'error').length;
    const successes = last24h.filter((l) => l.level === 'success').length;
    const totalTasks = agents.reduce((s, a) => s + (a.tasks_completed || 0), 0);
    const activeCount = agents.filter((a) => a.status === 'active').length;
    const avgInterval = loopTimingData.length ? Math.round(loopTimingData.reduce((s, d) => s + d.interval, 0) / loopTimingData.length) : 0;
    return { errors, successes, totalTasks, activeCount, avgInterval, totalLogs: last24h.length };
  }, [logs, agents, loopTimingData]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading performance metrics…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Swarm Performance</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Agent metrics & autonomous loop telemetry.</h1>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1"><Cpu className="w-3 h-3" /> Active Agents</div>
            <p className="text-2xl font-mono font-semibold">{stats.activeCount}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1"><CheckCircle2 className="w-3 h-3" /> Tasks Done</div>
            <p className="text-2xl font-mono font-semibold">{stats.totalTasks}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1"><Activity className="w-3 h-3" /> 24h Events</div>
            <p className="text-2xl font-mono font-semibold">{stats.totalLogs}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1"><AlertTriangle className="w-3 h-3" /> 24h Errors</div>
            <p className={cn('text-2xl font-mono font-semibold', stats.errors > 0 ? 'text-rose-500' : 'text-emerald-500')}>{stats.errors}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1"><Zap className="w-3 h-3" /> Loop Interval</div>
            <p className="text-2xl font-mono font-semibold">{stats.avgInterval}s</p>
          </div>
        </div>
      )}

      {/* Loop timing chart */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">5-Minute Autonomous Loop — Interval Timing</h3>
        </div>
        {loopTimingData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={loopTimingData}>
              <defs>
                <linearGradient id="loopGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="run" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="s" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
              <Area type="monotone" dataKey="interval" stroke="hsl(var(--chart-1))" fill="url(#loopGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No loop runs recorded yet.</p>
        )}
      </div>

      {/* Task completion + error logs side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Task Completion by Agent</h3>
          </div>
          {taskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={taskData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Bar dataKey="tasks" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No task data yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Event Log — Last 24 Hours</h3>
          </div>
          {errorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={errorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="success" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Success" />
                <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Errors" />
                <Line type="monotone" dataKey="info" stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={false} name="Info" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No logs yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}