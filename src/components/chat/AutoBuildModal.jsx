import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, X, Hammer, Rocket, CheckCircle, AlertCircle, Server, Database, Cloud, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = [
  { value: 'marketing_site', label: 'Marketing Site' },
  { value: 'web_app', label: 'Web App / SaaS' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'platform', label: 'Platform / Marketplace' },
];

const STACK = [
  { icon: Rocket, label: 'Vercel', role: 'Frontend', color: 'text-black dark:text-white' },
  { icon: Hammer, label: 'AI Gateway', role: 'LLM', color: 'text-purple-500' },
  { icon: Database, label: 'Supabase', role: 'Backend', color: 'text-emerald-500' },
  { icon: Cloud, label: 'Drive', role: 'Data', color: 'text-blue-500' },
  { icon: Server, label: 'Workspace', role: 'Docs', color: 'text-amber-500' },
  { icon: Box, label: 'Railway', role: 'Containers', color: 'text-pink-500' },
];

export default function AutoBuildModal({ onClose, onComplete }) {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [productType, setProductType] = useState('marketing_site');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const launch = async () => {
    if (!businessName.trim()) { setError('Business name is required.'); return; }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('autoBuildOrchestrator', {
        business_name: businessName.trim(),
        industry: industry.trim() || 'general',
        product_type: productType,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setResult(data);
      onComplete?.(data);
    } catch (e) {
      setError(e.message || 'Failed to run auto builder');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Auto Builder</h3>
              <p className="text-[11px] text-muted-foreground">Step-by-step onboarding → auto-provision</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stack preview */}
          <div className="grid grid-cols-3 gap-2">
            {STACK.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-lg border border-border/60 bg-muted/30 p-2 text-center">
                  <Icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
                  <p className="text-[11px] font-medium">{s.label}</p>
                  <p className="text-[9px] text-muted-foreground">{s.role}</p>
                </div>
              );
            })}
          </div>

          {!result && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Epoxy Co."
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Industry</label>
                <input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. epoxy, hvac, roofing"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
                >
                  {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/5 border border-red-500/30 rounded-lg p-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={launch}
                disabled={running}
                className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {running ? 'Building + Provisioning…' : 'Launch Auto Build'}
              </button>
              {running && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Running onboarding journey (profile → vision → strategy → brand → content → website) then provisioning the full stack. This takes ~30-60s.
                </p>
              )}
            </>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm font-medium">Build complete</p>
              </div>
              {result.deploy_url && (
                <a href={result.deploy_url} target="_blank" rel="noreferrer" className="block w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:bg-primary/90">
                  Open Deployed Site ↗
                </a>
              )}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Provisioning</p>
                {[
                  { key: 'vercel', label: 'Vercel (Frontend)' },
                  { key: 'supabase', label: 'Supabase (Backend)' },
                  { key: 'drive', label: 'Drive (Data)' },
                  { key: 'railway', label: 'Railway (Containers)' },
                  { key: 'ai_gateway', label: 'AI Gateway (LLM)' },
                ].map((p) => {
                  const val = result.provisioning?.[p.key];
                  const ok = val && !val.error;
                  return (
                    <div key={p.key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{p.label}</span>
                      {ok ? (
                      <span className="flex items-center gap-1 text-emerald-500"><CheckCircle className="w-3 h-3" /> {val.ref || val.id || val.serviceId || 'configured'}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" /> {val?.error || 'skipped'}</span>
                    )}
                    </div>
                  );
                })}
              </div>
              <button onClick={onClose} className="w-full px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}