import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StrategyStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('companyOrchestrator', { action: 'status' });
        setStatus(res);
      } catch (e) {}
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) return null;

  const phases = status.phases || {};
  const strategyPhases = Object.entries(phases).map(([id, data]) => ({
    id,
    ...data,
    progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }));

  if (strategyPhases.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-fuchsia-500" />
        <h3 className="text-sm font-medium">Strategy Implementation Status</h3>
        <span className="text-xs text-muted-foreground ml-auto">{strategyPhases.length} phases</span>
      </div>
      <div className="space-y-2">
        {strategyPhases.map(phase => (
          <div key={phase.id} className="rounded-lg border border-border/40 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium capitalize">{phase.id.replace(/_/g, ' ')}</span>
                {phase.in_progress > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <Activity className="w-2.5 h-2.5" /> {phase.in_progress} active
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {phase.completed}/{phase.total} done
                {phase.failed > 0 && <span className="text-red-400 ml-2">{phase.failed} failed</span>}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className={cn('h-full transition-all', phase.progress === 100 ? 'bg-emerald-500' : phase.progress > 0 ? 'bg-blue-500' : 'bg-muted-foreground/30')}
                style={{ width: `${phase.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}