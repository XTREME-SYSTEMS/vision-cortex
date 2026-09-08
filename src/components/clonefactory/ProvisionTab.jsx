import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket, Database, Cloud, HardDrive, Github, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROVISION_TARGETS } from '@/data/cloneFactoryTemplates';

export default function ProvisionTab({ activeJob }) {
  const [targets, setTargets] = useState({ supabase: true, vercel: true, drive: true, git: true });
  const [provisioning, setProvisioning] = useState(false);
  const [results, setResults] = useState(null);

  const handleProvision = async () => {
    if (!activeJob?.template_id) {
      alert('No template saved yet. Run the clone pipeline first to save a template.');
      return;
    }
    setProvisioning(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('provisionCloneDeployment', {
        template_id: activeJob.template_id,
        job_id: activeJob.id,
        targets,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setResults(d);
    } catch (e) { alert('Provision failed: ' + e.message); }
    finally { setProvisioning(false); }
  };

  const toggleTarget = (key) => setTargets(t => ({ ...t, [key]: !t[key] }));

  const targetIcons = { supabase: Database, vercel: Cloud, drive: HardDrive, git: Github };

  if (!activeJob) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
        <Rocket className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Select a job from the Queue tab to provision its deployment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-card border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Provision Deployment</h3>
            <p className="text-[11px] text-muted-foreground">Deploy the cloned system to your infrastructure</p>
          </div>
          {activeJob.template_id ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">template ready</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">no template yet</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {PROVISION_TARGETS.map(t => {
            const Icon = targetIcons[t.key];
            const enabled = targets[t.key];
            return (
              <button
                key={t.key}
                onClick={() => toggleTarget(t.key)}
                className={cn('flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  enabled ? 'border-violet-500/40 bg-violet-500/5' : 'border-border/40 opacity-50')}
              >
                <Icon className={cn('w-5 h-5', enabled ? 'text-violet-500' : 'text-muted-foreground')} />
                <div className="flex-1">
                  <p className="text-xs font-medium">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{t.description}</p>
                </div>
                {enabled && <Check className="w-4 h-4 text-violet-500" />}
              </button>
            );
          })}
        </div>

        <Button onClick={handleProvision} disabled={provisioning || !activeJob.template_id} className="w-full">
          {provisioning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Rocket className="w-4 h-4 mr-1.5" />}
          {provisioning ? 'Provisioning…' : 'Provision Selected Targets'}
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Provision Results</p>
          {Object.entries(results.results || {}).map(([key, r]) => {
            if (!r) return null;
            const Icon = targetIcons[key];
            return (
              <div key={key} className={cn('border rounded-lg p-3 bg-card', r.status === 'provisioned' ? 'border-emerald-500/30' : 'border-rose-500/30')}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium capitalize">{key}</span>
                  {r.status === 'provisioned' ? <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" /> : <X className="w-3.5 h-3.5 text-rose-500 ml-auto" />}
                </div>
                {r.url && <p className="text-[11px] text-violet-500 mt-1 truncate"><a href={r.url} target="_blank" rel="noreferrer">{r.url}</a></p>}
                {r.repo_url && <p className="text-[11px] text-violet-500 mt-1 truncate"><a href={r.repo_url} target="_blank" rel="noreferrer">{r.repo_url}</a></p>}
                {r.folder_id && <p className="text-[11px] text-muted-foreground mt-1">Folder ID: {r.folder_id}</p>}
                {r.error && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {r.error}</p>}
              </div>
            );
          })}
          {results.logs && (
            <div className="border rounded-lg p-2 bg-[#0B0D12] border-border font-mono text-[10px] space-y-0.5 max-h-32 overflow-y-auto">
              {results.logs.map((l, i) => <div key={i} className="text-muted-foreground">{l}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}