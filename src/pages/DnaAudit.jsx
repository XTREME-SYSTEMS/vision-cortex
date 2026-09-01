import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, Zap, Loader2, CheckCircle2, Activity, ShieldAlert } from 'lucide-react';

const SEVERITY_STYLE = {
  P0: { badge: 'destructive', label: 'Critical', bar: 'bg-rose-500' },
  P1: { badge: 'default', label: 'High', bar: 'bg-orange-500' },
  P2: { badge: 'secondary', label: 'Medium', bar: 'bg-amber-500' },
  P3: { badge: 'secondary', label: 'Low', bar: 'bg-sky-500' },
};

const SYSTEM_LABEL = {
  'SYS-000001': 'Vision Cortex',
  'SYS-000002': 'Cloud Browser',
  'SYS-000003': 'Auto Builder',
};

export default function DnaAudit() {
  const [gaps, setGaps] = useState(null);
  const [caps, setCaps] = useState({});
  const [healing, setHealing] = useState({});
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const [g, c] = await Promise.all([
      base44.entities.SystemDNA_Gap.list('-severity', 500),
      base44.entities.SystemDNA_Capability.list('-benchmark_position', 500),
    ]);
    setGaps(g || []);
    const capMap = {};
    (c || []).forEach((cap) => { capMap[cap.dna_id] = cap; });
    setCaps(capMap);
  };

  useEffect(() => { load(); }, []);

  const selfHeal = async (gapId) => {
    setHealing((h) => ({ ...h, [gapId]: 'loading' }));
    try {
      await base44.functions.invoke('dnaSelfHeal', { gap_id: gapId });
      setHealing((h) => ({ ...h, [gapId]: 'done' }));
      load();
    } catch (e) {
      setHealing((h) => ({ ...h, [gapId]: 'error' }));
    }
  };

  const filtered = (gaps || []).filter((g) => {
    if (filter === 'all') return true;
    if (filter === 'blocking') return g.is_blocking;
    return g.severity === filter;
  });

  const counts = {
    P0: (gaps || []).filter((g) => g.severity === 'P0').length,
    P1: (gaps || []).filter((g) => g.severity === 'P1').length,
    P2: (gaps || []).filter((g) => g.severity === 'P2').length,
    P3: (gaps || []).filter((g) => g.severity === 'P3').length,
    blocking: (gaps || []).filter((g) => g.is_blocking).length,
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">System DNA · Audit Ledger</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Every gap. One button to heal.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          The complete ledger of technological, functional, and capability gaps across all three systems. Each item is traceable to its capability and can trigger immediate self-healing.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'P0', label: 'Critical', value: counts.P0, icon: ShieldAlert, color: 'text-rose-500' },
          { key: 'P1', label: 'High', value: counts.P1, icon: AlertTriangle, color: 'text-orange-500' },
          { key: 'P2', label: 'Medium', value: counts.P2, icon: AlertTriangle, color: 'text-amber-500' },
          { key: 'P3', label: 'Low', value: counts.P3, icon: Activity, color: 'text-sky-500' },
          { key: 'blocking', label: 'Blocking', value: counts.blocking, icon: ShieldAlert, color: 'text-rose-500' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                filter === s.key ? 'border-foreground bg-foreground/5' : 'border-border/60 hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn('w-3.5 h-3.5', s.color)} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            </button>
          );
        })}
      </div>

      {filter !== 'all' && (
        <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>Clear filter</Button>
      )}

      {/* Gap list */}
      {gaps === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center border-border/60">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-medium">No gaps detected.</p>
          <p className="text-xs text-muted-foreground mt-1">The system is at benchmark.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((gap) => {
            const sev = SEVERITY_STYLE[gap.severity] || SEVERITY_STYLE.P3;
            const cap = caps[gap.capability_id];
            const healState = healing[gap.dna_id];
            return (
              <Card key={gap.id} className={cn('p-4 border-border/60', gap.is_blocking && 'border-rose-500/40 bg-rose-500/5')}>
                <div className="flex items-start gap-3">
                  <div className={cn('w-1 self-stretch rounded-full', sev.bar)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={sev.badge} className="text-[9px]">{gap.severity}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{gap.dna_id}</span>
                      <span className="text-[10px] text-muted-foreground">{SYSTEM_LABEL[gap.system_id] || gap.system_id}</span>
                      {gap.is_blocking && <Badge variant="destructive" className="text-[9px]">BLOCKING</Badge>}
                      <Badge variant="outline" className="text-[9px] capitalize">{gap.status}</Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug">{gap.target_state}</p>
                    {gap.measurable_difference && (
                      <p className="text-xs text-muted-foreground mt-1">{gap.measurable_difference}</p>
                    )}
                    {cap && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {cap.module} / {cap.capability} · score {cap.benchmark_position}/100
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {healState === 'done' || gap.status === 'in_progress' ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Healing</span>
                      </div>
                    ) : healState === 'loading' ? (
                      <Button size="sm" disabled>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Healing...
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => selfHeal(gap.dna_id)} variant={gap.is_blocking ? 'destructive' : 'default'}>
                        <Zap className="w-3.5 h-3.5" /> Self-Heal
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link to="/dna"><Button variant="outline" size="sm">Command Center</Button></Link>
      </div>
    </div>
  );
}