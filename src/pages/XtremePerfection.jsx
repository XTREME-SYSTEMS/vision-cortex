import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Loader2, Archive, Shield, Cpu, Sparkles, Copy, Check,
  AlertTriangle, CheckCircle2, Layers, Rocket, Brain, Wrench,
} from 'lucide-react';

const VERDICT_STYLE = {
  launch_ready: { color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', icon: CheckCircle2 },
  near_ready: { color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/30', icon: AlertTriangle },
  not_ready: { color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/30', icon: AlertTriangle },
  unknown: { color: 'text-muted-foreground', bg: '', border: 'border-border/60', icon: AlertTriangle },
};

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button onClick={copy} variant="outline" size="sm" className="rounded-full text-xs">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label || 'Copy'}
    </Button>
  );
}

function PromptBlock({ title, prompt, icon: Icon }) {
  const [expanded, setExpanded] = useState(false);
  if (!prompt) return null;
  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">{title}</h4>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setExpanded(!expanded)} variant="ghost" size="sm" className="text-xs">
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          <CopyButton text={prompt} />
        </div>
      </div>
      <p className={cn('text-xs text-muted-foreground leading-relaxed font-mono', !expanded && 'line-clamp-3')}>
        {prompt}
      </p>
    </Card>
  );
}

export default function XtremePerfection() {
  const [report, setReport] = useState(null);
  const [enhancements, setEnhancements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const reports = await base44.entities.SystemPerfectionReport.filter(
        { site_id: '6a97bd49702057bc9a36bc3d' },
        '-created_date', 1
      );
      if (reports && reports[0]) setReport(reports[0]);
      const enh = await base44.entities.SystemEnhancement.filter(
        { source: 'autonomous' }, '-created_date', 20
      );
      setEnhancements(enh || []);
    } catch (e) { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runStrategy = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke('xtremePerfectionStrategy', {
        site_id: '6a97bd49702057bc9a36bc3d',
      });
      await load();
    } catch (e) {
      alert(e.message || 'Strategy generation failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const verdict = report?.launch_readiness_verdict || 'unknown';
  const vStyle = VERDICT_STYLE[verdict] || VERDICT_STYLE.unknown;
  const scores = report?.scores || {};
  const overall = report?.overall_score || 0;
  const dimensionAnalysis = report?.dimension_analysis || [];
  const archiveSystems = report?.competitor_benchmarks ? [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Brain className="w-5 h-5" />
            <h1 className="font-display text-2xl tracking-tight">Xtreme AI Perfection Strategy</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Full architectural breakdown, archive cleanup, and Vision Cortex autonomous operation plan for getxtremeai.com.
          </p>
        </div>
        <Button onClick={runStrategy} disabled={running} className="rounded-full">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? 'Generating strategy…' : 'Regenerate Strategy'}
        </Button>
      </div>

      {running && (
        <Card className="p-6 text-center border-border/60">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Deep architectural analysis with web research — identifying archive bloat, refactoring plan, and Vision Cortex operation model…</p>
        </Card>
      )}

      {!report && !running && (
        <Card className="p-10 text-center border-border/60">
          <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No strategy yet. Generate one to see the full breakdown.</p>
        </Card>
      )}

      {report && (
        <>
          {/* Verdict + scores */}
          <div className="grid lg:grid-cols-3 gap-3">
            <Card className={cn('p-5 lg:col-span-1', vStyle.border, vStyle.bg)}>
              <div className="flex items-start gap-3">
                {React.createElement(vStyle.icon, { className: cn('w-5 h-5 mt-0.5', vStyle.color) })}
                <div>
                  <p className={cn('text-[10px] uppercase tracking-widest font-medium', vStyle.color)}>Launch Readiness</p>
                  <p className="font-display text-2xl tracking-tight mt-0.5">{verdict.replace(/_/g, ' ')}</p>
                  <p className="font-mono text-sm text-muted-foreground mt-1">{overall}/100 overall</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 lg:col-span-2 border-border/60">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Dimension Scores</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Performance', val: scores.performance, color: 'text-amber-500' },
                  { label: 'SEO', val: scores.seo, color: 'text-sky-500' },
                  { label: 'Security', val: scores.security, color: 'text-rose-500' },
                  { label: 'A11y', val: scores.accessibility, color: 'text-violet-500' },
                  { label: 'Content', val: scores.content, color: 'text-emerald-500' },
                ].map((d) => (
                  <div key={d.label} className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">{d.label}</p>
                    <p className={cn('font-display text-2xl mt-0.5', d.color)}>{d.val || 0}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* System identity */}
          {report.system_description && (
            <Card className="p-5 border-border/60">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">System Identity</p>
              <p className="text-sm leading-relaxed">{report.system_description}</p>
              {report.tech_stack?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {report.tech_stack.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Overall summary */}
          {report.overall_summary && (
            <Card className="p-5 border-foreground/20 bg-muted/30">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Overall Summary</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.overall_summary}</p>
            </Card>
          )}

          {/* Perfection roadmap (enhancements) */}
          {enhancements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="w-4 h-4" />
                <h2 className="font-display text-xl tracking-tight">Perfection Roadmap</h2>
              </div>
              <div className="space-y-2">
                {enhancements.slice(0, 6).map((enh, i) => (
                  <Card key={enh.id} className="p-4 border-border/60">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                        <span className="font-mono text-sm font-medium">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{enh.title}</h4>
                          <Badge variant="outline" className="text-[9px] capitalize">{enh.category}</Badge>
                          <Badge variant="secondary" className="text-[9px]">P{enh.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{enh.description}</p>
                        {enh.technical_protocols?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {enh.technical_protocols.map((p, j) => (
                              <li key={j} className="text-xs text-foreground/80 flex gap-1.5">
                                <span className="text-muted-foreground">→</span> {p}
                              </li>
                            ))}
                          </ul>
                        )}
                        {enh.implementation_plan && (
                          <div className="mt-2 flex items-center gap-2">
                            <CopyButton text={enh.implementation_plan} label="Copy execution prompt" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Dimension perfection prompts */}
          {dimensionAnalysis.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4" />
                <h2 className="font-display text-xl tracking-tight">Dimension Perfection Prompts</h2>
              </div>
              <div className="space-y-2">
                {dimensionAnalysis.map((d, i) => (
                  <PromptBlock
                    key={i}
                    title={`${d.dimension} — ${d.current_score || 0} → 100`}
                    prompt={d.perfection_prompt}
                    icon={Wrench}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Benchmark */}
          {report.benchmark_system && (
            <Card className="p-5 border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Benchmark System</p>
              </div>
              <p className="text-sm font-medium">{report.benchmark_system}</p>
              {report.competitor_benchmarks?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {report.competitor_benchmarks.map((c, i) => (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span><span className="font-medium">{c.system}</span> — {c.strength}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}