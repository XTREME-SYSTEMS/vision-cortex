import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { ClipboardList, ScanLine, Clock, Loader2, RefreshCw, Database, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import TaskRegistryTable from '@/components/registry/TaskRegistryTable';
import ScannerResults from '@/components/registry/ScannerResults';
import TimeclockDashboard from '@/components/registry/TimeclockDashboard';

const TABS = [
  { id: 'registry', label: 'Task Registry', icon: ClipboardList },
  { id: 'scanner', label: 'System Scan', icon: ScanLine },
  { id: 'timeclock', label: 'Timeclock', icon: Clock },
];

export default function SystemRegistry() {
  const [tab, setTab] = useState('registry');
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [scan, setScan] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await base44.entities.SystemTaskRegistry.list('-created_date', 200);
      setTasks(data);
    } catch (e) {
      console.error('Failed to load task registry:', e);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const data = await base44.entities.AgentProfile.list('-order', 100);
      setAgents(data);
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadAgents();
  }, [loadTasks, loadAgents]);

  // Realtime subscription
  useEffect(() => {
    const unsub = base44.entities.SystemTaskRegistry.subscribe(() => loadTasks());
    return unsub;
  }, [loadTasks]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke('systemScanner', { mode: 'full' });
      setScan(res);
      setTab('scanner');
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setScanning(false);
    }
  };

  const seedRegistry = async () => {
    setSeeding(true);
    try {
      const res = await base44.functions.invoke('systemScanner', { mode: 'seed' });
      setSeedResult(res);
      await loadTasks();
    } catch (e) {
      setSeedResult({ error: e.message });
    } finally {
      setSeeding(false);
    }
  };

  const healthScore = scan?.health_score;
  const totalTasks = tasks.length;
  const assignedTasks = tasks.filter(t => t.status === 'active' && t.assigned_agent).length;
  const unassignedTasks = tasks.filter(t => !t.assigned_agent || t.status === 'unassigned').length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <h1 className="font-display text-2xl tracking-tight">System Registry</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Master task registry — every system operation mapped to a specific agent, tracked via Google Tasks & Calendar
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalTasks === 0 && (
            <button
              onClick={seedRegistry}
              disabled={seeding}
              className="flex items-center gap-1.5 h-9 px-3 text-xs rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Seed Registry
            </button>
          )}
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 h-9 px-4 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
            Scan System
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <StatCard
          icon={ClipboardList}
          label="Total Tasks"
          value={totalTasks}
          sub={`${assignedTasks} assigned`}
          color="text-blue-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Unassigned"
          value={unassignedTasks}
          sub={unassignedTasks > 0 ? 'needs attention' : 'all covered'}
          color={unassignedTasks > 0 ? 'text-red-500' : 'text-emerald-500'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Coverage"
          value={totalTasks > 0 ? `${Math.round((assignedTasks / totalTasks) * 100)}%` : '—'}
          color="text-emerald-500"
        />
        <StatCard
          icon={Zap}
          label="Health"
          value={healthScore != null ? healthScore : '—'}
          sub={healthScore != null ? (healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : 'needs work') : 'run scan'}
          color={healthScore >= 90 ? 'text-emerald-500' : healthScore >= 70 ? 'text-amber-500' : 'text-red-500'}
        />
        <StatCard
          icon={RefreshCw}
          label="Last Scan"
          value={scan?.timestamp ? new Date(scan.timestamp).toLocaleTimeString() : '—'}
          sub={scan?.timestamp ? new Date(scan.timestamp).toLocaleDateString() : 'not scanned'}
          color="text-muted-foreground"
        />
      </div>

      {/* Seed Result */}
      {seedResult && (
        <div className={cn(
          'rounded-md border p-2.5 text-xs',
          seedResult.error ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
        )}>
          {seedResult.error ? (
            <span className="text-red-500">Error: {seedResult.error}</span>
          ) : (
            <span className="text-emerald-600">
              Seeded {seedResult.total_seeded || seedResult.created || 0} task types. All system operations are now registered.
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
                active
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'registry' && (
          loadingTasks ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading task registry...</div>
          ) : (
            <TaskRegistryTable tasks={tasks} agents={agents} />
          )
        )}
        {tab === 'scanner' && (
          <ScannerResults scan={scan} loading={scanning} />
        )}
        {tab === 'timeclock' && (
          <TimeclockDashboard />
        )}
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