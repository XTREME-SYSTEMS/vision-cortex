import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ChevronRight, Loader2 } from 'lucide-react';

const STAGES = ['queued', 'strategized', 'building', 'launched', 'failed'];
const STAGE_STYLE = {
  queued: 'bg-muted text-muted-foreground',
  strategized: 'bg-blue-500/10 text-blue-600',
  building: 'bg-amber-500/10 text-amber-600',
  launched: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-rose-500/10 text-rose-600',
};

export default function Queue() {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.BuildQueue.list('-priority', 100);
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await base44.entities.BuildQueue.create({ title: title.trim(), stage: 'queued', priority: 3, source: 'manual' });
      setTitle('');
      await load();
    } catch {}
    setAdding(false);
  };

  const advance = async (item) => {
    const idx = STAGES.indexOf(item.stage || 'queued');
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    await base44.entities.BuildQueue.update(item.id, { stage: next });
    await load();
  };

  const remove = async (item) => {
    await base44.entities.BuildQueue.delete(item.id);
    await load();
  };

  const counts = STAGES.reduce((acc, s) => {
    acc[s] = (items || []).filter((i) => i.stage === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Distributor · Build Queue</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">The build pipeline.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Every approved opportunity enters the queue here. The Distributor prioritizes, advances, and ships — so the system compounds without you pushing it.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGES.map((s) => (
          <Card key={s} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s}</p>
            <p className="font-display text-2xl mt-1">{counts[s] || 0}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add an item to the queue…"
            className="flex-1"
          />
          <Button onClick={add} disabled={adding || !title.trim()}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {items === null && <p className="text-sm text-muted-foreground">Loading queue…</p>}
        {items?.length === 0 && <p className="text-sm text-muted-foreground">Queue is empty. Add the first item above.</p>}
        {items?.map((item) => (
          <Card key={item.id} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Priority {item.priority || 3} · {item.source || 'manual'}{item.assigned_agent ? ` · ${item.assigned_agent}` : ''}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STAGE_STYLE[item.stage || 'queued']}`}>
              {item.stage || 'queued'}
            </span>
            <Button size="icon" variant="ghost" onClick={() => advance(item)} disabled={item.stage === 'launched' || item.stage === 'failed'}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(item)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}