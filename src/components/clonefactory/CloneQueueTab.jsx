import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Globe, ListChecks, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CloneQueueTab({ jobs, loading, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const deriveName = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url.substring(0, 40); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    setError('');
    try {
      await base44.entities.CloneJob.create({
        target_url: newUrl.trim(),
        site_name: newName.trim() || deriveName(newUrl.trim()),
        industry: newIndustry.trim() || 'Uncategorized',
        priority: newPriority,
        status: 'queued',
        source: 'manual',
      });
      setNewUrl(''); setNewName(''); setNewIndustry(''); setNewPriority('medium');
      setShowAdd(false);
      onRefresh();
    } catch (e) { setError(e.message); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this job from the queue?')) return;
    try { await base44.entities.CloneJob.delete(id); onRefresh(); }
    catch (e) { setError(e.message); }
  };

  const stats = {
    queued: jobs.filter(j => j.status === 'queued').length,
    cloning: jobs.filter(j => ['cloning', 'validating'].includes(j.status)).length,
    passed: jobs.filter(j => j.status === 'passed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  const statusColor = {
    queued: 'bg-muted text-muted-foreground',
    cloning: 'bg-sky-500/15 text-sky-500',
    validating: 'bg-violet-500/15 text-violet-500',
    passed: 'bg-emerald-500/15 text-emerald-500',
    failed: 'bg-rose-500/15 text-rose-500',
    rebranding: 'bg-amber-500/15 text-amber-500',
    provisioning: 'bg-indigo-500/15 text-indigo-500',
    completed: 'bg-emerald-500/20 text-emerald-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-muted/40">{stats.queued} queued</span>
          <span className="px-2.5 py-1 rounded-full bg-muted/40">{stats.cloning} active</span>
          <span className="px-2.5 py-1 rounded-full bg-muted/40">{stats.passed} passed</span>
          <span className="px-2.5 py-1 rounded-full bg-muted/40">{stats.failed} failed</span>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Target
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Add Clone Target</h4>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <Label className="text-[11px]">Target URL *</Label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Site Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="auto-derived from URL" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Industry</Label>
              <Input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} placeholder="e.g. SaaS, Real Estate" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Priority</Label>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={adding || !newUrl.trim()}>
            {adding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Add to Queue
          </Button>
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
          <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No clone jobs yet. Add a target URL to begin.
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Site</div>
            <div className="col-span-3">URL</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-2">Parity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y divide-border/20">
            {jobs.map(j => (
              <div key={j.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs hover:bg-muted/10">
                <div className="col-span-3">
                  <p className="font-medium truncate">{j.site_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{j.industry}</p>
                </div>
                <div className="col-span-3 truncate text-muted-foreground">
                  <a href={j.target_url} target="_blank" rel="noreferrer" className="hover:text-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3 shrink-0" /> <span className="truncate">{j.target_url}</span>
                  </a>
                </div>
                <div className="col-span-1">
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full',
                    j.priority === 'critical' ? 'bg-rose-500/15 text-rose-500' :
                    j.priority === 'high' ? 'bg-amber-500/15 text-amber-500' :
                    'bg-muted text-muted-foreground')}>
                    {j.priority}
                  </span>
                </div>
                <div className="col-span-2">
                  {j.parity_score > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', j.parity_score >= 1 ? 'bg-emerald-500' : j.parity_score >= 0.7 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${j.parity_score * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px]">{(j.parity_score * 100).toFixed(0)}%</span>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="col-span-2">
                  <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-medium', statusColor[j.status] || 'bg-muted')}>
                    {j.status}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => handleDelete(j.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}