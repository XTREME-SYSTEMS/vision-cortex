import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GitBranch, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const versions = [
  { version: 'v2.4.1', date: '2026-09-06', changes: ['Vault page with 7 tabs (accounts, keys, promo, paper, wallets, payments, advisor)', 'Sidebar action buttons (7 special buttons)', 'File attachments in chat input', 'Version history bar'] },
  { version: 'v2.4.0', date: '2026-09-05', changes: ['Command Center dashboard', 'Daily brief generation', 'App onboarding pipeline', 'System sync endpoint'] },
  { version: 'v2.3.0', date: '2026-09-01', changes: ['System DNA architecture', 'Autonomous heartbeat via Vercel Cron', 'Master autonomous cycle (6-phase loop)'] },
  { version: 'v2.2.0', date: '2026-08-28', changes: ['Shadow operations suite', 'Council deliberation engine', 'Destiny Flow life simulator'] },
  { version: 'v2.1.0', date: '2026-08-20', changes: ['Factory blueprint system', 'Xtreme AI dashboard', 'Site monitoring & auditing'] },
  { version: 'v2.0.0', date: '2026-08-15', changes: ['Vision Cortex rebrand', 'Multi-agent orchestration (Primus)', '4-layer architecture: Discover → Understand → Predict → Act'] },
];

export default function VersionHistory() {
  const [open, setOpen] = useState(false);
  const current = versions[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors w-full text-left">
          <GitBranch className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Version</span>
          <span className="text-xs font-bold tabular-nums text-foreground">{current.version}</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">· {current.date}</span>
          <span className="text-[10px] text-muted-foreground/70 truncate ml-2 hidden md:inline">{current.changes[0]}</span>
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground ml-auto transition-transform shrink-0', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="max-h-96 overflow-y-auto no-scrollbar">
          {versions.map((v, i) => (
            <div key={v.version} className={cn('p-3 border-b border-border/40 last:border-0', i === 0 && 'bg-muted/30')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold">{v.version}</span>
                {i === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">CURRENT</span>}
                <span className="text-[10px] text-muted-foreground ml-auto">{v.date}</span>
              </div>
              <ul className="space-y-0.5">
                {v.changes.map((c, j) => (
                  <li key={j} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-muted-foreground/50">•</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}