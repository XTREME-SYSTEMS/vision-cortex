import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Radar, Loader2, Layers, Gauge, Bot, Wrench, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppGrid from '@/components/command/AppGrid';
import LoopPanel from '@/components/command/LoopPanel';
import EnhancementBoard from '@/components/command/EnhancementBoard';
import SystemScoreboard from '@/components/command/SystemScoreboard';
import AgentFeed from '@/components/command/AgentFeed';
import DailyBrief from '@/components/command/DailyBrief';

export default function CommandCenter() {
  const [apps, setApps] = useState([]);
  const [systems, setSystems] = useState([]);
  const [enhancements, setEnhancements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [lastLoopRun, setLastLoopRun] = useState(null);
  const [loopRunning, setLoopRunning] = useState(false);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefGeneratedAt, setBriefGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [siteList, systemList, enhList, logList] = await Promise.all([
        base44.entities.MonitoredSite.list('-updated_date', 30),
        base44.entities.SystemDNA_System.list('-updated_date', 20),
        base44.entities.SystemEnhancement.filter({ status: { $in: ['pending', 'in_progress'] } }, '-created_date', 40),
        base44.entities.AgentLog.list('-created_date', 25)
      ]);
      setApps(siteList || []);
      setSystems(systemList || []);
      setEnhancements(enhList || []);
      setLogs(logList || []);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const runLoop = useCallback(async () => {
    setLoopRunning(true);
    try {
      const res = await base44.functions.invoke('masterAutonomousCycle', {});
      setLastLoopRun(res);
      await loadAll();
    } catch (e) {
      console.error('Loop error:', e);
      setLastLoopRun({ error: e.message, timestamp: new Date().toISOString() });
    } finally {
      setLoopRunning(false);
    }
  }, [loadAll]);

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const res = await base44.functions.invoke('generateDailyBrief', {});
      setBrief(res.brief);
      setBriefGeneratedAt(res.generated_at);
    } catch (e) {
      console.error('Brief error:', e);
    } finally {
      setBriefLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Auto-generate brief on first load
    generateBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute overall health
  const allScores = [...apps.map(a => a.audit_score || 0), ...systems.map(s => s.current_score || 0)];
  const overallHealth = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const healthyApps = apps.filter(a => (a.audit_score || 0) >= 80).length;
  const criticalApps = apps.filter(a => a.critical_issues_count > 0).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-display font-semibold flex items-center gap-2">
            <Radar className="w-5 h-5" /> Vision Cortex Command Center
          </h1>
          <p className="text-sm text-muted-foreground">Autonomous management of all apps, agents & systems — running 24/7</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Top stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-3.5">
          <div className="text-[11px] text-muted-foreground mb-1">Overall Health</div>
          <div className={cn('text-2xl font-mono font-bold', overallHealth >= 80 ? 'text-emerald-500' : overallHealth >= 60 ? 'text-sky-500' : overallHealth >= 40 ? 'text-amber-500' : 'text-red-500')}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${overallHealth}%`}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5">
          <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Managed Apps</div>
          <div className="text-2xl font-mono font-bold">{loading ? '…' : apps.length}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5">
          <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1"><Gauge className="w-3 h-3" /> Healthy</div>
          <div className="text-2xl font-mono font-bold text-emerald-500">{loading ? '…' : healthyApps}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5">
          <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> Enhancements</div>
          <div className="text-2xl font-mono font-bold text-amber-500">{loading ? '…' : enhancements.length}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5">
          <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1"><Bot className="w-3 h-3" /> Critical</div>
          <div className="text-2xl font-mono font-bold text-red-500">{loading ? '…' : criticalApps}</div>
        </div>
      </div>

      {/* Daily Brief */}
      <DailyBrief brief={brief} loading={briefLoading} onGenerate={generateBrief} lastGenerated={briefGeneratedAt} />

      {/* Master Loop Panel */}
      <LoopPanel running={loopRunning} lastRun={lastLoopRun} onRun={runLoop} />

      {/* Managed Apps Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Managed Apps
          <span className="text-[11px] text-muted-foreground font-normal">— click any app to open it</span>
        </h2>
        <AppGrid apps={apps} loading={loading} />
      </div>

      {/* Enhancement Board + System Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnhancementBoard enhancements={enhancements} />
        <SystemScoreboard systems={systems} />
      </div>

      {/* Agent Activity */}
      <AgentFeed logs={logs} />
    </div>
  );
}