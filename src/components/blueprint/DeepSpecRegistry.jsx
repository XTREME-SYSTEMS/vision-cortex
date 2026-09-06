import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { FileCode, Loader2, RefreshCw, Cpu, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGE_COLORS = {
  vision: 'text-violet-500 bg-violet-500/10',
  strategy: 'text-purple-500 bg-purple-500/10',
  document: 'text-indigo-500 bg-indigo-500/10',
  implement: 'text-blue-500 bg-blue-500/10',
  build: 'text-cyan-500 bg-cyan-500/10',
  validate: 'text-emerald-500 bg-emerald-500/10',
};

const STATUS_ICONS = {
  active: { icon: CheckCircle2, color: 'text-emerald-500' },
  draft: { icon: AlertCircle, color: 'text-amber-500' },
  deprecated: { icon: XCircle, color: 'text-muted-foreground' },
  failed: { icon: XCircle, color: 'text-red-500' },
};

export default function DeepSpecRegistry() {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.DeepSpec.list('-updated_date', 50);
      setSpecs(list || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileCode className="w-4 h-4" /> DEEP Spec Registry
          <span className="text-[11px] text-muted-foreground font-normal">({specs.length})</span>
        </h3>
        <button onClick={load} disabled={loading} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {loading && specs.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading specs...
        </div>
      ) : specs.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg">
          No DEEP specs yet. Specs are created as each system operation is codified into a state machine.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {specs.map((spec) => {
            const statusCfg = STATUS_ICONS[spec.status] || STATUS_ICONS.draft;
            const StatusIcon = statusCfg.icon;
            const stageColor = STAGE_COLORS[spec.lifecycle_stage] || STAGE_COLORS.vision;
            return (
              <div key={spec.id} className="flex items-center gap-2.5 py-1.5 border-b border-border/30 text-sm">
                <StatusIcon className={cn('w-3.5 h-3.5 shrink-0', statusCfg.color)} />
                <span className="font-mono text-[11px] text-foreground w-40 truncate">{spec.spec_id}</span>
                <span className="text-[11px] text-muted-foreground flex-1 truncate">{spec.title}</span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', stageColor)}>{spec.lifecycle_stage}</span>
                <span className="text-[10px] font-mono text-muted-foreground/60">v{spec.version}</span>
                {spec.autonomous && <Cpu className="w-3 h-3 text-violet-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}