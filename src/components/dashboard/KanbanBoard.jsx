import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Workflow, ShieldCheck, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', accent: 'border-t-slate-400' },
  { id: 'in_progress', label: 'In Progress', accent: 'border-t-blue-500' },
  { id: 'testing', label: 'Testing / Validating', accent: 'border-t-amber-500' },
  { id: 'done', label: 'Done', accent: 'border-t-emerald-500' },
  { id: 'blocked', label: 'Blocked', accent: 'border-t-rose-500' },
];

// Map each source's status → column
const STATUS_TO_COLUMN = {
  BuildQueue: { queued: 'in_progress', strategized: 'backlog', building: 'in_progress', launched: 'done', failed: 'blocked' },
  Opportunity: { new: 'backlog', researched: 'in_progress', responded: 'testing', followed_up: 'testing', closed: 'done' },
  SystemEnhancement: { pending: 'backlog', approved: 'backlog', in_progress: 'in_progress', validating: 'testing', implemented: 'done', audited: 'done', optimized: 'done', failed: 'blocked', blocked: 'blocked' },
};

// Map column → source status (on drop)
const COLUMN_TO_STATUS = {
  BuildQueue: { backlog: 'strategized', in_progress: 'building', testing: 'building', done: 'launched', blocked: 'failed' },
  Opportunity: { backlog: 'new', in_progress: 'researched', testing: 'responded', done: 'closed', blocked: 'closed' },
  SystemEnhancement: { backlog: 'pending', in_progress: 'in_progress', testing: 'validating', done: 'implemented', blocked: 'blocked' },
};

const SOURCE_META = {
  BuildQueue: { label: 'Build', icon: Building2, color: 'text-violet-500', entity: 'BuildQueue' },
  Opportunity: { label: 'Research', icon: Search, color: 'text-sky-500', entity: 'Opportunity' },
  SystemEnhancement: { label: 'Validate', icon: ShieldCheck, color: 'text-emerald-500', entity: 'SystemEnhancement' },
};

function normalize(items, source) {
  if (!items) return [];
  const map = STATUS_TO_COLUMN[source];
  return items
    .map((it) => {
      const column = map[it.stage || it.status] || 'backlog';
      const title = it.title || it.business_name || `Opportunity #${it.id?.slice(-4)}`;
      const subtitle = it.industry || it.category || it.source || '';
      return { id: it.id, _source: source, _raw: it, column, title, subtitle };
    })
    .filter(Boolean);
}

export default function KanbanBoard() {
  const [cards, setCards] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    const [builds, opps, enhs] = await Promise.all([
      base44.entities.BuildQueue.list('-priority', 50).catch(() => []),
      base44.entities.Opportunity.list('-created_date', 50).catch(() => []),
      base44.entities.SystemEnhancement.list('-priority', 50).catch(() => []),
    ]);
    setCards([
      ...normalize(builds, 'BuildQueue'),
      ...normalize(opps, 'Opportunity'),
      ...normalize(enhs, 'SystemEnhancement'),
    ]);
  };

  useEffect(() => { load(); }, []);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const card = cards.find((c) => c.id === draggableId);
    if (!card) return;

    // Optimistic update
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, column: destination.droppableId } : c)));

    const newStatus = COLUMN_TO_STATUS[card._source][destination.droppableId];
    if (!newStatus) return;
    const entityName = SOURCE_META[card._source].entity;
    const field = card._source === 'BuildQueue' ? 'stage' : 'status';
    setSaving(card.id);
    try {
      await base44.entities[entityName].update(card.id, { [field]: newStatus });
    } catch (e) {
      // revert on failure
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, column: source.droppableId } : c)));
    } finally {
      setSaving(null);
    }
  };

  if (cards === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center gap-2 mb-4">
        <Workflow className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Autonomous Kanban</h3>
        <span className="text-xs text-muted-foreground">— drag build stages, validation tasks & research items across columns</span>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />}
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-3 min-h-[300px]">
          {COLUMNS.map((col) => {
            const colCards = cards.filter((c) => c.column === col.id);
            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'rounded-lg border-t-2 border bg-muted/30 p-2 min-h-[280px] transition-colors',
                      col.accent,
                      snapshot.isDraggingOver && 'bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                      <span className="text-xs text-muted-foreground">{colCards.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colCards.map((card, idx) => {
                        const meta = SOURCE_META[card._source];
                        const Icon = meta.icon;
                        return (
                          <Draggable key={card.id} draggableId={card.id} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={cn(
                                  'rounded-md border bg-card p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-shadow',
                                  snap.isDragging && 'shadow-lg ring-2 ring-ring/40'
                                )}
                              >
                                <div className="flex items-start gap-1.5">
                                  <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', meta.color)} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium leading-snug line-clamp-2">{card.title}</p>
                                    {card.subtitle && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.subtitle}</p>
                                    )}
                                    <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0">{meta.label}</Badge>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </Card>
  );
}