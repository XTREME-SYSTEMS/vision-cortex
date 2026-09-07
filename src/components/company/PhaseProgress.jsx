import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, Clock, AlertCircle } from 'lucide-react';

const PHASE_ICONS = ['🔍', '🔧', '🛡️', '⚙️', '📡', '📋', '🏗️', '📧'];

export default function PhaseProgress({ phases }) {
  if (!phases || Object.keys(phases).length === 0) {
    return <p className="text-xs text-muted-foreground">No phases initialized yet. Click "Bootstrap Company" to start.</p>;
  }

  const phaseEntries = Object.entries(phases).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-2">
      {phaseEntries.map(([phaseId, data], i) => {
        const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        const isActive = data.in_progress > 0;
        const isDone = data.total > 0 && data.completed === data.total;

        return (
          <div key={phaseId} className={cn(
            'rounded-lg border p-2.5',
            isDone ? 'border-emerald-500/30 bg-emerald-500/5' :
            isActive ? 'border-blue-500/30 bg-blue-500/5' :
            'border-border/40 bg-card'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{PHASE_ICONS[i] || '📌'}</span>
              <span className="text-xs font-medium flex-1">{phaseId.replace(/^\d+_/, '').replace(/_/g, ' ')}</span>
              {isDone ? <Check className="w-3.5 h-3.5 text-emerald-500" /> :
               isActive ? <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" /> :
               <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground font-mono">{data.completed}/{data.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className={cn(
                'h-full transition-all',
                isDone ? 'bg-emerald-500' : isActive ? 'bg-blue-500' : 'bg-muted-foreground/30'
              )} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground">
              <span>{pct}% done</span>
              {data.in_progress > 0 && <span className="text-blue-500">{data.in_progress} active</span>}
              {data.failed > 0 && <span className="text-red-500 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" />{data.failed} failed</span>}
              {data.scheduled > 0 && <span>{data.scheduled} queued</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}