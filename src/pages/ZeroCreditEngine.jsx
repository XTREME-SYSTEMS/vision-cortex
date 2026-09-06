import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Loader2, Plus, Zap, Database, Activity, Globe, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const VERTICALS = ['Epoxy_Flooring', 'Franchise_Sales', 'B2B_Data_Competitor', 'SaaS_Clone'];

const stateColor = {
  Pending_Scrape: 'bg-slate-500/15 text-slate-500',
  Mined_Raw: 'bg-sky-500/15 text-sky-500',
  Enriched_Structured: 'bg-violet-500/15 text-violet-500',
  Portal_Generated: 'bg-indigo-500/15 text-indigo-500',
  Outreach_Active: 'bg-amber-500/15 text-amber-500',
  Converted: 'bg-emerald-500/15 text-emerald-500',
  Healing_Active: 'bg-rose-500/15 text-rose-500',
};

export default function ZeroCreditEngine() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [newVertical, setNewVertical] = useState('SaaS_Clone');
  const [newPriority, setNewPriority] = useState(3);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runIntelligenceCycle', { mode: 'status' });
      setStatus(res.data || res);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load status — ensure Supabase secrets are set and the discovery_targets table exists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const processNext = async () => {
    setProcessing(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('runIntelligenceCycle', { mode: 'process' });
      setResult(res.data || res);
      await loadStatus();
    } catch (e) {
      setError(e.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const addTarget = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      await base44.functions.invoke('runIntelligenceCycle', {
        mode: 'add',
        domain_name: newDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        industry_vertical: newVertical,
        priority_rank: newPriority
      });
      setNewDomain('');
      await loadStatus();
    } catch (e) {
      setError(e.message || 'Failed to add target');
    } finally {
      setAdding(false);
    }
  };

  const queue = status?.queue || {};
  const targets = status?.recent_targets || [];

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading">Zero-Credit Engine</h1>
          <p className="text-xs text-muted-foreground">Decoupled fabric v44 — Vercel Cron + Groq + Supabase free tier · zero Base44 credit dependency</p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
            <Zap className="w-3 h-3" /> Zero-Credit
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground font-mono">
            {status?.groq_model || 'llama-3.3-70b-versatile'}
          </span>
        </div>
      </div>

      {error && (
        <div className="border border-rose-500/30 bg-rose-500/5 rounded-lg p-3 text-xs text-rose-500">
          {error}
        </div>
      )}

      {/* Queue stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pending Scrape', value: queue.pending_scrape, icon: Globe, color: 'text-slate-500' },
          { label: 'Enriched', value: queue.enriched, icon: Database, color: 'text-violet-500' },
          { label: 'Outreach Active', value: queue.outreach_active, icon: Activity, color: 'text-amber-500' },
          { label: 'Converted', value: queue.converted, icon: Zap, color: 'text-emerald-500' },
        ].map((s) => (
          <div key={s.label} className="border rounded-lg p-3 bg-card border-border">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('w-3.5 h-3.5', s.color)} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-heading">{loading ? '—' : s.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Cron info + manual trigger */}
      <div className="border rounded-lg p-4 bg-card border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Intelligence Cycle</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Vercel Cron triggers every 5 min → processes one target per cycle via Groq + Supabase
            </p>
          </div>
          <button
            onClick={processNext}
            disabled={processing}
            className="flex items-center gap-2 bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Process Next
          </button>
        </div>
        {result && (
          <div className={cn('border rounded-md p-3 text-xs', result.status === 'idle' ? 'bg-muted/30 border-border' : 'bg-emerald-500/5 border-emerald-500/30')}>
            {result.status === 'idle' ? (
              <span className="text-muted-foreground">{result.message}</span>
            ) : (
              <div className="space-y-1">
                <p><span className="text-muted-foreground">Target:</span> {result.processed_target}</p>
                <p><span className="text-muted-foreground">Score:</span> <span className="font-mono font-medium">{result.assigned_score}/100</span></p>
                <p><span className="text-muted-foreground">Action:</span> {result.recommended_action}</p>
                <p><span className="text-muted-foreground">Transition:</span> {result.pipeline_transition}</p>
                {(result.discovered_gaps || []).length > 0 && (
                  <p><span className="text-muted-foreground">Gaps:</span> {result.discovered_gaps.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add target */}
      <div className="border rounded-lg p-4 bg-card border-border space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add Discovery Target</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="competitor-domain.com"
            className="md:col-span-6 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={newVertical}
            onChange={(e) => setNewVertical(e.target.value)}
            className="md:col-span-3 bg-muted rounded-md px-3 py-2 text-sm outline-none"
          >
            {VERTICALS.map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(Number(e.target.value))}
            className="md:col-span-2 bg-muted rounded-md px-3 py-2 text-sm outline-none"
          >
            <option value={1}>P1 (high)</option>
            <option value={2}>P2</option>
            <option value={3}>P3</option>
            <option value={4}>P4</option>
            <option value={5}>P5 (low)</option>
          </select>
          <button
            onClick={addTarget}
            disabled={adding || !newDomain.trim()}
            className="md:col-span-1 flex items-center justify-center gap-1 bg-foreground text-background rounded-md py-2 text-sm disabled:opacity-40 hover:opacity-90"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Recent targets */}
      <div className="border rounded-lg p-4 bg-card border-border">
        <h3 className="text-sm font-medium mb-2">Recent Targets</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading from Supabase…
          </div>
        ) : targets.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            No targets yet. Add a domain above or run the SQL migration in your Supabase SQL editor to create the discovery_targets table.
          </p>
        ) : (
          <div className="space-y-1.5">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-xs border rounded-md p-2.5 bg-muted/30 border-border">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate flex-1">{t.domain_name}</span>
                <span className="text-muted-foreground hidden md:block">{t.industry_vertical?.replace(/_/g, ' ')}</span>
                <span className="font-mono text-muted-foreground">P{t.priority_rank}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', stateColor[t.automation_state] || 'bg-muted text-muted-foreground')}>
                  {t.automation_state?.replace(/_/g, ' ')}
                </span>
                <span className={cn('font-mono font-medium w-10 text-right', (t.commercial_value_score || 0) >= 65 ? 'text-emerald-500' : 'text-muted-foreground')}>
                  {t.commercial_value_score || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}