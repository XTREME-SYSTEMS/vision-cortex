import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles, Loader2, ListChecks, AlertCircle, Play } from 'lucide-react';
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
  const [autoProgress, setAutoProgress] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyProgress, setApplyProgress] = useState(null);
  const [error, setError] = useState(null);
  const [creatingGap, setCreatingGap] = useState(false);

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
    setCreatingGap(true);
    setError(null);
    try {
      // Create the gap
      const created = await base44.entities.Gap.create({ ...data, number: nextNumber });
      // Auto-recommend immediately — every new gap gets an AI recommendation
      await base44.functions.invoke('gapRecommender', { mode: 'recommend', gap_id: created.id });
      load();
    } catch (e) {
      setError(`Failed to add gap: ${e.message}`);
      load(); // still reload in case the gap was created
    }
    setCreatingGap(false);
  };

  const deleteGap = async (id) => {
    await base44.entities.Gap.delete(id);
    load();
  };

  const updateGap = (updated) => {
    setGaps((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  // Process gaps one at a time to avoid the 5-minute timeout that killed the old bulk call.
  // Each gap takes ~30s; we show live progress so the user knows it's working.
  const autoRecommendAll = async () => {
    setAutoLoading(true);
    setError(null);
    setAutoProgress({ done: 0, total: 0 });
    try {
      const openGaps = gaps.filter((g) => !g.recommendation);
      setAutoProgress({ done: 0, total: openGaps.length });
      let done = 0;
      for (const gap of openGaps) {
        try {
          await base44.functions.invoke('gapRecommender', { mode: 'recommend', gap_id: gap.id });
          done++;
          setAutoProgress({ done, total: openGaps.length });
        } catch (e) {
          console.error(`Failed to recommend gap ${gap.id}:`, e);
        }
      }
      load();
    } catch (e) {
      setError(`Auto-recommend failed: ${e.message}`);
    }
    setAutoLoading(false);
    setAutoProgress(null);
  };

  // One-click Apply All: validates + stages every recommended gap in sequence.
  const applyAll = async () => {
    setApplyLoading(true);
    setError(null);
    setApplyProgress({ done: 0, total: 0 });
    try {
      const recommended = gaps.filter((g) => g.status === 'recommended' && g.recommendation);
      setApplyProgress({ done: 0, total: recommended.length });
      let done = 0;
      let failed = 0;
      for (const gap of recommended) {
        try {
          await base44.functions.invoke('gapRecommender', { mode: 'apply', gap_id: gap.id });
          done++;
          setApplyProgress({ done, total: recommended.length, failed });
        } catch (e) {
          failed++;
          setApplyProgress({ done, total: recommended.length, failed });
        }
      }
      load();
    } catch (e) {
      setError(`Apply all failed: ${e.message}`);
    }
    setApplyLoading(false);
    setApplyProgress(null);
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
          Track, prioritize, and fix the gaps between Vision Cortex today and the zero-interaction autonomous system it needs to become. Every gap you add gets an instant AI recommendation with deployable code. Apply, then validate.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600"><AlertCircle className="w-3.5 h-3.5" /></button>
        </div>
      )}

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
        <Button onClick={() => setShowForm(true)} disabled={creatingGap}>
          {creatingGap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creatingGap ? 'Adding & Recommending…' : 'Add Gap'}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={autoRecommendAll} disabled={autoLoading || stats.open === 0}>
            {autoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {autoLoading && autoProgress
              ? `Recommending ${autoProgress.done}/${autoProgress.total}…`
              : `Auto-Recommend All (${stats.open})`}
          </Button>
          <Button onClick={applyAll} disabled={applyLoading || stats.recommended === 0}>
            {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {applyLoading && applyProgress
              ? `Applying ${applyProgress.done}/${applyProgress.total}…`
              : `Apply All (${stats.recommended})`}
          </Button>
        </div>
      </div>

      {applyLoading && applyProgress && (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${applyProgress.total > 0 ? (applyProgress.done / applyProgress.total) * 100 : 0}%` }}
          />
        </div>
      )}

      {autoLoading && autoProgress && (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-foreground h-full transition-all duration-300"
            style={{ width: `${autoProgress.total > 0 ? (autoProgress.done / autoProgress.total) * 100 : 0}%` }}
          />
        </div>
      )}

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