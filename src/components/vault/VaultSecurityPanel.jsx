import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Shield, ShieldCheck, ShieldAlert, Loader2, RefreshCw, AlertTriangle,
  Lock, Key, Activity, Cpu, Mail, Database, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VaultSecurityPanel() {
  const [scan, setScan] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes] = await Promise.all([
        base44.functions.invoke('vaultSecurity', { action: 'dashboard' }),
      ]);
      setDashboard(dashRes.stats);
    } catch (e) {
      console.error('Failed to load security dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke('vaultSecurity', { action: 'scan' });
      setScan(res);
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setScanning(false); }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading security dashboard...</div>;
  }

  const score = scan?.security_score ?? null;
  const findings = scan?.findings || [];
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;

  return (
    <div className="space-y-4">
      {/* Security Score */}
      <div className={cn(
        'rounded-xl border p-4',
        score === null ? 'border-border/40 bg-card' :
        score >= 80 ? 'border-emerald-500/30 bg-emerald-500/5' :
        score >= 50 ? 'border-amber-500/30 bg-amber-500/5' :
        'border-red-500/30 bg-red-500/5'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {score === null ? <Shield className="w-5 h-5" /> :
             score >= 80 ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> :
             <ShieldAlert className="w-5 h-5 text-amber-500" />}
            <h3 className="text-sm font-semibold">Security Posture</h3>
          </div>
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning} className="h-8 text-xs">
            {scanning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Run Scan
          </Button>
        </div>
        {score !== null ? (
          <>
            <div className="flex items-center gap-4">
              <div className={cn(
                'text-3xl font-bold',
                score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'
              )}>
                {score}<span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 text-xs">
                  {criticalCount > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertTriangle className="w-3.5 h-3.5" /> {criticalCount} critical
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5" /> {warningCount} warnings
                    </span>
                  )}
                  {criticalCount === 0 && warningCount === 0 && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <ShieldCheck className="w-3.5 h-3.5" /> No issues found
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Findings */}
            {findings.length > 0 && (
              <div className="mt-3 space-y-2">
                {findings.map((f, i) => (
                  <div key={i} className={cn(
                    'rounded-lg border p-2.5',
                    f.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={cn('w-3.5 h-3.5', f.severity === 'critical' ? 'text-red-500' : 'text-amber-500')} />
                      <span className="text-xs font-medium">{f.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-1">{f.description}</p>
                    <p className="text-[10px] text-muted-foreground/70">→ {f.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Click "Run Scan" to check vault security, key rotation status, and capability risks.</p>
        )}
      </div>

      {/* Stats Grid */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <StatCard icon={Lock} label="Vault Entries" value={dashboard.vault_entries || 0} color="text-violet-500" />
          <StatCard icon={Key} label="Active Keys" value={dashboard.api_keys_active || 0} sub={`${dashboard.api_keys_revoked || 0} revoked`} color="text-emerald-500" />
          <StatCard icon={Cpu} label="Capabilities" value={`${dashboard.capabilities_enabled || 0}/${dashboard.capabilities_total || 0}`} sub="enabled" color="text-amber-500" />
          <StatCard icon={Mail} label="Email Accounts" value={`${dashboard.emails_connected || 0}/${dashboard.emails_total || 0}`} sub="connected" color="text-indigo-500" />
        </div>
      )}

      {/* Recent Events */}
      {dashboard?.recent_events?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" />
            <h4 className="text-sm font-semibold">Recent Security Events</h4>
          </div>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="divide-y divide-border/20">
              {dashboard.recent_events.map((log, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    log.severity === 'critical' ? 'bg-red-500' :
                    log.severity === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <span className="font-medium w-32 truncate">{log.action?.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground flex-1 truncate">{log.details}</span>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {log.created_date ? new Date(log.created_date).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}