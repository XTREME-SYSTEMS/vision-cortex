import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PortfolioCard from '@/components/papertrade/PortfolioCard';
import TradeRow from '@/components/papertrade/TradeRow';
import CharterCard from '@/components/papertrade/CharterCard';
import { Play, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function PaperTrade() {
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [blueprintError, setBlueprintError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ps, ts] = await Promise.all([
        base44.entities.Portfolio.list('-created_date', 1),
        base44.entities.Trade.list('-created_date', 50)
      ]);
      setPortfolio(ps[0] || null);
      setTrades(ts);
    } catch (e) {
      setLastResult({ error: e.message });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCycle = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await base44.functions.invoke('councilPredict', {});
      setLastResult(res);
      await load();
    } catch (e) {
      setLastResult({ error: e.message });
    }
    setRunning(false);
  };

  const generateBlueprint = async () => {
    setGenerating(true);
    setBlueprintError(null);
    try {
      const res = await base44.functions.invoke('councilBlueprint', {});
      setBlueprint(res?.idea || null);
    } catch (e) {
      setBlueprintError(e.message);
    }
    setGenerating(false);
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading paper fund…</div>;

  const openCount = trades.filter((t) => t.status === 'open').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Paper Trading Desk</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            The Council identifies the highest-conviction opportunity, Shadow gathers directed intel to push accuracy toward 90%,
            and the trade resolves against real market prices. Mission: double the $10M account daily. 10-win streak unlocks the reward.
          </p>
        </div>
        <Button onClick={runCycle} disabled={running} size="lg" className="min-w-44">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Deliberating…</> : <><Play className="w-4 h-4" /> Run next cycle</>}
        </Button>
      </div>

      <PortfolioCard portfolio={portfolio} />

      <CharterCard
        portfolio={portfolio}
        trades={trades}
        onGenerate={generateBlueprint}
        generating={generating}
        blueprint={blueprint}
        blueprintError={blueprintError}
      />

      {lastResult?.error && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/5">
          <p className="text-sm text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {lastResult.error}</p>
        </Card>
      )}

      {lastResult && !lastResult.error && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Latest cycle
          </p>
          {lastResult.resolved && (
            <p className="text-sm mb-2">
              Resolved D{lastResult.resolved.day} {lastResult.resolved.asset}: {' '}
              <span className={lastResult.resolved.won ? 'text-emerald-600' : 'text-rose-600'}>
                {lastResult.resolved.won ? 'WIN' : 'LOSS'} ({(lastResult.resolved.pnl_pct >= 0 ? '+' : '') + lastResult.resolved.pnl_pct.toFixed(2)}%)
              </span>
              {' · '}streak {lastResult.resolved.streak}/10
            </p>
          )}
          {lastResult.trade && (
            <p className="text-sm">
              Opened <span className="font-medium">{lastResult.trade.direction} {lastResult.trade.asset}</span>
              {' '}@ {lastResult.trade.entry_price ? '$' + lastResult.trade.entry_price : 'pending price'}
              {' · '}confidence {lastResult.trade.confidence}%
              {' · '}${Math.round(lastResult.trade.position_size_usd || 0).toLocaleString()}
            </p>
          )}
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xl">Trade log</h2>
          <span className="text-xs text-muted-foreground">{trades.length} trades · {openCount} open</span>
        </div>
        <Card className="px-5">
          {trades.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground text-sm">
              No trades yet. Run the first cycle to let the Council open its initial position.
            </p>
          ) : (
            trades.map((t) => <TradeRow key={t.id} trade={t} />)
          )}
        </Card>
      </div>
    </div>
  );
}