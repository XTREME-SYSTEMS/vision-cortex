import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Wrench, CheckCircle2, ArrowRight, Zap, ShieldCheck, AlertCircle } from 'lucide-react';

const STATUS_STYLE = {
  queued: { badge: 'secondary', label: 'Queued' },
  in_progress: { badge: 'default', label: 'In Progress' },
  testing: { badge: 'default', label: 'Testing' },
  validated: { badge: 'default', label: 'Validated' },
  deployed: { badge: 'default', label: 'Deployed' },
  blocked: { badge: 'destructive', label: 'Blocked' },
  failed: { badge: 'destructive', label: 'Failed' },
  cancelled: { badge: 'secondary', label: 'Cancelled' },
  done: { badge: 'default', label: 'Done' },
  backlog: { badge: 'secondary', label: 'Backlog' },
};

const ENH_STATUS_STYLE = {
  pending: { badge: 'secondary', label: 'Pending' },
  approved: { badge: 'default', label: 'Approved' },
  in_progress: { badge: 'default', label: 'In Progress' },
  implemented: { badge: 'default', label: 'Implemented' },
  validating: { badge: 'default', label: 'Validating' },
  auditing: { badge: 'default', label: 'Auditing' },
  audited: { badge: 'default', label: 'Audited' },
  failed: { badge: 'destructive', label: 'Failed' },
  blocked: { badge: 'destructive', label: 'Blocked' },
  optimized: { badge: 'default', label: 'Optimized' },
};

export default function DnaActions() {
  const [actions, setActions] = useState(null);
  const [enhancements, setEnhancements] = useState(null);
  const [gaps, setGaps] = useState({});
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const [a, e, g] = await Promise.all([
      base44.entities.SystemDNA_Action.list('-updated_date', 200).catch(() => []),
      base44.entities.SystemEnhancement.list('-updated_date', 200).catch(() => []),
      base44.entities.SystemDNA_Gap.list('-severity', 200).catch(() => []),
    ]);
    setActions(a || []);
    setEnhancements(e || []);
    const gapMap = {};
    (g || []).forEach((gap) => { gapMap[gap.dna_id] = gap; });
    setGaps(gapMap);
  };

  useEffect(() => { load(); }, []);

  const filteredActions = (actions || []).filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const filteredEnhancements = (enhancements || []).filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">System DNA · Actions Ledger</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Every fix. Every validation. Full traceability.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          The complete ledger of self-healing and validation actions — original issue, resulting fix, and outcome.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'in_progress', 'queued', 'validated', 'failed', 'blocked'].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === 'all' ? 'All Actions' : f.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Self-healing actions (from SystemDNA_Action) */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Self-Healing Actions
          <Badge variant="outline" className="text-[9px]">{filteredActions.length}</Badge>
        </h3>
        {actions === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActions.length === 0 ? (
          <Card className="p-6 text-center border-border/60">
            <p className="text-sm text-muted-foreground">No self-healing actions in this filter.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActions.map((action) => {
              const gap = action.source_id ? gaps[action.source_id] : null;
              const sty = STATUS_STYLE[action.status] || STATUS_STYLE.queued;
              return (
                <Card key={action.id} className="p-4 border-border/60">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0',
                      action.status === 'failed' || action.status === 'blocked' ? 'bg-rose-500/10' : 'bg-amber-500/10')}>
                      <Wrench className={cn('w-4 h-4', action.status === 'failed' || action.status === 'blocked' ? 'text-rose-500' : 'text-amber-500')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={sty.badge} className="text-[9px]">{sty.label}</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{action.dna_id}</span>
                        <Badge variant="outline" className="text-[9px] capitalize">{action.source}</Badge>
                        <Badge variant="outline" className="text-[9px]">{action.priority}</Badge>
                      </div>
                      <p className="text-sm font-medium leading-snug">{action.objective}</p>

                      {/* Original issue → Fix */}
                      {gap && (
                        <div className="mt-2 rounded-lg border border-border/40 p-2.5 bg-muted/20">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Original Issue</p>
                              <p className="text-xs leading-snug">{gap.target_state}</p>
                              {gap.measurable_difference && (
                                <p className="text-[11px] text-muted-foreground mt-1">{gap.measurable_difference}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-center my-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Fix / Acceptance Criteria</p>
                              <p className="text-xs leading-snug">{action.acceptance_criteria || action.scope || 'In progress'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        {action.started_at && <span>Started: {new Date(action.started_at).toLocaleDateString()}</span>}
                        {action.completed_at && <span>Completed: {new Date(action.completed_at).toLocaleDateString()}</span>}
                        {action.assigned_to && <span>Agent: {action.assigned_to}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhancement actions (from SystemEnhancement) */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-500" />
          Enhancement & Validation Actions
          <Badge variant="outline" className="text-[9px]">{filteredEnhancements.length}</Badge>
        </h3>
        {enhancements === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEnhancements.length === 0 ? (
          <Card className="p-6 text-center border-border/60">
            <p className="text-sm text-muted-foreground">No enhancement actions in this filter.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEnhancements.slice(0, 50).map((enh) => {
              const sty = ENH_STATUS_STYLE[enh.status] || ENH_STATUS_STYLE.pending;
              return (
                <Card key={enh.id} className="p-4 border-border/60">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0',
                      enh.status === 'failed' || enh.status === 'blocked' ? 'bg-rose-500/10' :
                      enh.status === 'implemented' || enh.status === 'audited' ? 'bg-emerald-500/10' : 'bg-sky-500/10')}>
                      <ShieldCheck className={cn('w-4 h-4',
                        enh.status === 'failed' || enh.status === 'blocked' ? 'text-rose-500' :
                        enh.status === 'implemented' || enh.status === 'audited' ? 'text-emerald-500' : 'text-sky-500')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={sty.badge} className="text-[9px]">{sty.label}</Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{enh.category}</Badge>
                        <Badge variant="outline" className="text-[9px]">P{enh.priority}</Badge>
                        {enh.source === 'system_dna' && <Badge variant="outline" className="text-[9px]">DNA</Badge>}
                      </div>
                      <p className="text-sm font-medium leading-snug">{enh.title}</p>

                      {/* Issue → Fix */}
                      <div className="mt-2 rounded-lg border border-border/40 p-2.5 bg-muted/20">
                        {enh.downfall && (
                          <div className="flex items-start gap-2 mb-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Issue</p>
                              <p className="text-xs leading-snug">{enh.downfall}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Fix</p>
                            <p className="text-xs leading-snug">{enh.recommended_enhancement || enh.description || enh.implementation_plan || 'In progress'}</p>
                          </div>
                        </div>
                      </div>

                      {enh.audit_result?.score != null && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-muted-foreground">Audit Score:</span>
                          <span className={cn('text-xs font-bold', enh.audit_result.passed ? 'text-emerald-500' : 'text-rose-500')}>
                            {enh.audit_result.score}/100
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}