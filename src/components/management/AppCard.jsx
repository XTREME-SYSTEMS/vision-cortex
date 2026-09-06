import React from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const statusColor = {
  healthy: 'text-emerald-500',
  active: 'text-blue-500',
  degraded: 'text-amber-500',
  critical: 'text-red-500',
  paused: 'text-muted-foreground',
};

export default function AppCard({ app }) {
  const score = app.score || 0;
  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{app.name}</div>
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
          >
            {app.url?.replace('https://', '')}
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </div>
        <div className={cn('text-lg font-mono font-bold', scoreColor)}>
          {score}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className={cn('capitalize font-medium', statusColor[app.status] || 'text-muted-foreground')}>
          {app.status}
        </span>
        {app.critical > 0 ? (
          <span className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-3 h-3" /> {app.critical} critical
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 className="w-3 h-3" /> No critical
          </span>
        )}
        {app.issues > 0 && <span className="text-muted-foreground">{app.issues} issues</span>}
      </div>
    </div>
  );
}