import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CryptoWallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', wallet_type: 'ethereum', assigned_to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.CryptoWallet.list('-created_date', 50);
      setWallets(list || []);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generateAddress = (type) => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    if (type === 'ethereum' || type === 'shadow' || type === 'cortex_token') return '0x' + hex;
    if (type === 'bitcoin') return 'bc1' + hex.substring(0, 38);
    if (type === 'solana') return hex.substring(0, 44);
    return '0x' + hex;
  };

  const create = async () => {
    if (!form.label.trim()) return;
    try {
      const address = generateAddress(form.wallet_type);
      await base44.entities.CryptoWallet.create({
        label: form.label,
        address,
        wallet_type: form.wallet_type,
        assigned_to: form.assigned_to,
        is_paper: true
      });
      setForm({ label: '', wallet_type: 'ethereum', assigned_to: '' });
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const bulkCreate = async (count) => {
    try {
      const items = Array.from({ length: count }, (_, i) => ({
        label: `Shadow Wallet ${Date.now()}-${i}`,
        address: generateAddress('shadow'),
        wallet_type: 'shadow',
        is_paper: true
      }));
      await base44.entities.CryptoWallet.bulkCreate(items);
      load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    try { await base44.entities.CryptoWallet.delete(id); load(); } catch (e) { alert(e.message); }
  };

  const typeColor = { ethereum: 'text-sky-500', bitcoin: 'text-amber-500', solana: 'text-violet-500', shadow: 'text-slate-500', cortex_token: 'text-emerald-500' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{wallets.length} wallets · all paper/simulated</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => bulkCreate(10)}>+10 Shadow</Button>
          <Button size="sm" onClick={() => setShowForm(s => !s)}><Plus className="w-4 h-4 mr-1.5" /> New Wallet</Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Label className="text-[11px]">Label</Label>
              <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Agent Prime Wallet" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Type</Label>
              <select value={form.wallet_type} onChange={e => setForm({ ...form, wallet_type: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="ethereum">Ethereum</option>
                <option value="bitcoin">Bitcoin</option>
                <option value="solana">Solana</option>
                <option value="shadow">Shadow</option>
                <option value="cortex_token">CORTEX Token</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px]">Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Agent name" className="h-9" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={!form.label.trim()}>Generate Wallet</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : wallets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No wallets yet. Generate one or bulk-create shadow wallets.</p>
      ) : (
        <div className="space-y-1.5">
          {wallets.map((w) => (
            <div key={w.id} className="rounded-lg border border-border/40 bg-card p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-semibold uppercase', typeColor[w.wallet_type])}>{w.wallet_type}</span>
                  <span className="text-xs font-medium">{w.label}</span>
                  {w.assigned_to && <span className="text-[10px] text-muted-foreground">→ {w.assigned_to}</span>}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{w.address}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono">{w.balance || 0} CORTEX</span>
                <button onClick={() => remove(w.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          ⚠ These are simulated/paper wallets for testing and agent payments. Private keys are NOT stored — only public addresses.
          For real wallets, use a hardware wallet or secure key management system.
        </p>
      </div>
    </div>
  );
}