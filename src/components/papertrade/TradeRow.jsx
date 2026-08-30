import React from 'react';
import { ArrowUpRight, ArrowDownRight, Circle, CheckCircle2, XCircle } from 'lucide-react';

const statusMap = {
  open: { icon: Circle, label: 'Open', cls: 'text-amber-500' },
  resolved_won: { icon: CheckCircle2, label: 'Won', cls: 'text-emerald-500' },
  resolved_lost: { icon: XCircle, label: 'Lost', cls: 'text-rose-500' },
  resolved_breakeven: { icon: Circle, label: 'Flat', cls: 'text-muted-foreground' }
};

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const usd = (n) => (n >= 0 ? '+' : '') + '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function TradeRow({ trade }) {
  const s = statusMap[trade.status] || statusMap.open;
  const StatusIcon = s.icon;
  const long = trade.direction !== 'short';
  const pnl = trade.pnl_usd;

  return (
    <div className="border-b border-border/60 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground w-10">D{trade.day}</span>
        <span className="font-medium">{trade.asset}</span>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${long ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
          {long ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trade.direction}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs ${s.cls}`}>
          <StatusIcon className="w-3.5 h-3.5" /> {s.label}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          Confidence <span className="text-foreground font-medium">{fmt(trade.confidence)}%</span>
        </span>
      </div>

      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{trade.thesis}</p>

      {trade.accuracy_drivers?.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Shadow accuracy drivers</p>
          <div className="flex flex-wrap gap-1.5">
            {trade.accuracy_drivers.map((d, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted text-foreground/80">{d}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
        <span>Size: <span className="text-foreground">${fmt(trade.position_size_usd)}</span></span>
        <span>Entry: <span className="text-foreground">{trade.entry_price ? '$' + fmt(trade.entry_price) : '—'}</span></span>
        {trade.exit_price ? <span>Exit: <span className="text-foreground">${fmt(trade.exit_price)}</span></span> : null}
        {trade.target_return_pct ? <span>Target: <span className="text-foreground">+{fmt(trade.target_return_pct)}%</span></span> : null}
        {pnl != null && (
          <span className={pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            PnL: {usd(pnl)} ({(pnl >= 0 ? '+' : '') + fmt(trade.pnl_pct)}%)
          </span>
        )}
      </div>

      {trade.shadow_intel_sources?.length > 0 && (
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          Intel sources: {trade.shadow_intel_sources.join(' · ')}
        </p>
      )}
    </div>
  );
}