import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const statusConfig = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-500', bar: 'bg-emerald-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bar: 'bg-amber-500' },
  critical: { icon: XCircle, color: 'text-red-500', bar: 'bg-red-500' },
};

export default function DataLifecycleBar({ dimension }) {
  const cfg = statusConfig[dimension.status] || statusConfig.critical;
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('w-3.5 h-3.5', cfg.color)} />
          <span className="text-xs font-medium">{dimension.dimension}</span>
        </div>
        <span className="text-xs font-mono font-semibold">{dimension.score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', cfg.bar)}
          style={{ width: `${dimension.score}%` }}
        />
      </div>
      {dimension.findings && dimension.findings.length > 0 && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {dimension.findings[0]}
        </div>
      )}
    </div>
  );
}