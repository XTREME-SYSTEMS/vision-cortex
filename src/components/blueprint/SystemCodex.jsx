import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, Cpu, Layers, Rocket, Zap, Server, Database, Globe, Brain, Search, CreditCard, Wrench, Target, Activity, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const LAYER_META = {
  core: { label: 'Core Engine', icon: Cpu, color: 'text-violet-500', bg: 'bg-violet-500/8', border: 'border-violet-500/30' },
  discover: { label: 'Discovery', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/8', border: 'border-blue-500/30' },
  audit: { label: 'Audit', icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-500/8', border: 'border-cyan-500/30' },
  heal: { label: 'Self-Healing', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/8', border: 'border-emerald-500/30' },
  evolve: { label: 'Self-Evolution', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/8', border: 'border-purple-500/30' },
  build: { label: 'Build Factory', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/8', border: 'border-amber-500/30' },
  monetize: { label: 'Monetization', icon: CreditCard, color: 'text-yellow-500', bg: 'bg-yellow-500/8', border: 'border-yellow-500/30' },
  scrape: { label: 'Intelligence Gathering', icon: Search, color: 'text-rose-500', bg: 'bg-rose-500/8', border: 'border-rose-500/30' },
};

export default function SystemCodex() {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.DeepSpec.list('-created_date', 100);
      setSpecs(list || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke('seedDeepSpecs', {});
      await load();
    } catch (e) { console.error(e); }
    setSeeding(false);
  };

  // Group specs by spec_type
  const grouped = specs.reduce((acc, s) => {
    const key = s.spec_type || 'core';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4" /> System Codex — All Operations as DEEP State Machines
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {specs.length} specs codified · each is a deterministic, replayable, score-gated state machine — the autonomously implementable plan
          </p>
        </div>
        <button
          onClick={seed}
          disabled={seeding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
          {seeding ? 'Codifying...' : 'Codify System'}
        </button>
      </div>

      {loading && specs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading codex...
        </div>
      ) : specs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg">
          No DEEP specs yet. Click "Codify System" to transform all system operations into deterministic state machines.
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, typeSpecs]) => {
            const meta = LAYER_META[type] || LAYER_META.core;
            const Icon = meta.icon;
            return (
              <div key={type} className={cn('rounded-lg border p-3', meta.border, meta.bg)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', meta.color)} />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">({typeSpecs.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {typeSpecs.map((spec) => (
                    <div key={spec.id} className="rounded-md border border-border/40 bg-card p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-muted-foreground/70">{spec.spec_id}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto">v{spec.version}</span>
                      </div>
                      <div className="text-[12px] font-medium mb-0.5">{spec.title}</div>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{spec.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
                        <span>{(spec.states || []).length} states</span>
                        <span>·</span>
                        <span>{(spec.llm_slots || []).length} LLM slots</span>
                        <span>·</span>
                        <span>{(spec.gates || []).length} gates</span>
                        <span>·</span>
                        <span className={cn('font-medium', spec.cost_budget_credits === 0 ? 'text-emerald-500' : 'text-amber-500')}>
                          {spec.cost_budget_credits === 0 ? 'zero-credit' : `${spec.cost_budget_credits}cr`}
                        </span>
                        <span>·</span>
                        <span>target {(spec.score_target * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}