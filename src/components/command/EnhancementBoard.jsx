import React from 'react';
import { Wrench, Heart, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const columns = [
  { key: 'fix', label: 'Fix', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/20' },
  { key: 'heal', label: 'Heal', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/5 border-rose-500/20' },
  { key: 'hardening', label: 'Harden', icon: Shield, color: 'text-sky-500', bg: 'bg-sky-500/5 border-sky-500/20' },
  { key: 'optimization', label: 'Optimize', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/5 border-violet-500/20' },
];

export default function EnhancementBoard({ enhancements }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Enhancement Queue</h3>
        <span className="text-[11px] text-muted-foreground">{enhancements.length} pending</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {columns.map((col) => {
          const items = enhancements.filter((e) => e.category === col.key);
          const Icon = col.icon;
          return (
            <div key={col.key} className={cn('rounded-lg border p-2.5 space-y-2', col.bg)}>
              <div className="flex items-center gap-1.5">
                <Icon className={cn('w-3.5 h-3.5', col.color)} />
                <span className="text-xs font-semibold">{col.label}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{items.length}</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {items.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/50 text-center py-3">None</p>
                ) : (
                  items.slice(0, 8).map((e) => (
                    <div key={e.id} className="rounded-md bg-background/50 p-2 border border-border/30">
                      <p className="text-[10px] font-medium leading-tight line-clamp-2">{e.title}</p>
                      {e.priority && (
                        <span className={cn('text-[9px] mt-1 inline-block px-1 rounded', e.priority === 1 ? 'text-red-500 bg-red-500/10' : e.priority === 2 ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground bg-muted/30')}>
                          P{e.priority}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}