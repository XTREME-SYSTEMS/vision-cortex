import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, AlertTriangle, Activity, Database, Cpu, FileText, Globe, Zap, TrendingUp } from 'lucide-react';

const SEVERITY_STYLE = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
  warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle },
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: AlertCircle }
};

function HealthGauge({ score }) {
  const color = score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : score >= 50 ? 'text-orange-500' : 'text-red-500';
  const bgColor = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : score >= 50 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
          <circle
            cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
            className={color}
            strokeDasharray={`${(score / 100) * 94.2} 94.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className={cn('absolute inset-0 flex items-center justify-center text-sm font-bold', color)}>
          {score}
        </div>
      </div>
      <div>
        <div className={cn('text-sm font-semibold', color)}>System Health</div>
        <div className="text-[10px] text-muted-foreground">{score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs Attention' : 'Critical'}</div>
      </div>
    </div>
  );
}

function ScanSection({ icon: Icon, title, children, color = 'text-foreground' }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <h4 className="text-xs font-semibold">{title}</h4>
      </div>
      {children}
    </div>
  );
}

export default function ScannerResults({ scan, loading }) {
  if (loading && !scan) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Scanning system...</div>;
  }
  if (!scan) return null;

  const gaps = scan.gaps || [];
  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  const highGaps = gaps.filter(g => g.severity === 'high');

  return (
    <div className="space-y-4">
      {/* Health Score + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/40 bg-card p-3 flex items-center justify-center">
          <HealthGauge score={scan.health_score || 0} />
        </div>
        <div className="rounded-lg border border-border/40 bg-card p-3 grid grid-cols-2 gap-2">
          <Metric label="Entities" value={scan.entities?.active_entities || 0} sub={`${scan.entities?.total_records || 0} records`} />
          <Metric label="Agents" value={scan.agents?.total || 0} sub={`${scan.agents?.active || 0} active`} />
          <Metric label="Functions" value={scan.functions?.total_known || 0} />
          <Metric label="Pages" value={scan.pages?.total_known || 0} />
          <Metric label="Tasks" value={scan.task_registry?.total_tasks || 0} sub={`${scan.task_registry?.coverage_percent || 0}% covered`} />
          <Metric label="Clocks" value={scan.timeclock?.active_entries || 0} sub={`${scan.timeclock?.total_hours || 0}h logged`} />
        </div>
        <div className="rounded-lg border border-border/40 bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className={cn('w-3.5 h-3.5', criticalGaps.length > 0 ? 'text-red-500' : 'text-emerald-500')} />
            <h4 className="text-xs font-semibold">System Gaps ({gaps.length})</h4>
          </div>
          {gaps.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" /> No gaps detected — system is fully operational
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
              {gaps.map((gap, i) => {
                const style = SEVERITY_STYLE[gap.severity] || SEVERITY_STYLE.low;
                const GapIcon = style.icon;
                return (
                  <div key={i} className={cn('flex items-start gap-1.5 rounded-md border px-2 py-1 text-[10px]', style.bg, style.border)}>
                    <GapIcon className={cn('w-3 h-3 shrink-0 mt-0.5', style.color)} />
                    <div className="flex-1">
                      <span className={cn('font-medium', style.color)}>{gap.severity.toUpperCase()} · {gap.area}</span>
                      <p className="text-muted-foreground">{gap.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ScanSection icon={Activity} title="Agent Fleet" color="text-violet-500">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Stat label="Total" value={scan.agents?.total || 0} />
            <Stat label="Active" value={scan.agents?.active || 0} color="text-emerald-500" />
            <Stat label="Idle" value={scan.agents?.idle || 0} color="text-amber-500" />
            <Stat label="Error" value={scan.agents?.error || 0} color="text-red-500" />
            <Stat label="INF Earned" value={scan.agents?.total_inf_earned || 0} color="text-violet-500" />
            <Stat label="Tasks Done" value={scan.agents?.total_tasks_completed || 0} />
            <Stat label="Strikes" value={scan.agents?.agents_with_strikes || 0} color="text-orange-500" />
            <Stat label="Paused" value={scan.agents?.paused || 0} color="text-muted-foreground" />
          </div>
        </ScanSection>

        <ScanSection icon={Database} title="Task Registry" color="text-blue-500">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Stat label="Total Tasks" value={scan.task_registry?.total_tasks || 0} />
            <Stat label="Assigned" value={scan.task_registry?.assigned || 0} color="text-emerald-500" />
            <Stat label="Unassigned" value={scan.task_registry?.unassigned || 0} color="text-red-500" />
            <Stat label="Never Run" value={scan.task_registry?.never_run || 0} color="text-amber-500" />
            <Stat label="Failed" value={scan.task_registry?.failed_tasks || 0} color="text-red-500" />
            <Stat label="Coverage" value={`${scan.task_registry?.coverage_percent || 0}%`} color="text-blue-500" />
          </div>
          {scan.task_registry?.category_breakdown && Object.keys(scan.task_registry.category_breakdown).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(scan.task_registry.category_breakdown).map(([cat, count]) => (
                <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
                  {cat}: {count}
                </span>
              ))}
            </div>
          )}
        </ScanSection>

        <ScanSection icon={Cpu} title="Timeclock" color="text-cyan-500">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Stat label="Active" value={scan.timeclock?.active_entries || 0} color="text-blue-500" />
            <Stat label="Completed" value={scan.timeclock?.completed_entries || 0} color="text-emerald-500" />
            <Stat label="Hours Logged" value={scan.timeclock?.total_hours || 0} />
            <Stat label="INF Payments" value={scan.timeclock?.total_inf_payments || 0} color="text-violet-500" />
            <Stat label="Unpaid" value={scan.timeclock?.unpaid_count || 0} color="text-amber-500" />
          </div>
        </ScanSection>

        <ScanSection icon={FileText} title="Documents & DEEP" color="text-stone-500">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Stat label="Core Docs" value={scan.documents?.total || 0} />
            <Stat label="Active Docs" value={scan.documents?.active || 0} color="text-emerald-500" />
            <Stat label="Validation" value={scan.documents?.average_validation_score || 0} color="text-amber-500" />
            <Stat label="DEEP Specs" value={scan.deep?.total_specs || 0} />
            <Stat label="DEEP Runs" value={scan.deep?.total_runs || 0} />
            <Stat label="Approved" value={scan.deep?.approved_runs || 0} color="text-emerald-500" />
          </div>
        </ScanSection>

        <ScanSection icon={Globe} title="Monitored Sites" color="text-teal-500">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Stat label="Total" value={scan.sites?.total || 0} />
            <Stat label="Healthy" value={scan.sites?.healthy || 0} color="text-emerald-500" />
            <Stat label="Degraded" value={scan.sites?.degraded || 0} color="text-amber-500" />
            <Stat label="Critical" value={scan.sites?.critical || 0} color="text-red-500" />
            <Stat label="Avg Score" value={scan.sites?.average_audit_score || 0} />
          </div>
        </ScanSection>

        <ScanSection icon={Zap} title="Capabilities" color="text-indigo-500">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Stat label="Total" value={scan.capabilities?.total || 0} />
            <Stat label="Enabled" value={scan.capabilities?.enabled || 0} color="text-emerald-500" />
            <Stat label="Disabled" value={scan.capabilities?.disabled || 0} color="text-muted-foreground" />
          </div>
        </ScanSection>
      </div>

      {/* Scan timestamp */}
      <div className="text-[10px] text-muted-foreground text-center">
        Last scan: {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
      {sub && <span className="text-[9px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Stat({ label, value, color = 'text-foreground' }) {
  return (
    <div className="flex items-center justify-between rounded bg-muted/10 px-1.5 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-mono font-medium', color)}>{value}</span>
    </div>
  );
}