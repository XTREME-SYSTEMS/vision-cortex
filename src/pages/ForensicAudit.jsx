import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ShieldCheck, RefreshCw, Target, AlertTriangle, Compass, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityColor = {
  critical: 'border-l-rose-500 bg-rose-500/5',
  high: 'border-l-orange-500 bg-orange-500/5',
  medium: 'border-l-amber-500 bg-amber-500/5',
  low: 'border-l-sky-500 bg-sky-500/5',
};

const priorityColor = {
  immediate: 'bg-rose-500/10 text-rose-600',
  'short-term': 'bg-amber-500/10 text-amber-600',
  'long-term': 'bg-sky-500/10 text-sky-600',
};

export default function ForensicAudit() {
  const [report, setReport] = useState(null);
  const [vision, setVision] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [deepRec, setDeepRec] = useState(null);
  const [deepLoading, setDeepLoading] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('forensicAudit', {});
      const data = res.data || res;
      if (data.error) { setError(data.error); }
      else {
        setReport(data.report);
        setVision(data.vision || '');
      }
    } catch (e) {
      setError(e.message || 'Forensic audit failed');
    }
    setRunning(false);
    setLoading(false);
  }, []);

  useEffect(() => { run(); }, [run]);

  // AI Assist: deep strategic recommendation beyond the standard audit
  const runDeepAssist = async () => {
    if (!report) return;
    setDeepLoading(true);
    setDeepRec(null);
    try {
      const res = await base44.functions.invoke('forensicAudit', { deep: true });
      const data = res.data || res;
      if (!data.error && data.report) setDeepRec(data.report);
    } catch {
      // silent — user can retry
    }
    setDeepLoading(false);
  };

  const score = report?.alignment_score ?? 0;
  const scoreTone = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShieldCheck className="w-4 h-4" /> Forensic Audit
          </div>
          <h1 className="font-display text-3xl mt-1 tracking-tight">Where does your life drift from your vision?</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            A forensic cross-reference of your simulation results, life plan, and vision statement. Every drift is named. Every correction is specific.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={run} disabled={running} className="rounded-full">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate Audit
          </Button>
          {report && (
            <Button onClick={runDeepAssist} disabled={deepLoading} className="rounded-full">
              {deepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Assist — Deep Strategy
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></Card>
      )}

      {error && (
        <Card className="p-6 border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {report && !error && (
        <>
          {/* Vision + Score */}
          <div className="grid md:grid-cols-[1fr_200px] gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your vision statement</p>
              </div>
              <p className="text-sm leading-relaxed">{vision || 'No vision statement found — complete the Destiny Flow first.'}</p>
            </Card>
            <Card className="p-5 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Alignment Score</p>
              <p className={cn('font-display text-5xl', scoreTone)}>{score}</p>
              <p className="text-xs text-muted-foreground mt-1">out of 100</p>
            </Card>
          </div>

          {/* Summary */}
          {report.summary && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-4 h-4 text-primary" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Forensic summary</p>
              </div>
              <p className="text-sm leading-relaxed">{report.summary}</p>
            </Card>
          )}

          {/* Drift points */}
          {report.drift_points?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Drift Points ({report.drift_points.length})
              </h2>
              <div className="space-y-2.5">
                {report.drift_points.map((d, i) => (
                  <Card key={i} className={cn('p-4 border-l-4', severityColor[d.severity])}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{d.area || 'General'}</span>
                          <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded', severityColor[d.severity]?.replace('bg-', 'text-').replace('/5', '') || '')}>
                            {d.severity}
                          </span>
                        </div>
                        {d.vision && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Vision:</span> {d.vision}</p>}
                        {d.actual && <p className="text-xs text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Actual:</span> {d.actual}</p>}
                        <p className="text-sm mt-1.5">{d.gap}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Course corrections */}
          {report.course_corrections?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Course Corrections ({report.course_corrections.length})
              </h2>
              <div className="space-y-2.5">
                {report.course_corrections.map((c, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1">
                        <p className="text-sm">{c.action}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.priority && (
                            <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded', priorityColor[c.priority])}>{c.priority}</span>
                          )}
                          {c.timeline && <span className="text-[10px] text-muted-foreground">⏱ {c.timeline}</span>}
                          {c.addresses && <span className="text-[10px] text-muted-foreground">→ fixes: {c.addresses}</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* AI Assist — Deep strategic recommendation */}
          {deepLoading && (
            <Card className="p-6 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating deep strategic recommendation…</span>
            </Card>
          )}
          {deepRec && !deepLoading && (
            <Card className="p-5 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-[11px] uppercase tracking-wider text-primary">AI Assist — Deep Strategy</p>
              </div>
              {deepRec.summary && <p className="text-sm leading-relaxed mb-3">{deepRec.summary}</p>}
              {deepRec.course_corrections?.length > 0 && (
                <div className="space-y-2">
                  {deepRec.course_corrections.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <p>{c.action}</p>
                        {c.rationale && <p className="text-xs text-muted-foreground mt-0.5">{c.rationale}</p>}
                      </div>
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