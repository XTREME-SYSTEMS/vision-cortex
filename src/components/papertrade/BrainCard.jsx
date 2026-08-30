import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Brain, ScrollText, Shield } from 'lucide-react';

export default function BrainCard() {
  const [doctrine, setDoctrine] = useState(null);
  const [gov, setGov] = useState(null);

  useEffect(() => {
    base44.entities.Doctrine.list('-weight', 5).then(setDoctrine).catch(() => setDoctrine([]));
    base44.entities.Governance.list('rank', 12).then(setGov).catch(() => setGov([]));
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-4">
        <Brain className="w-3.5 h-3.5" /> Compounding Brain & Governance
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Doctrine <span className="text-muted-foreground">({doctrine?.length || 0})</span>
          </p>
          <div className="space-y-3">
            {doctrine === null && <p className="text-xs text-muted-foreground">Loading…</p>}
            {doctrine?.length === 0 && <p className="text-xs text-muted-foreground">No doctrine compounded yet — cycles accumulate it automatically.</p>}
            {doctrine?.map((d) => (
              <div key={d.id} className="text-xs">
                <p className="font-medium flex items-center gap-2">
                  {d.topic}
                  <span className="text-muted-foreground">· w{d.weight || 1}{d.validated ? ' ✓' : ''}</span>
                </p>
                <p className="text-muted-foreground leading-relaxed mt-0.5">{d.insight}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2"><ScrollText className="w-4 h-4" /> Governance</p>
          <div className="space-y-2">
            {gov === null && <p className="text-xs text-muted-foreground">Loading…</p>}
            {gov?.map((g) => (
              <div key={g.id} className="text-xs">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">{g.category}</span>
                <p className="leading-snug">{g.principle}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-4 flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Shadow forcefield active · hourly sweep
          </p>
        </div>
      </div>
    </Card>
  );
}