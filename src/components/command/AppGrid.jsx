import React from 'react';
import { ExternalLink, Globe, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColor = {
  healthy: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  active: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  degraded: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  critical: 'text-red-500 bg-red-500/10 border-red-500/30',
  paused: 'text-muted-foreground bg-muted/20 border-border',
};

function scoreColor(s) {
  if (s >= 80) return 'text-emerald-500';
  if (s >= 60) return 'text-sky-500';
  if (s >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function MiniBar({ label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-sky-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[9px] font-mono w-5 text-right">{value}</span>
    </div>
  );
}

export default function AppGrid({ apps, loading }) {
  if (loading && apps.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading managed apps…</div>;
  }
  if (apps.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed border-border/60">No apps onboarded yet. Use App Management to add apps.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {apps.map((app) => (
        <div key={app.id} className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2.5 hover:border-foreground/30 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold truncate">{app.name}</h3>
              <a href={app.url} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 truncate">
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{app.url.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            </div>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', statusColor[app.status] || statusColor.paused)}>
              {app.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={cn('text-2xl font-mono font-bold', scoreColor(app.audit_score || 0))}>{app.audit_score || 0}</div>
              <div className="text-[9px] text-muted-foreground">SCORE</div>
            </div>
            <div className="flex-1 space-y-1">
              <MiniBar label="PERF" value={app.performance_score || 0} />
              <MiniBar label="SEO" value={app.seo_score || 0} />
              <MiniBar label="SEC" value={app.security_score || 0} />
              <MiniBar label="A11Y" value={app.accessibility_score || 0} />
              <MiniBar label="CONT" value={app.content_score || 0} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              {app.issues_count || 0} issues
            </span>
            {(app.critical_issues_count || 0) > 0 && (
              <span className="text-[11px] text-red-500 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {app.critical_issues_count} critical
              </span>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {app.last_audit_at ? new Date(app.last_audit_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never'}
            </span>
          </div>

          {app.issues && app.issues.length > 0 && (
            <div className="space-y-1 pt-1">
              {app.issues.slice(0, 2).map((issue, i) => (
                <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                  <span className={cn('shrink-0', issue.severity === 'critical' ? 'text-red-500' : issue.severity === 'high' ? 'text-amber-500' : 'text-muted-foreground')}>•</span>
                  <span className="truncate">{issue.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}