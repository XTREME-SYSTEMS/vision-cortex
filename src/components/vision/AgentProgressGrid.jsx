import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const AGENT_PARTS = {
  Primus: 'Orchestration & Coordination',
  Vision: 'Discovery & Niche Scouting',
  Strategy: 'Strategy & Architecture',
  Shadow: 'Covert Data Acquisition',
  Sage: 'Wisdom & Governance',
  Capital: 'Capital & Monetization',
  Quant: 'Prediction & Trading',
  Treasurer: 'Treasury & Payments',
  Maxwell: 'Build & Deploy',
  Documenter: 'Documentation',
  Distributor: 'Distribution & Outreach',
  Brand: 'Brand & Creative',
  Validator: 'Quality & Validation',
  Philosopher: 'Long-horizon Thinking',
  'Personal Coach': 'Personal Guidance',
  'Eden Skye': 'External Comms (HPI)',
  'Autonomous Builder': 'Autonomous Building',
};

export default function AgentProgressGrid({ agents }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {agents.map((a) => {
        const pct = Math.round(a.health || 0);
        const complete = pct >= 100;
        const part = AGENT_PARTS[a.name] || a.role || 'General Operations';
        return (
          <div key={a.id} className={cn('border rounded-lg p-3 transition-colors', complete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/60')}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0', complete ? 'bg-emerald-500 text-white' : 'bg-muted text-foreground')}>
                {a.name?.[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{part}</p>
              </div>
              {complete && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-500' : 'bg-sky-500')}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className={cn('text-[10px] font-mono font-semibold w-9 text-right', complete ? 'text-emerald-500' : 'text-muted-foreground')}>{pct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn('text-[10px] capitalize', a.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground')}>
                {a.status || 'idle'}
              </span>
              <span className="text-[10px] text-muted-foreground">{a.tasks_completed || 0} tasks</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}