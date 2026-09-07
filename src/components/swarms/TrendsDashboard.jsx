import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const CLUSTER_COLORS = {
  Leadership: '#a78bfa',
  Intelligence: '#22d3ee',
  Engineering: '#60a5fa',
  Security: '#f87171',
  Operations: '#fbbf24',
  Communications: '#34d399',
};

const CLUSTER_ARCHETYPES = {
  Leadership: ['THE CHIEF', 'THE PRIME'],
  Intelligence: ['THE ORACLE', 'THE SCOUT', 'THE SHADOW'],
  Engineering: ['THE ARCHITECT', 'THE FORGE', 'THE BUILDER', 'THE BRIDGE'],
  Security: ['THE INQUISITOR', 'THE SENTINEL', 'THE AEGIS', 'THE SIREN', 'THE VALIDATOR'],
  Operations: ['THE REAPER', 'THE BROKER', 'THE VIPER'],
  Communications: ['THE DIPLOMAT', 'THE PRESENCE', 'THE GROWTH'],
};

export default function TrendsDashboard({ agents }) {
  const [logs, setLogs] = useState(null);
  const [timeclock, setTimeclock] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [l, t] = await Promise.all([
        base44.entities.AgentLog.list('-created_date', 200).catch(() => []),
        base44.entities.TimeClockEntry.filter({ status: 'completed' }, '-created_date', 200).catch(() => []),
      ]);
      setLogs(l || []);
      setTimeclock(t || []);
    };
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  const clusterThroughput = useMemo(() => {
    if (!timeclock || !agents) return [];
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const days = [dayBefore, yesterday, today];

    return Object.entries(CLUSTER_ARCHETYPES).map(([cluster, archetypes]) => {
      const clusterAgentNames = agents.filter(a => archetypes.includes(a.archetype)).map(a => a.name);
      const dayCounts = days.map(day =>
        timeclock.filter(e => clusterAgentNames.includes(e.agent_name) && e.clock_out?.startsWith(day)).length
      );
      return {
        cluster,
        '2 days ago': dayCounts[0],
        yesterday: dayCounts[1],
        today: dayCounts[2],
        total: dayCounts.reduce((s, c) => s + c, 0),
      };
    });
  }, [timeclock, agents]);

  const clusterSuccessRates = useMemo(() => {
    if (!logs || !agents) return [];
    return Object.entries(CLUSTER_ARCHETYPES).map(([cluster, archetypes]) => {
      const clusterAgentNames = agents.filter(a => archetypes.includes(a.archetype)).map(a => a.name);
      const clusterLogs = logs.filter(l => clusterAgentNames.includes(l.agent_name));
      const success = clusterLogs.filter(l => l.level === 'success').length;
      const total = clusterLogs.length || 1;
      return { cluster, successRate: Math.round((success / total) * 100), total: clusterLogs.length };
    });
  }, [logs, agents]);

  if (clusterThroughput.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold">Performance Trends</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">3-day rolling window</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily throughput per cluster */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <h4 className="text-xs font-medium">Daily Throughput by Cluster</h4>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={clusterThroughput}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="cluster" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="2 days ago" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="yesterday" fill="#60a5fa" radius={[2, 2, 0, 0]} />
              <Bar dataKey="today" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cluster success rates */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-xs font-medium">Cluster Success Rates</h4>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={clusterSuccessRates} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="cluster" tick={{ fontSize: 9 }} width={80} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="successRate" name="Success %" radius={[0, 4, 4, 0]}>
                {clusterSuccessRates.map((entry, i) => (
                  <Cell key={i} fill={CLUSTER_COLORS[entry.cluster] || '#888'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cluster effectiveness comparison */}
      <div className="mt-3 rounded-xl border border-border/40 bg-card p-4">
        <h4 className="text-xs font-medium mb-3">Cluster Effectiveness Comparison</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {clusterThroughput.map(c => {
            const successData = clusterSuccessRates.find(s => s.cluster === c.cluster);
            const effectiveness = Math.round((c.total * (successData?.successRate || 0)) / 100);
            return (
              <div key={c.cluster} className="rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: CLUSTER_COLORS[c.cluster] }} />
                  <span className="text-[10px] font-medium truncate">{c.cluster}</span>
                </div>
                <p className="text-lg font-bold">{c.total}</p>
                <p className="text-[9px] text-muted-foreground">tasks (3d)</p>
                <div className="mt-1.5 pt-1.5 border-t border-border/30">
                  <p className="text-[10px] font-mono">{successData?.successRate || 0}% success</p>
                  <p className="text-[9px] text-muted-foreground">{effectiveness} effective</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}