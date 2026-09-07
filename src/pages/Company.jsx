import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Activity, Users, CheckCircle2, Clock, AlertCircle, Zap, Calendar, MessageSquare, TrendingUp, Rocket } from 'lucide-react';
import AgentActivityGrid from '@/components/company/AgentActivityGrid';
import PhaseProgress from '@/components/company/PhaseProgress';
import TaskFeed from '@/components/company/TaskFeed';
import OrchestratorControls from '@/components/company/OrchestratorControls';
import { cn } from '@/lib/utils';

export default function Company() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('companyOrchestrator', { action: 'status' });
      setStatus(res?.data || res);
    } catch (e) {
      console.error('Failed to load company status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 15 seconds for live updates
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Realtime subscription for schedule updates
  useEffect(() => {
    const unsub = base44.entities.AgentSchedule.subscribe(() => {
      load();
    });
    return unsub;
  }, [load]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('companyOrchestrator', { action });
      if (action === 'bootstrap' || action === 'trigger' || action === 'schedule_calendar' || action === 'sync_tasks') {
        await load();
      }
      return res;
    } catch (e) {
      return { error: e.message };
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading company status...</div>;
  }

  const summary = status?.summary || {};
  const agents = status?.agents || [];
  const activeTasks = status?.active_tasks || [];
  const phases = status?.phases || {};

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-violet-500" />
            <h1 className="font-display text-2xl tracking-tight">The Company</h1>
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Autonomous 24/7 AI company — agents working as employees, scheduled via Google Calendar, paid by task completion</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <StatCard icon={Users} label="Agents" value={summary.total_agents || 0} sub={`${summary.active_agents || 0} active`} color="text-violet-500" />
        <StatCard icon={Activity} label="Working" value={summary.active_tasks || 0} sub="in progress" color="text-blue-500" />
        <StatCard icon={CheckCircle2} label="Completed" value={summary.completed_tasks || 0} sub="tasks done" color="text-emerald-500" />
        <StatCard icon={Clock} label="Scheduled" value={summary.scheduled_tasks || 0} sub="queued" color="text-amber-500" />
        <StatCard icon={AlertCircle} label="Failed" value={summary.failed_tasks || 0} sub="need attention" color="text-red-500" />
        <StatCard icon={Zap} label="Capabilities" value={`${summary.capabilities_enabled || 0}/${summary.capabilities_total || 0}`} sub="enabled" color="text-cyan-500" />
      </div>

      {/* Orchestrator Controls */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Orchestrator Controls</h3>
        </div>
        <OrchestratorControls onAction={handleAction} loading={actionLoading} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Agent Activity Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Users className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Agent Activity</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {agents.filter(a => a.in_progress > 0).length} working · {agents.filter(a => a.completed > 0).length} have completed tasks
              </span>
            </div>
            <AgentActivityGrid agents={agents} activeTasks={activeTasks} />
          </div>

          {/* Active Tasks Detail */}
          {activeTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Activity className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold">Currently Working</h3>
              </div>
              <div className="space-y-1.5">
                {activeTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
                    <div className="h-8 w-8 rounded-md bg-blue-500/10 grid place-items-center shrink-0">
                      <span className="text-[10px] font-mono font-bold text-blue-500">
                        {t.agent.split('-').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.agent} → {t.task}</p>
                      <p className="text-[10px] text-muted-foreground">{t.phase?.replace(/_/g, ' ')} · {t.system}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-blue-500 font-mono">{t.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Phase Progress + Task Feed */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Playbook Phases</h3>
            </div>
            <PhaseProgress phases={phases} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Clock className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Live Task Feed</h3>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-2">
              <TaskFeed tasks={status?.recent_tasks || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold">{value}</span>
        {sub && <span className="text-[9px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}