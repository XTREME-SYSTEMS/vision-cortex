import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanLine, Sparkles, Play, ShieldCheck, CheckCircle2, AlertTriangle, Code2, Globe, RefreshCw, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColor = {
  pending: 'bg-muted text-muted-foreground',
  approved: 'bg-sky-500/10 text-sky-600',
  in_progress: 'bg-amber-500/10 text-amber-600',
  implemented: 'bg-blue-500/10 text-blue-600',
  validating: 'bg-purple-500/10 text-purple-600',
  audited: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-rose-500/10 text-rose-600',
  blocked: 'bg-rose-500/10 text-rose-600',
  optimized: 'bg-emerald-500/10 text-emerald-600',
};

const categoryColor = {
  feature: 'bg-blue-500/10 text-blue-600',
  hardening: 'bg-rose-500/10 text-rose-600',
  optimization: 'bg-amber-500/10 text-amber-600',
  healing: 'bg-emerald-500/10 text-emerald-600',
  doctrine: 'bg-purple-500/10 text-purple-600',
  integration: 'bg-sky-500/10 text-sky-600',
};

function EnhancementRow({ item, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(null);

  const approve = async () => {
    setLoading('approve');
    await base44.entities.SystemEnhancement.update(item.id, { approved: true, status: 'approved', last_action_at: new Date().toISOString() });
    onUpdate();
    setLoading(null);
  };

  const implement = async () => {
    setLoading('implement');
    try {
      await base44.functions.invoke('implementEnhancement', { enhancement_id: item.id });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(null);
  };

  const regenerate = async () => {
    setLoading('regenerate');
    try {
      await base44.entities.SystemEnhancement.update(item.id, { status: 'pending', approved: false, audit_result: null, fix_attempts: 0, implementation_code: null });
      await base44.functions.invoke('implementEnhancement', { enhancement_id: item.id });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(null);
  };

  const score = item.audit_result?.score;
  const passed = item.audit_result?.passed;

  return (
    <div className="border-l-4 border-border border-y border-r rounded-lg bg-card overflow-hidden">
      <div className="flex items-stretch">
        <div className="w-12 shrink-0 grid place-items-center text-lg font-mono font-semibold text-muted-foreground border-r border-border/40">
          {item.number || '—'}
        </div>
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start gap-3">
            <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.title}</div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.downfall || item.description}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {item.category && <Badge variant="outline" className={cn('text-[10px]', categoryColor[item.category])}>{item.category}</Badge>}
              <Badge variant="outline" className={cn('text-[10px]', statusColor[item.status])}>{item.status}</Badge>
              {score !== undefined && (
                <Badge variant="outline" className={cn('text-[10px]', passed ? 'text-emerald-600' : 'text-rose-600')}>
                  {score}/100
                </Badge>
              )}
            </div>
          </div>

          {expanded && (
            <div className="mt-4 pl-7 space-y-4">
              {/* Existing system */}
              {item.existing_system && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Existing System</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.existing_system}</p>
                </div>
              )}

              {/* Downfall */}
              {item.downfall && (
                <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-rose-600 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Downfall</p>
                  <p className="text-sm leading-relaxed">{item.downfall}</p>
                </div>
              )}

              {/* Recommended enhancement */}
              {item.recommended_enhancement && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Recommended Enhancement</p>
                  <p className="text-sm leading-relaxed">{item.recommended_enhancement}</p>
                </div>
              )}

              {/* Technical protocols */}
              {item.technical_protocols?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Globe className="w-3 h-3" /> Technical Protocols (web-searched)</p>
                  <div className="space-y-1">
                    {item.technical_protocols.map((p, i) => (
                      <div key={i} className="text-xs flex gap-2">
                        <span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                        <span className="leading-relaxed">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Surround enhancements */}
              {item.surround_enhancements?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Surrounding Enhancements</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.surround_enhancements.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Web sources */}
              {item.web_search_sources?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Sources</p>
                  <div className="space-y-0.5">
                    {item.web_search_sources.filter(Boolean).slice(0, 5).map((s, i) => (
                      <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" /> {s}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Implementation code */}
              {item.implementation_code && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Code2 className="w-3 h-3" /> Implementation Code</p>
                  <pre className="text-[11px] font-mono bg-muted/40 border border-border/40 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap">{item.implementation_code}</pre>
                </div>
              )}

              {/* Validation result */}
              {item.audit_result && (
                <div className={cn('rounded-lg p-3 border', passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20')}>
                  <div className="flex items-center gap-2">
                    {passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                    <span className="text-sm font-medium">Validation: {passed ? 'PASSED at 100%' : `FAILED at ${score}%`}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{item.fix_attempts || 0} attempt(s)</span>
                  </div>
                  {item.audit_result.failures?.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-rose-600 list-disc list-inside">
                      {item.audit_result.failures.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {!item.approved && item.status === 'pending' && (
                  <Button size="sm" onClick={approve} disabled={loading === 'approve'}>
                    {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Approve
                  </Button>
                )}
                {item.approved && item.status !== 'audited' && item.status !== 'failed' && (
                  <Button size="sm" onClick={implement} disabled={loading === 'implement'}>
                    {loading === 'implement' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Implement & Validate
                  </Button>
                )}
                {item.status === 'failed' && (
                  <Button size="sm" variant="outline" onClick={regenerate} disabled={loading === 'regenerate'}>
                    {loading === 'regenerate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regenerate & Retry
                  </Button>
                )}
                {item.status === 'audited' && (
                  <Button size="sm" variant="outline" onClick={regenerate} disabled={loading === 'regenerate'}>
                    {loading === 'regenerate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SystemAnalyst() {
  const [items, setItems] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [wealthSweeping, setWealthSweeping] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);

  const load = useCallback(async () => {
    const all = await base44.entities.SystemEnhancement.list('-created_date', 100).catch(() => []);
    // Sort by number, filter to system_analyst source
    const analystItems = all.filter((e) => e.source === 'system_analyst' || e.existing_system);
    analystItems.sort((a, b) => (a.number || 999) - (b.number || 999));
    setItems(analystItems);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('systemAnalyst', {});
      const data = res.data || res;
      if (data.error) setError(data.error);
      else setLastScan(data);
      await load();
    } catch (e) {
      setError(e.message || 'System scan failed');
    }
    setScanning(false);
  };

  const runWealthSweep = async () => {
    setWealthSweeping(true);
    setError(null);
    try {
      await base44.functions.invoke('wealthSweep', {});
    } catch (e) {
      setError(e.message || 'Wealth sweep failed');
    }
    setWealthSweeping(false);
  };

  const stats = {
    total: items?.length || 0,
    pending: items?.filter((i) => i.status === 'pending').length || 0,
    approved: items?.filter((i) => i.approved).length || 0,
    implemented: items?.filter((i) => i.status === 'audited').length || 0,
    failed: items?.filter((i) => i.status === 'failed').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ScanLine className="w-4 h-4" /> System Analyst Agent
          </div>
          <h1 className="font-display text-3xl mt-1 tracking-tight">End-to-End System Audit</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            Scans the system daily for gaps and enhancement opportunities. Each recommendation is run through web search for the absolute greatest technical protocols — then numbered, approved, implemented, and validated to 100% capability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runWealthSweep} disabled={wealthSweeping} className="rounded-full">
            {wealthSweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Wealth Sweep
          </Button>
          <Button onClick={runScan} disabled={scanning} className="rounded-full">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            Run System Scan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, tone: 'text-foreground' },
          { label: 'Pending', value: stats.pending, tone: 'text-muted-foreground' },
          { label: 'Approved', value: stats.approved, tone: 'text-sky-600' },
          { label: 'Validated', value: stats.implemented, tone: 'text-emerald-600' },
          { label: 'Failed', value: stats.failed, tone: 'text-rose-600' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className={cn('font-display text-2xl', s.tone)}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-2 text-sm text-rose-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {scanning && (
        <Card className="p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Scanning system and searching web for best technical protocols…</span>
        </Card>
      )}

      {lastScan && !scanning && (
        <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Last scan: {lastScan.created} enhancement(s) identified with web-searched protocols.
          </p>
        </Card>
      )}

      {/* Numbered enhancements */}
      {items === null && !scanning && (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></Card>
      )}

      {items?.length === 0 && !scanning && (
        <Card className="p-8 text-center">
          <ScanLine className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No enhancements yet. Run a system scan to identify gaps and generate web-searched recommendations.</p>
        </Card>
      )}

      {items?.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <EnhancementRow key={item.id} item={item} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}