import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { FileText, Plus, Loader2, Trash2, X, Sparkles, Filter } from 'lucide-react';

const CHANNELS = ['voice', 'sms', 'mms', 'whatsapp', 'email', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'discord', 'universal'];
const SITUATIONS = ['sales', 'marketing', 'follow_up', 'outreach', 'response', 'comment', 'objection_handling', 'qualification', 'closing', 'appointment', 'nurture', 're_engagement'];
const TONES = ['professional', 'casual', 'urgent', 'empathetic', 'authoritative', 'friendly', 'persuasive', 'consultative', 'energetic', 'calm'];

export default function TemplatesTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterChannel, setFilterChannel] = useState('all');
  const [form, setForm] = useState({
    industry: 'universal', channel: 'sms', situation: 'sales', tone: 'professional',
    template_body: '', psychology_notes: '', target_audience: '', active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.CommunicationTemplate.list('-created_date', 100);
      setTemplates(list || []);
    } catch (e) {
      toast({ title: 'Failed to load templates', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.template_body) { toast({ title: 'Template body required' }); return; }
    try {
      await base44.entities.CommunicationTemplate.create(form);
      toast({ title: 'Template created' });
      setShowForm(false);
      setForm({ industry: 'universal', channel: 'sms', situation: 'sales', tone: 'professional', template_body: '', psychology_notes: '', target_audience: '', active: true });
      load();
    } catch (e) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.CommunicationTemplate.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Template deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = filterChannel === 'all' ? templates : templates.filter(t => t.channel === filterChannel);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
            className="h-8 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
            <option value="all">All channels</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} templates</span>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No templates yet. Create reusable messaging templates for any channel.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <div key={t.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{t.channel}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground uppercase">{t.situation}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{t.tone}</span>
                    {t.industry && t.industry !== 'universal' && <span className="text-[9px] text-muted-foreground">{t.industry}</span>}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{t.template_body}</p>
                  {t.psychology_notes && <p className="text-[11px] text-muted-foreground mt-1 italic">💡 {t.psychology_notes}</p>}
                </div>
                <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> New Communication Template</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
                <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                  className="w-full h-9 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Situation</label>
                <select value={form.situation} onChange={e => setForm(p => ({ ...p, situation: e.target.value }))}
                  className="w-full h-9 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
                  {SITUATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
                <select value={form.tone} onChange={e => setForm(p => ({ ...p, tone: e.target.value }))}
                  className="w-full h-9 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
              <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="universal"
                className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Template Body</label>
              <textarea value={form.template_body} onChange={e => setForm(p => ({ ...p, template_body: e.target.value }))} rows={4} placeholder="Hi {{name}}, this is…"
                className="w-full px-3 py-2 rounded border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Psychology Notes (why it works)</label>
              <input value={form.psychology_notes} onChange={e => setForm(p => ({ ...p, psychology_notes: e.target.value }))} placeholder="Uses urgency + social proof…"
                className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Audience</label>
              <input value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))} placeholder="HVAC business owners in Miami"
                className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <button onClick={create} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Create Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}