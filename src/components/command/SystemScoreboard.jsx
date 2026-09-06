import React from 'react';
import { Dna } from 'lucide-react';
import { cn } from '@/lib/utils';

const healthColor = {
  healthy: 'text-emerald-500',
  degraded: 'text-amber-500',
  critical: 'text-red-500',
  unknown: 'text-muted-foreground',
  failed: 'text-red-500',
};

export default function SystemScoreboard({ systems }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Dna className="w-4 h-4" /> System DNA Scoreboard</h3>
        <span className="text-[11px] text-muted-foreground">{systems.length} systems</span>
      </div>
      {systems.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No systems registered.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
          {systems.map((s) => {
            const score = s.current_score || 0;
            const target = s.north_star_score || 100;
            const pct = Math.min(100, (score / target) * 100);
            return (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate flex-1">{s.name}</span>
                  <span className={cn('font-mono font-semibold ml-2', healthColor[s.health_status] || 'text-muted-foreground')}>
                    {score}<span className="text-muted-foreground/50">/{target}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-sky-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className={cn('font-medium', healthColor[s.health_status])}>{s.health_status}</span>
                  {(s.critical_gaps_count || 0) > 0 && <span>· {s.critical_gaps_count} gaps</span>}
                  {(s.failed_tests_count || 0) > 0 && <span>· {s.failed_tests_count} failed</span>}
                  <span className="ml-auto capitalize">{s.lifecycle_state}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}