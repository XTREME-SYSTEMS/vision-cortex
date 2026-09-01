import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Dna, AlertTriangle, Activity } from 'lucide-react';

// SystemDnaBar — persistent health strip shown on every page. Links the entire
// platform to the System DNA foundation. Shows verified score + critical gaps.

export default function SystemDnaBar() {
  const [systems, setSystems] = useState(null);
  const [gaps, setGaps] = useState(null);

  const load = async () => {
    const [s, g] = await Promise.all([
      base44.entities.SystemDNA_System.list('category', 10).catch(() => []),
      base44.entities.SystemDNA_Gap.filter({ status: 'open' }, '-severity', 100).catch(() => []),
    ]);
    setSystems(s || []);
    setGaps(g || []);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.SystemDNA_System.subscribe(() => load());
    return unsub;
  }, []);

  if (!systems || systems.length === 0) return null;

  const avgScore = Math.round(systems.reduce((a, s) => a + (s.current_score || 0), 0) / systems.length);
  const criticalCount = (gaps || []).filter((g) => g.severity === 'P0' || g.is_blocking).length;
  const openCount = (gaps || []).length;

  const scoreColor = avgScore >= 70 ? 'text-emerald-500' : avgScore >= 50 ? 'text-amber-500' : avgScore >= 25 ? 'text-orange-500' : 'text-rose-500';
  const barColor = avgScore >= 70 ? 'bg-emerald-500' : avgScore >= 50 ? 'bg-amber-500' : avgScore >= 25 ? 'bg-orange-500' : 'bg-rose-500';

  return (
    <Link to="/dna" className="block">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer">
        <Dna className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0">System DNA</span>

        {/* Score bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${avgScore}%` }} />
          </div>
          <span className={cn('text-xs font-bold tabular-nums', scoreColor)}>{avgScore}</span>
        </div>

        {/* System dots */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {systems.map((s) => (
            <div key={s.id} className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{s.name}</span>
              <span className={cn(
                'text-[10px] font-semibold tabular-nums',
                s.current_score >= 70 ? 'text-emerald-500' : s.current_score >= 50 ? 'text-amber-500' : 'text-rose-500'
              )}>{s.current_score}</span>
            </div>
          ))}
        </div>

        {/* Gap indicators */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] text-rose-500 font-medium">{criticalCount} critical</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{openCount} open gaps</span>
          </div>
        </div>
      </div>
    </Link>
  );
}