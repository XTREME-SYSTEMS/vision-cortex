import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Cpu, Copy, Check, ChevronDown, ChevronRight, Target,
  Search, Lock, Eye, Gauge, FileText, Trophy, AlertTriangle,
} from 'lucide-react';

const VERDICT_STYLE = {
  launch_ready: { color: 'text-emerald-500', label: 'Launch Ready' },
  near_ready: { color: 'text-amber-500', label: 'Near Ready' },
  not_ready: { color: 'text-rose-500', label: 'Not Ready' },
  unknown: { color: 'text-muted-foreground', label: 'Unknown' },
};

const DIM_ICON = { performance: Gauge, seo: Search, security: Lock, accessibility: Eye, content: FileText };

export default function DeepAuditReport({ report }) {
  const [open, setOpen] = useState({});
  const [copied, setCopied] = useState(null);

  if (!report) return null;

  const v = VERDICT_STYLE[report.launch_readiness_verdict] || VERDICT_STYLE.unknown;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Card className="p-5 border-border/60 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <h3 className="font-display text-xl tracking-tight">Deep System Audit</h3>
            <Badge variant="outline" className={cn('text-[9px]', v.color)}>{v.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{report.system_type}</p>
          {report.system_description && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-2xl">{report.system_description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-3xl">{report.overall_score}<span className="text-base text-muted-foreground">/100</span></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall</p>
        </div>
      </div>

      {/* Tech stack + benchmark */}
      <div className="grid sm:grid-cols-2 gap-3">
        {report.tech_stack?.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {report.tech_stack.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          </div>
        )}
        {report.benchmark_system && (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> Benchmark</p>
            <p className="text-sm font-medium">{report.benchmark_system}</p>
            {report.competitor_benchmarks?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {report.competitor_benchmarks.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{c.system}</span> — {c.strength}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Overall summary */}
      {report.overall_summary && (
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Full Summary</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.overall_summary}</p>
        </div>
      )}

      {/* Per-dimension perfection prompts */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Perfection Prompts → 100%</p>
        {(report.dimension_analysis || []).map((d) => {
          const Icon = DIM_ICON[d.dimension] || Target;
          const isOpen = open[d.dimension];
          return (
            <div key={d.dimension} className="rounded-lg border border-border/40 overflow-hidden">
              <button
                onClick={() => setOpen((p) => ({ ...p, [d.dimension]: !p[d.dimension] }))}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium capitalize flex-1">{d.dimension}</span>
                <span className="font-mono text-sm text-muted-foreground">{d.current_score} → {d.target_score}</span>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground" style={{ width: `${d.current_score || 0}%` }} />
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/40 pt-2">
                  <p className="text-xs"><span className="text-muted-foreground">Gap: </span>{d.gap}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Root cause: </span>{d.root_cause}</p>
                  <div className="rounded-md bg-muted/60 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Perfection Prompt</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => copy(d.perfection_prompt, d.dimension)}>
                        {copied === d.dimension ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copied === d.dimension ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed font-mono whitespace-pre-wrap">{d.perfection_prompt}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}