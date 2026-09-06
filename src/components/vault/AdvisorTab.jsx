import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, Loader2, ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdvisorTab() {
  const [order, setOrder] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!order.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('financialAdvisor', { order: order.trim(), context: context.trim() });
      setResult(res);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4" /> Capital — Financial Advisor + Validator</h3>
        <p className="text-[11px] text-muted-foreground">Submit any financial order. Capital analyzes it, then Validator MUST check off before any action can execute.</p>
        <div>
          <Label className="text-[11px]">Order / Question</Label>
          <Input value={order} onChange={e => setOrder(e.target.value)} placeholder="Should I invest $5,000 in Bitcoin now?" className="h-9" />
        </div>
        <div>
          <Label className="text-[11px]">Additional Context (optional)</Label>
          <Input value={context} onChange={e => setContext(e.target.value)} placeholder="Current portfolio: 60% crypto, 40% cash" className="h-9" />
        </div>
        <Button size="sm" onClick={submit} disabled={loading || !order.trim()}>
          {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Brain className="w-4 h-4 mr-1.5" />}
          {loading ? 'Analyzing…' : 'Submit to Advisor'}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Advisor recommendation */}
          {result.advisor && (
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-sky-500" /> Capital's Recommendation</h4>
              <div className="flex items-center gap-2">
                <span className={cn('text-lg font-bold', result.advisor.recommendation === 'REJECT' ? 'text-red-500' : 'text-emerald-500')}>{result.advisor.recommendation}</span>
                <span className="text-[11px] text-muted-foreground">Confidence: {Math.round((result.advisor.confidence || 0) * 100)}%</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', result.advisor.risk_level === 'critical' ? 'bg-red-500/10 text-red-500' : result.advisor.risk_level === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500')}>{result.advisor.risk_level} risk</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.advisor.rationale}</p>
              {result.advisor.expected_return && <p className="text-[11px]"><span className="text-muted-foreground">Expected return:</span> {result.advisor.expected_return}</p>}
              {result.advisor.position_size && <p className="text-[11px]"><span className="text-muted-foreground">Position size:</span> {result.advisor.position_size}</p>}
              {result.advisor.stop_loss && <p className="text-[11px]"><span className="text-muted-foreground">Stop loss:</span> {result.advisor.stop_loss}</p>}
              {result.advisor.take_profit && <p className="text-[11px]"><span className="text-muted-foreground">Take profit:</span> {result.advisor.take_profit}</p>}
              {result.advisor.alternatives?.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Alternatives:</p>
                  {result.advisor.alternatives.map((a, i) => <p key={i} className="text-[11px] text-muted-foreground">• {a}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Validator verdict */}
          {result.validation && (
            <div className={cn('rounded-xl border p-4 space-y-2', result.can_execute ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5')}>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                {result.can_execute ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
                Validator Verdict: {result.validation.verdict}
              </h4>
              {result.validation.checks_passed?.length > 0 && (
                <div>
                  <p className="text-[10px] text-emerald-500 mb-0.5">✓ Checks Passed:</p>
                  {result.validation.checks_passed.map((c, i) => <p key={i} className="text-[11px] text-muted-foreground flex gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {c}</p>)}
                </div>
              )}
              {result.validation.checks_failed?.length > 0 && (
                <div>
                  <p className="text-[10px] text-red-500 mb-0.5">✗ Checks Failed:</p>
                  {result.validation.checks_failed.map((c, i) => <p key={i} className="text-[11px] text-muted-foreground flex gap-1"><XCircle className="w-3 h-3 text-red-500 shrink-0" /> {c}</p>)}
                </div>
              )}
              {result.validation.risk_assessment && <p className="text-[11px] text-muted-foreground italic">{result.validation.risk_assessment}</p>}
              {result.validation.required_modifications?.length > 0 && (
                <div>
                  <p className="text-[10px] text-amber-500 mb-0.5">Required Modifications:</p>
                  {result.validation.required_modifications.map((m, i) => <p key={i} className="text-[11px] text-muted-foreground">• {m}</p>)}
                </div>
              )}
              <div className={cn('flex items-center gap-2 pt-2 border-t border-border/30', result.can_execute ? 'text-emerald-500' : 'text-red-500')}>
                {result.can_execute ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="text-xs font-semibold">{result.message}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}