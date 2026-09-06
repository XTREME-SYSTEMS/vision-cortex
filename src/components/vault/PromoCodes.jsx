import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PromoCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: 10, max_uses: 100, expiry_date: '', assigned_to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.PromoCode.list('-created_date', 50);
      setCodes(list || []);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.code.trim()) return;
    try {
      await base44.entities.PromoCode.create({
        code: form.code.toUpperCase(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: Number(form.max_uses),
        expiry_date: form.expiry_date || undefined,
        assigned_to: form.assigned_to
      });
      setForm({ code: '', description: '', discount_type: 'percentage', discount_value: 10, max_uses: 100, expiry_date: '', assigned_to: '' });
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    try { await base44.entities.PromoCode.delete(id); load(); } catch (e) { alert(e.message); }
  };

  const toggleActive = async (code) => {
    try { await base44.entities.PromoCode.update(code.id, { active: !code.active }); load(); } catch (e) { alert(e.message); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{codes.length} promo codes</p>
        <Button size="sm" onClick={() => setShowForm(s => !s)}><Plus className="w-4 h-4 mr-1.5" /> Create Code</Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Code</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Type</Label>
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="trial">Free Trial</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Label className="text-[11px]">Value</Label>
              <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Max Uses</Label>
              <Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Expiry</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className="h-9" />
            </div>
          </div>
          <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Assigned to (product/campaign)" className="h-9" />
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="h-9" />
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={!form.code.trim()}>Create</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No promo codes yet.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className={cn('rounded-xl border p-3.5 flex items-center justify-between gap-3', c.active ? 'border-border/60 bg-card' : 'border-border/30 bg-muted/20 opacity-60')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-semibold">{c.code}</code>
                  <button onClick={() => copyCode(c.code)} className="p-1 rounded hover:bg-muted">
                    {copied === c.code ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', c.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
                    {c.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {c.discount_type === 'percentage' ? `${c.discount_value}% off` : c.discount_type === 'fixed' ? `$${(c.discount_value / 100).toFixed(2)} off` : 'Free trial'}
                  {' · '}{c.uses_count || 0}/{c.max_uses || '∞'} used
                  {c.expiry_date && ` · expires ${new Date(c.expiry_date).toLocaleDateString()}`}
                </p>
                {c.description && <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(c)} className="text-[10px] px-2 py-1 rounded-md hover:bg-muted transition-colors">{c.active ? 'Disable' : 'Enable'}</button>
                <button onClick={() => remove(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}