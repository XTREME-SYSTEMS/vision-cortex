import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crosshair, DollarSign, Clock, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const stageFlow = ['discovered', 'strategized', 'building', 'launched'];
const stageColor = {
  discovered: 'bg-muted text-muted-foreground',
  strategized: 'bg-blue-500/10 text-blue-600',
  building: 'bg-amber-500/10 text-amber-600',
  launched: 'bg-emerald-500/10 text-emerald-600',
  queued: 'bg-muted text-muted-foreground',
  failed: 'bg-rose-500/10 text-rose-600',
};

export default function MissionTracker() {
  const [missions, setMissions] = useState(null);

  const load = useCallback(async () => {
    const [intel, queue] = await Promise.all([
      base44.entities.IntelFeed.filter({ source: 'Shadow Money Hunt' }, '-created_date', 50).catch(() => []),
      base44.entities.BuildQueue.filter({ source: 'shadow_build_strategy' }, '-created_date', 50).catch(() => []),
    ]);

    // Cross-reference intel with queue entries by matching headlines/business names
    const queueByTitle = {};
    for (const q of queue) {
      queueByTitle[q.title?.toLowerCase()] = q;
    }

    const merged = intel.map((item) => {
      const match = Object.values(queueByTitle).find((q) =>
        item.headline?.toLowerCase().includes(q.title?.toLowerCase()) ||
        q.title?.toLowerCase().includes(item.headline?.toLowerCase().slice(0, 20))
      );
      return {
        id: item.id,
        headline: item.headline,
        category: item.category,
        impact_score: item.impact_score,
        created_date: item.created_date,
        stage: match?.stage || 'discovered',
        queue_id: match?.id,
        business_name: match?.business_name,
        revenue: match?.notes,
        status: match?.status,
      };
    });

    setMissions(merged);
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.IntelFeed.subscribe(() => load());
    const unsub2 = base44.entities.BuildQueue.subscribe(() => load());
    return () => { unsub(); unsub2(); };
  }, [load]);

  const stats = missions ? {
    total: missions.length,
    discovered: missions.filter((m) => m.stage === 'discovered').length,
    strategized: missions.filter((m) => m.stage === 'strategized').length,
    building: missions.filter((m) => m.stage === 'building').length,
    launched: missions.filter((m) => m.stage === 'launched').length,
  } : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> Active Money-Hunting Missions
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Live tracker — every mission, its stage, and revenue potential.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Discovered', count: stats.discovered, color: 'text-muted-foreground' },
            { label: 'Strategized', count: stats.strategized, color: 'text-blue-600' },
            { label: 'Building', count: stats.building, color: 'text-amber-600' },
            { label: 'Launched', count: stats.launched, color: 'text-emerald-600' },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {missions === null ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : missions.length === 0 ? (
        <Card className="p-6 text-center">
          <Crosshair className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No active missions. Send Shadow hunting to begin.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {missions.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.headline}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <Badge variant="outline" className={cn('text-[10px]', stageColor[m.stage] || stageColor.discovered)}>{m.stage}</Badge>
                  {m.category && <Badge variant="outline" className="text-[10px]">{m.category.replace(/_/g, ' ')}</Badge>}
                  {m.business_name && <span className="text-muted-foreground">→ {m.business_name}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                {m.impact_score != null && (
                  <p className="text-xs flex items-center gap-1 justify-end text-amber-600">
                    <TrendingUp className="w-3 h-3" /> {m.impact_score}/10
                  </p>
                )}
                {m.stage === 'launched' && (
                  <p className="text-xs flex items-center gap-1 justify-end text-emerald-600">
                    <DollarSign className="w-3 h-3" /> Live
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}