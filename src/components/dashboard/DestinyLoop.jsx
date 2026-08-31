import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { money } from '@/components/ideas/format';
import { Link } from 'react-router-dom';

export default function DestinyLoop() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const run = async () => {
    setRunning(true); setErr(''); setResult(null);
    try {
      const res = await base44.functions.invoke('runDestinyCycle', {});
      setResult(res.data);
    } catch (e) {
      setErr('Cycle failed — try again.');
    } finally { setRunning(false); }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Autonomous Loop · 24/7</p>
          <h3 className="font-display text-2xl tracking-tight mt-1">Destiny Engine cycle</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
            One pass: forecast → brand → website → content for the top opportunity, left approval-ready.
          </p>
        </div>
        <Button onClick={run} disabled={running} className="rounded-full">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Run cycle
        </Button>
      </div>

      {err && <p className="text-sm text-destructive mt-4">{err}</p>}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Cycled <span className="font-medium">{result.idea?.title}</span> → branded <span className="font-medium">{result.brand?.brand_name}</span></span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Net profit" value={money(result.metrics?.total_profit)} />
            <Mini label="ROI" value={`${Math.round(result.metrics?.roi_pct || 0)}%`} />
            <Mini label="Break-even" value={result.metrics?.break_even_day ? `Day ${Math.round(result.metrics.break_even_day)}` : '—'} />
            <Mini label="Content posts" value={result.content_count || 0} />
          </div>

          {result.brand?.palette && (
            <div className="flex gap-1.5">
              {result.brand.palette.map((c) => (
                <div key={c} className="w-7 h-7 rounded-md border border-border/60" style={{ background: c }} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link to="/approvals"><Button variant="outline" size="sm" className="rounded-full">Review & approve <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
            <Link to="/simulation"><Button variant="ghost" size="sm" className="rounded-full">Open simulation</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-lg mt-0.5">{value}</p>
    </div>
  );
}