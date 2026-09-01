import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Rocket, FileText, Cpu, DollarSign, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Building2, Map, ShieldCheck, ListOrdered, AlertTriangle, Sparkles, Zap, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

function DocSection({ icon: Icon, label, value, tone }) {
  const [open, setOpen] = useState(false);
  if (!value) return null;
  const isLong = value.length > 200;
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 overflow-hidden">
      <button
        onClick={() => isLong && setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30"
      >
        <Icon className={cn('w-3.5 h-3.5 shrink-0', tone || 'text-muted-foreground')} />
        <span className={cn('text-[10px] uppercase tracking-wider flex-1', tone || 'text-muted-foreground')}>{label}</span>
        {isLong && (open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />)}
      </button>
      <div className="px-3 pb-3">
        <p className={cn('text-sm leading-relaxed whitespace-pre-wrap text-foreground/90', isLong && !open && 'line-clamp-3')}>{value}</p>
      </div>
    </div>
  );
}

function MethodCard({ method, index, onLaunch, launching, launched }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-l-4 border-emerald-500/40 rounded-lg bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">#{String(index + 1).padStart(2, '0')}</span>
              <span className="font-semibold text-sm">{method.business_name}</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> 100% AI-Automatable
              </Badge>
              {launched && (
                <Badge variant="outline" className="text-[10px] text-sky-600 border-sky-500/30 bg-sky-500/5">
                  <Rocket className="w-2.5 h-2.5 mr-1" /> Launched
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{method.one_liner}</p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-emerald-600 flex items-center gap-1"><DollarSign className="w-3 h-3" />{method.estimated_monthly_revenue}</span>
              <span className="text-muted-foreground flex items-center gap-1"><Rocket className="w-3 h-3" />{method.time_to_launch_days}d to launch</span>
              <span className="text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{method.industry}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onLaunch(method)}
            disabled={launching || launched}
            className="rounded-full shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : launched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {launched ? 'Launched' : 'Launch Now'}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 pl-7 space-y-2">
            <DocSection icon={Building2} label="Architecture Document" value={method.architecture_doc} tone="text-indigo-600" />
            <DocSection icon={Map} label="Strategy Document" value={method.strategy_doc} tone="text-blue-600" />
            <DocSection icon={ListOrdered} label="Playbook (Build Steps)" value={method.playbook} tone="text-amber-600" />
            <DocSection icon={DollarSign} label="Monetization Plan (Stripe)" value={method.monetization_plan} tone="text-emerald-600" />
            <DocSection icon={ShieldCheck} label="Risk Mitigation (Zero Failure)" value={method.risk_mitigation} tone="text-rose-600" />

            {method.build_order?.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><ListOrdered className="w-3 h-3" /> Build Order (Queue → Auto-Builder)</p>
                <ol className="space-y-1 text-sm">
                  {method.build_order.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-muted-foreground shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {method.validation_criteria?.length > 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Validation Criteria (Zero Failure Gates)</p>
                <ul className="space-y-1 text-sm">
                  {method.validation_criteria.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuildStrategyPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [launchingId, setLaunchingId] = useState(null);
  const [launchedIds, setLaunchedIds] = useState({});

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('shadowBuildStrategy', {});
      const data = res.data || res;
      if (data.error) { setError(data.error); }
      else { setResult(data); }
    } catch (e) {
      setError(e.message || 'Pipeline failed');
    }
    setRunning(false);
  };

  const launchMethod = async (method) => {
    if (!method.queue_id) return;
    setLaunchingId(method.queue_id);
    try {
      const res = await base44.functions.invoke('launchPipelineBuild', { id: method.queue_id });
      const data = res.data || res;
      if (data.launched) {
        setLaunchedIds((prev) => ({ ...prev, [method.queue_id]: data.vercel_project }));
      } else if (data.error) {
        setError(`Launch failed: ${data.error}`);
      }
    } catch (e) {
      setError(e.message || 'Launch failed');
    }
    setLaunchingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Rocket className="w-4 h-4" /> Build Strategy Pipeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluates every money-hunt method for 100% AI automatability → produces full architecture, strategy, playbooks → pushes to queue for auto-build.
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={running} className="rounded-full">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
          Run Build Strategy
        </Button>
      </div>

      {running && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Shadow is evaluating every method against the 6 gates: strategy, build, validate, launch, monetize, zero-failure…</span>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 border-rose-500/30 bg-rose-500/5">
          <p className="text-sm text-rose-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>
        </Card>
      )}

      {result && !running && (
        <>
          {Object.keys(launchedIds).length > 0 && (
            <Card className="p-4 bg-sky-500/5 border-sky-500/20">
              <p className="text-sm font-medium text-sky-700 dark:text-sky-400 flex items-center gap-2">
                <Rocket className="w-4 h-4" /> {Object.keys(launchedIds).length} project{Object.keys(launchedIds).length > 1 ? 's' : ''} launched
              </p>
              <div className="mt-2 space-y-1">
                {Object.entries(launchedIds).map(([qid, proj]) => (
                  <p key={qid} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-sky-600" />
                    Vercel project: <code className="font-mono text-foreground">{proj.name}</code> ({proj.id})
                  </p>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Pipeline Complete</p>
                <p className="text-xs text-muted-foreground mt-1">{result.executive_summary}</p>
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="text-muted-foreground">Evaluated: <strong className="text-foreground">{result.evaluated}</strong></span>
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Viable: <strong>{result.viable}</strong></span>
                  <span className="text-rose-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected: <strong>{result.rejected}</strong></span>
                  <span className="text-primary flex items-center gap-1"><Rocket className="w-3 h-3" /> Queued: <strong>{result.queued}</strong></span>
                </div>
              </div>
            </div>
          </Card>

          {result.viable_methods?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Viable Methods — Full Documentation
              </p>
              {result.viable_methods.map((m, i) => (
                <MethodCard
                  key={m.queue_id || i}
                  method={m}
                  index={i}
                  onLaunch={launchMethod}
                  launching={launchingId === m.queue_id}
                  launched={!!launchedIds[m.queue_id]}
                />
              ))}
            </div>
          )}

          {result.rejected_methods?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected Methods (Failed Gates)
              </p>
              {result.rejected_methods.map((r, i) => (
                <div key={i} className="border-l-4 border-rose-500/30 rounded-lg bg-card p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="text-sm font-medium">{r.headline}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-5">
                    Failed: <span className="text-rose-600">{(r.failure_gates || []).join(', ')}</span>
                    {r.reason && <span> — {r.reason}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}