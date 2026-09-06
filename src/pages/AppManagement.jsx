import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Rocket, ShieldCheck, Gauge, Server, Database, Layers } from 'lucide-react';
import AccountCard from '@/components/management/AccountCard';
import DataLifecycleBar from '@/components/management/DataLifecycleBar';
import AppCard from '@/components/management/AppCard';
import OnboardAppForm from '@/components/management/OnboardAppForm';

export default function AppManagement() {
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState('');
  const [masterRunning, setMasterRunning] = useState(false);

  // Fast: load managed apps list directly
  const loadApps = useCallback(async () => {
    setAppsLoading(true);
    try {
      const list = await base44.entities.MonitoredSite.list('-updated_date', 50);
      setApps(list || []);
    } catch (e) {
      setError(e.message || 'Failed to load apps');
    } finally {
      setAppsLoading(false);
    }
  }, []);

  // Slow: full system audit (accounts + lifecycle)
  const runAudit = useCallback(async () => {
    setAuditLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('appManagementSync', {});
      setReport(res);
    } catch (e) {
      setError(e.message || 'Audit failed');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const triggerMasterLoop = useCallback(async () => {
    setMasterRunning(true);
    try {
      await base44.functions.invoke('masterAutonomousCycle', {});
      await Promise.all([runAudit(), loadApps()]);
    } catch (e) {
      setError(e.message || 'Master loop failed');
    } finally {
      setMasterRunning(false);
    }
  }, [runAudit, loadApps]);

  // On mount: load apps fast, kick off audit in background
  useEffect(() => {
    loadApps();
    runAudit();
  }, [loadApps, runAudit]);

  const verdictColor = report?.verdict === 'GO' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : report?.verdict === 'CAUTION' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    : 'text-red-500 bg-red-500/10 border-red-500/30';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-display font-semibold flex items-center gap-2">
            <Server className="w-5 h-5" /> App Management
          </h1>
          <p className="text-sm text-muted-foreground">Command center for all connected apps, accounts & data lifecycle</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runAudit} disabled={auditLoading}>
            {auditLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Run Audit
          </Button>
          <Button size="sm" onClick={triggerMasterLoop} disabled={masterRunning}>
            {masterRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Rocket className="w-4 h-4 mr-1.5" />}
            Master Loop
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {/* Onboard form — always visible, always usable */}
      <OnboardAppForm onOnboarded={loadApps} />

      {/* Managed Apps — loads instantly, refreshes immediately after onboarding */}
      <div>
        <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Managed Apps
          <span className="text-[11px] text-muted-foreground font-normal">({apps.length})</span>
          {appsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </h2>
        {apps.length === 0 && !appsLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed border-border/60">
            No apps yet. Onboard your first app above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      {/* Full audit results — loads in background, shows when ready */}
      {auditLoading && !report ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Running full system audit (accounts + data lifecycle)...
        </div>
      ) : report && report.lifecycle ? (
        <>
          {/* Verdict banner */}
          <div className={`rounded-xl border p-4 flex items-center justify-between ${verdictColor}`}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8" />
              <div>
                <div className="text-2xl font-mono font-bold">{report.overall_score}/100</div>
                <div className="text-xs opacity-80">Data Lifecycle Score</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{report.verdict}</div>
              <div className="text-xs opacity-80">{(report.lifecycle || []).filter(d => d.status === 'healthy').length} healthy / {(report.lifecycle || []).length} dimensions</div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Layers className="w-3.5 h-3.5" /><span className="text-[11px]">Managed Apps</span>
              </div>
              <div className="text-xl font-mono font-bold">{report.app_count}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Gauge className="w-3.5 h-3.5" /><span className="text-[11px]">Systems</span>
              </div>
              <div className="text-xl font-mono font-bold">{report.system_count}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Server className="w-3.5 h-3.5" /><span className="text-[11px]">Accounts</span>
              </div>
              <div className="text-xl font-mono font-bold">{report.connected_accounts}/{report.total_accounts}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Database className="w-3.5 h-3.5" /><span className="text-[11px]">Account Health</span>
              </div>
              <div className="text-xl font-mono font-bold">{report.account_health}%</div>
            </div>
          </div>

          {/* Connected Accounts */}
          <div>
            <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-2">
              <Server className="w-4 h-4" /> Connected Accounts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {report.accounts.map((acc) => (
                <AccountCard key={acc.account_type} account={acc} />
              ))}
            </div>
          </div>

          {/* Data Lifecycle Scores */}
          <div>
            <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-2">
              <Gauge className="w-4 h-4" /> Data Lifecycle Audit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {report.lifecycle.map((d) => (
                <DataLifecycleBar key={d.dimension} dimension={d} />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}