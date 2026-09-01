import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Clock, ChevronDown, ChevronRight, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { capabilities } from './capabilities';

function CapabilityRow({ item }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    if (!item.fn) return;
    setRunning(true);
    try {
      await base44.functions.invoke(item.fn, {});
      setDone(true);
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card hover:border-border transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{item.name}</p>
          {item.built ? (
            <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Built
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] text-muted-foreground border-border shrink-0">
              <Clock className="w-2.5 h-2.5 mr-0.5" /> Soon
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
      </div>
      {item.built && item.fn && (
        <Button
          size="sm"
          variant={done ? 'ghost' : 'outline'}
          onClick={run}
          disabled={running || done}
          className="rounded-full shrink-0 h-7 px-3"
        >
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : done ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Play className="w-3 h-3" />}
          {done ? 'Done' : 'Run'}
        </Button>
      )}
    </div>
  );
}

function CategorySection({ category }) {
  const [expanded, setExpanded] = useState(true);
  const builtCount = category.items.filter((i) => i.built).length;
  const totalCount = category.items.length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="text-sm font-semibold flex-1 text-left">{category.category}</span>
        <Badge variant="secondary" className="text-[10px]">
          {builtCount}/{totalCount} built
        </Badge>
      </button>
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
          {category.items.map((item, i) => (
            <CapabilityRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CapabilityMatrix() {
  const totalBuilt = capabilities.reduce((s, c) => s + c.items.filter((i) => i.built).length, 0);
  const totalAll = capabilities.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Shadow Capability Matrix
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Every A-Z capability — {totalBuilt} of {totalAll} built. Click Run on any built capability to execute it instantly.
        </p>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {capabilities.map((cat) => {
          const built = cat.items.filter((i) => i.built).length;
          const total = cat.items.length;
          const pct = Math.round((built / total) * 100);
          return (
            <Card key={cat.category} className="p-2.5 text-center">
              <p className="text-lg font-bold" style={{ color: pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : '#94a3b8' }}>{pct}%</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{cat.category.split(' ')[0]}</p>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        {capabilities.map((cat) => (
          <CategorySection key={cat.category} category={cat} />
        ))}
      </div>
    </div>
  );
}