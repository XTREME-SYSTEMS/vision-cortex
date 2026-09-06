import React from 'react';
import { Loader2, Play, CheckCircle2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const phases = [
  { key: 'audit', label: 'Audit', desc: 'Live-fetch all sites + scan systems' },
  { key: 'analyze', label: 'Analyze', desc: 'Groq identifies top priorities' },
  { key: 'fix', label: 'Fix', desc: 'Create fix enhancements' },
  { key: 'heal', label: 'Heal', desc: 'Heal systems below 80' },
  { key: 'harden', label: 'Harden', desc: 'Security hardening' },
  { key: 'optimize', label: 'Optimize', desc: 'Push 75→100' },
];

export default function LoopPanel({ running, lastRun, onRun }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Master Autonomous Loop</h3>
          {running && <span className="text-[10px] text-amber-500 animate-pulse">RUNNING…</span>}
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground text-background disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running…' : 'Run Full Loop'}
        </button>
      </div>

      {/* Phase pipeline */}
      <div className="grid grid-cols-6 gap-1.5">
        {phases.map((p, i) => {
          const phaseData = lastRun?.phases?.[p.key];
          const isRunning = running && !lastRun;
          return (
            <div key={p.key} className={cn('rounded-lg border p-2 text-center transition-colors', running ? 'border-foreground/30 bg-foreground/5' : phaseData ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/40 bg-muted/20')}>
              <div className="text-[10px] font-semibold mb-0.5">{p.label}</div>
              {running && !lastRun ? (
                <Loader2 className="w-3 h-3 animate-spin mx-auto text-amber-500" />
              ) : phaseData ? (
                <CheckCircle2 className="w-3 h-3 mx-auto text-emerald-500" />
              ) : (
                <div className="w-3 h-3 mx-auto rounded-full bg-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </div>

      {/* Last run results */}
      {lastRun && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/40">
          <div className="text-center">
            <div className="text-lg font-mono font-bold">{lastRun.sites_audited || 0}</div>
            <div className="text-[9px] text-muted-foreground">SITES AUDITED</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-amber-500">{lastRun.issues_found || 0}</div>
            <div className="text-[9px] text-muted-foreground">ISSUES FOUND</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-sky-500">{lastRun.enhancements_created || 0}</div>
            <div className="text-[9px] text-muted-foreground">ENHANCEMENTS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-emerald-500">{lastRun.health_before || 0}→{lastRun.health_after || 0}</div>
            <div className="text-[9px] text-muted-foreground">HEALTH</div>
          </div>
        </div>
      )}

      {lastRun?.summary && (
        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/40">{lastRun.summary}</p>
      )}
      {lastRun?.timestamp && (
        <p className="text-[10px] text-muted-foreground/60">Last run: {new Date(lastRun.timestamp).toLocaleString()}</p>
      )}
    </div>
  );
}