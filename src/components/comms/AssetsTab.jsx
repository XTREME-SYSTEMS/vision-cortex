import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Image, Plus, Loader2, Trash2, X, Sparkles, FileText, Type } from 'lucide-react';

const ASSET_TYPES = ['image', 'logo', 'hook', 'close', 'bid', 'pricing', 'promo', 'testimonial', 'social_media', 'video', 'human_image', 'uploaded'];

export default function AssetsTab() {
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ type: 'hook', title: '', content: '', content_type: 'text', company_name: '', industry: '', context: '', target_audience: '', prompt_used: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.CreativeAsset.list('-created_date', 100);
      setAssets(list || []);
    } catch (e) {
      toast({ title: 'Failed to load assets', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title) { toast({ title: 'Title required' }); return; }
    try {
      await base44.entities.CreativeAsset.create(form);
      toast({ title: 'Asset created' });
      setShowForm(false);
      setForm({ type: 'hook', title: '', content: '', content_type: 'text', company_name: '', industry: '', context: '', target_audience: '', prompt_used: '' });
      load();
    } catch (e) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    }
  };

  const generateImage = async () => {
    if (!form.prompt_used) { toast({ title: 'Enter a prompt first' }); return; }
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt: form.prompt_used });
      const url = res.url || res.data?.url;
      setForm(p => ({ ...p, content: url, content_type: 'image' }));
      toast({ title: 'Image generated' });
    } catch (e) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    }
    setGenerating(false);
  };

  const remove = async (id) => {
    try {
      await base44.entities.CreativeAsset.delete(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Asset deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{assets.length} creative asset(s)</p>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Asset
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No creative assets yet. Store hooks, images, logos, promos, testimonials, and more.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {assets.map(a => (
            <div key={a.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{a.type}</span>
                    {a.content_type === 'image' && <Image className="h-3 w-3 text-blue-500" />}
                    {a.content_type === 'text' && <Type className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  {a.content_type === 'image' && a.content ? (
                    <img src={a.content} alt={a.title} className="mt-2 rounded max-h-32 object-cover" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  )}
                  {a.industry && <p className="text-[10px] text-muted-foreground mt-1">{a.industry}</p>}
                </div>
                <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
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
              <h3 className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> New Creative Asset</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, content_type: e.target.value === 'image' || e.target.value === 'logo' || e.target.value === 'human_image' ? 'image' : 'text' }))}
                  className="w-full h-9 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Content Type</label>
                <select value={form.content_type} onChange={e => setForm(p => ({ ...p, content_type: e.target.value }))}
                  className="w-full h-9 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. HVAC Emergency Hook"
                className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Content (text or image URL)</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} placeholder="The hook/copy text, or an image URL"
                className="w-full px-3 py-2 rounded border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            </div>
            {form.content_type === 'image' && (
              <div className="rounded border border-dashed border-border p-3 space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Generate image with AI</label>
                <input value={form.prompt_used} onChange={e => setForm(p => ({ ...p, prompt_used: e.target.value }))} placeholder="Describe the image to generate…"
                  className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
                <button onClick={generateImage} disabled={generating}
                  className="w-full px-3 py-1.5 rounded bg-violet-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate Image
                </button>
                {form.content && <img src={form.content} alt="preview" className="rounded max-h-32 mx-auto" />}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Company name"
                className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Industry"
                className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <input value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} placeholder="Product/service context"
              className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            <input value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))} placeholder="Target audience"
              className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:border-primary outline-none" />
            <button onClick={create} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Create Asset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}