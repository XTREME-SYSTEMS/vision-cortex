import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_MAP = {
  Primus: 'Command',
  Validator: 'Command',
  Vision: 'Intelligence',
  Sage: 'Intelligence',
  Strategy: 'Intelligence',
  Philosopher: 'Intelligence',
  Capital: 'Finance',
  Quant: 'Finance',
  Treasurer: 'Finance',
  Maxwell: 'Build',
  Documenter: 'Build',
  Distributor: 'Build',
  'Autonomous Builder': 'Build',
  Brand: 'Creative',
  Shadow: 'Covert',
  'Personal Coach': 'Personal',
  'Eden Skye': 'Personal',
};

const CATEGORY_ORDER = ['Command', 'Intelligence', 'Finance', 'Build', 'Creative', 'Covert', 'Personal', 'Other'];

export default function AgentRow({ activeAgents, onToggleAgent }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCat, setOpenCat] = useState(null);

  useEffect(() => {
    base44.entities.AgentProfile.list('-order', 100)
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-background">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Loading agents…</span>
      </div>
    );
  }

  if (agents.length === 0) return null;

  const grouped = {};
  agents.forEach((a) => {
    const cat = CATEGORY_MAP[a.name] || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const cats = CATEGORY_ORDER.filter((c) => grouped[c]);

  return (
    <div className="relative border-b border-border/60 bg-background">
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0 mr-1">Agents</span>
        {cats.map((cat) => {
          const catAgents = grouped[cat];
          const selectedCount = catAgents.filter((a) => activeAgents.includes(a.name)).length;
          const isOpen = openCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setOpenCat(isOpen ? null : cat)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all border',
                isOpen
                  ? 'bg-foreground text-background border-foreground'
                  : selectedCount > 0
                    ? 'bg-muted text-foreground border-foreground/30'
                    : 'bg-muted text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <span>{cat}</span>
              {selectedCount > 0 && (
                <span className={cn(
                  'text-[9px] font-bold px-1 rounded-full',
                  isOpen ? 'bg-background/20' : 'bg-foreground text-background'
                )}>
                  {selectedCount}
                </span>
              )}
              <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
            </button>
          );
        })}
      </div>

      {openCat && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpenCat(null)} />
          <div className="absolute left-4 top-full z-40 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1 pb-1.5">{openCat}</p>
            <div className="space-y-0.5">
              {grouped[openCat].map((a) => {
                const selected = activeAgents.includes(a.name);
                return (
                  <button
                    key={a.id}
                    onClick={() => onToggleAgent(a.name)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
                      selected ? 'bg-foreground/5' : 'hover:bg-muted'
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0',
                      selected ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                    )}>
                      {a.name?.[0]?.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{a.name}</p>
                      {a.role && <p className="text-[10px] text-muted-foreground truncate">{a.role}</p>}
                    </div>
                    {selected && <Check className="w-3.5 h-3.5 text-foreground shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}