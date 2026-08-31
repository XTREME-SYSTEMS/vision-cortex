import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles, Loader2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import GapRow from '@/components/gaps/GapRow';
import GapForm from '@/components/gaps/GapForm';
import AutoRecommendPanel from '@/components/gaps/AutoRecommendPanel';

export default function Gaps() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.Gap.list('-number', 100);
      const sorted = [...list].sort((a, b) => (a.number || 999) - (b.number || 999));
      setGaps(sorted);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nextNumber = gaps.length > 0 ? Math.max(...gaps.map((g) => g.number || 0)) + 1 : 1;

  const addGap = async (data) => {
    await base44.entities.Gap.create({ ...data, number: nextNumber });
    load();
  };

  const deleteGap = async (id) => {
    await base44.entities.Gap.delete(id);
    load();
  };

  const updateGap = (updated) => {
    setGaps((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const autoRecommendAll = async () => {
    setAutoLoading(true);
    try {
      await base44.functions.invoke('gapRecommender', { mode: 'recommend_all' });
      load();
    } catch (e) { console.error(e); }
    setAutoLoading(false);
  };

  const stats = {
    total: gaps.length,
    open: gaps.filter((g) => g.status === 'open').length,
    recommended: gaps.filter((g) => g.status === 'recommended').length,
    applied: gaps.filter((g) => g.status === 'applied').length,
    validated: gaps.filter((g) => g.status === 'validated').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl tracking-tight flex items-center gap-2.5">
          <ListChecks className="w-7 h-7" /> System Gaps
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Track, prioritize, and fix the gaps between Vision Cortex today and the zero-interaction autonomous system it needs to become. Add gaps manually, let the AI recommend fixes, apply them, and validate.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Open', value: stats.open, color: 'text-muted-foreground' },
          { label: 'Recommended', value: stats.recommended, color: 'text-blue-600' },
          { label: 'Applied', value: stats.applied, color: 'text-amber-600' },
          { label: 'Validated', value: stats.validated, color: 'text-emerald-600' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className={`text-2xl font-heading ${s.color}`}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Gap</Button>
        <Button variant="outline" onClick={autoRecommendAll} disabled={autoLoading || stats.open === 0}>
          {autoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Auto-Recommend All ({stats.open})
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></Card>
      ) : gaps.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No gaps yet. Add one above to start tracking.</p>
        </Card>
      ) : (
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <div className="flex bg-muted/50 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div className="w-12 px-3 py-2 border-r border-border/40">#</div>
            <div className="flex-1 px-3 py-2">Gap</div>
            <div className="px-3 py-2 w-40 text-right">Status</div>
          </div>
          {gaps.map((g) => (
            <GapRow key={g.id} gap={g} onDelete={deleteGap} onUpdate={updateGap} />
          ))}
        </div>
      )}

      <AutoRecommendPanel gaps={gaps} onRefresh={load} />

      {showForm && <GapForm onSave={addGap} onClose={() => setShowForm(false)} />}
    </div>
  );
}