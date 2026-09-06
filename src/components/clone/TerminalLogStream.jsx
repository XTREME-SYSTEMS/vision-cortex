import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const levelColor = {
  info: 'text-sky-400',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
};

export default function TerminalLogStream({ logs }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="border rounded-lg bg-[#0B0D12] overflow-hidden border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-mono text-xs font-semibold text-foreground">TERMINAL · PIPELINE LOG</span>
        <span className="font-mono text-[10px] text-muted-foreground">{logs.length} events</span>
      </div>
      <div ref={ref} className="font-mono text-[11px] leading-relaxed p-3 h-64 overflow-y-auto no-scrollbar">
        {logs.length === 0 && <div className="text-muted-foreground/50">awaiting pipeline start…</div>}
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground/50 shrink-0">{l.ts}</span>
            <span className="text-muted-foreground shrink-0 w-32 truncate">[{l.worker}]</span>
            <span className={cn('flex-1', levelColor[l.level] || 'text-muted-foreground')}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}