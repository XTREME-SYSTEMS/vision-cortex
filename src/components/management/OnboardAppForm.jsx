import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OnboardAppForm({ onOnboarded }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [repo, setRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('onboardApp', { name: name.trim(), url: url.trim(), github_repo: repo.trim() });
      setResult(res);
      setName(''); setUrl(''); setRepo('');
      onOnboarded?.();
    } catch (e) {
      setError(e.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Onboard a New App</h3>
        <span className="text-[11px] text-muted-foreground">— paste repo + URL, Vision Cortex does the rest</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">App Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hidden Property Intel" className="h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Live URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hiddenpropertyintel.com" className="h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">GitHub Repo (optional)</Label>
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/..." className="h-9" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={submit} disabled={loading || !name.trim() || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Onboard & Plan
        </Button>
        {error && <span className="text-xs text-red-500">{error}</span>}
        {result && (
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {result.message}
          </span>
        )}
      </div>
      {result && result.plan && (
        <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 mt-2">
          <span className="font-medium text-foreground">Strategy: </span>
          {result.plan.integration_strategy?.substring(0, 200)}...
        </div>
      )}
    </div>
  );
}