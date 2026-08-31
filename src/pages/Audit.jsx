import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle, Lightbulb, RefreshCw } from 'lucide-react';

export default function Audit() {
  const [running, setRunning] = useState(false);
  const [healing, setHealing] = useState(false);
  const [data, setData] = useState(null);
  const [heal, setHeal] = useState(null);
  const [err, setErr] = useState('');

  const run = async () => {
    setRunning(true); setErr(''); setData(null);
    try {
      const res = await base44.functions.invoke('auditDestinyEngine', {});
      setData(res.data);
    } catch (e) {
      setErr('Audit failed — try again.');
    } finally { setRunning(false); }
  };

  const healEngine = async () => {
    setHealing(true); setErr(''); setHeal(null);
    try {
      const res = await base44.functions.invoke('healDestinyEngine', { brand_limit: 10 });
      setHeal(res.data?.remediation);
      await run();
    } catch (e) {
      setErr('Heal failed — try again.');
    } finally { setHealing(false); }
  };

  const report = data?.report;
  const stats = data?.stats;
  const score = report?.score ?? 0;
  const passed = report?.passed;
  const scoreColor = score >= 85 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-destructive';

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Engine Audit · Step 7</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Zero-failure quality gate.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          The audit layer inspects the entire Destiny Engine — pipeline integrity, data health, loop closure, and security posture — and scores it. Every audit is persisted to the SystemEnhancement ledger.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={run} disabled={running || healing} className="rounded-full">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Run engine audit
        </Button>
        <Button onClick={healEngine} disabled={running || healing} variant="outline" className="rounded-full">
          {healing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Heal engine
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>

      {heal && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Healing pass complete
          </div>
          <p className="text-muted-foreground mt-1">
            Branded <b>{heal.branded}</b> ideas · linked <b>{heal.linked_builds}</b> builds · validated <b>{heal.validated_doctrines}</b> doctrines.
          </p>
        </div>
      )}

      {running && !data && (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Score */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-6 flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-muted" />
                <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round"
                  className={passed ? 'stroke-emerald-500' : 'stroke-amber-500'}
                  strokeDasharray={`${(score / 100) * 276} 276`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-display text-3xl ${scoreColor}`}>{score}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {passed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                <h2 className="font-display text-2xl tracking-tight">{passed ? 'Audit passed' : 'Audit requires action'}</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{report?.verdict}</p>
            </div>
          </section>

          {/* Stats */}
          {stats && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h3 className="font-medium mb-3">Engine vitals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <Vital label="Ideas" value={stats.ideas} sub={`${stats.ideas_branded} branded`} />
                <Vital label="Unbranded" value={stats.ideas_without_branding} tone={stats.ideas_without_branding ? 'neg' : ''} />
                <Vital label="Simulations" value={stats.simulations} sub={`${stats.sims_with_forecast} forecasted`} />
                <Vital label="Builds" value={stats.builds} sub={`${stats.builds_launched} launched`} />
                <Vital label="Orphan builds" value={stats.builds_without_idea} tone={stats.builds_without_idea ? 'neg' : ''} />
                <Vital label="Doctrines" value={stats.doctrines} sub={`${stats.doctrines_marketer} from revenue`} />
                <Vital label="Validated" value={stats.doctrines_validated} />
                <Vital label="Enhancements" value={stats.enhancements} sub={`${stats.enhancements_implemented} done`} />
              </div>
            </section>
          )}

          {/* Failures */}
          {report?.failures?.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3"><XCircle className="w-4 h-4 text-destructive" /><h3 className="font-medium">Failures</h3></div>
              <ul className="space-y-2">
                {report.failures.map((f, i) => (
                  <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                    <span className="font-mono text-xs text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>{f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommendations */}
          {report?.recommendations?.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4" /><h3 className="font-medium">Recommendations</h3></div>
              <ul className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                    <span className="font-mono text-xs text-muted-foreground mt-0.5">→</span>{r}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Vital({ label, value, sub, tone }) {
  const c = tone === 'neg' ? 'text-destructive' : '';
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-display text-xl mt-0.5 ${c}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}