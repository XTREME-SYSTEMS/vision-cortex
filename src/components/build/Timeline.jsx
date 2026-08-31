import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Timeline({ steps, current, completed, onJump }) {
  return (
    <div className="flex items-start w-full overflow-x-auto no-scrollbar">
      {steps.map((s, i) => {
        const done = completed.has(i);
        const on = i === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <button onClick={() => onJump(i)} className="flex flex-col items-center gap-1.5 shrink-0 group">
              <span className={cn(
                'h-10 w-10 rounded-full grid place-items-center border-2 transition-all',
                on ? 'bg-foreground text-background border-foreground scale-110' :
                done ? 'bg-emerald-500 text-white border-emerald-500' :
                'bg-card text-muted-foreground border-border group-hover:border-foreground/40'
              )}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>
              <span className={cn('text-[10px] uppercase tracking-wider whitespace-nowrap', on ? 'text-foreground font-medium' : 'text-muted-foreground')}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 mt-5 w-5 sm:w-9 shrink-0', done ? 'bg-emerald-500' : 'bg-border')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}