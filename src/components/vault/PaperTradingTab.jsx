import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, LineChart } from 'lucide-react';

export default function PaperTradingTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', starting_balance: 100000, strategy: 'diversified' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Portfolio.list('-created_date', 20);
      setAccounts(list || []);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    try {
      await base44.entities.Portfolio.create({
        name: form.name,
        starting_balance: Number(form.starting_balance),
        cash_balance: Number(form.starting_balance),
        strategy: form.strategy
      });
      setForm({ name: '', starting_balance: 100000, strategy: 'diversified' });
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this paper account?')) return;
    try { await base44.entities.Portfolio.delete(id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{accounts.length} paper trading accounts</p>
        <Button size="sm" onClick={() => setShowForm(s => !s)}><Plus className="w-4 h-4 mr-1.5" /> Provision Account</Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div>
            <Label className="text-[11px]">Account Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Aggressive Growth Portfolio" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Starting Balance ($)</Label>
              <Input type="number" value={form.starting_balance} onChange={e => setForm({ ...form, starting_balance: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Strategy</Label>
              <select value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="diversified">Diversified</option>
                <option value="aggressive">Aggressive Growth</option>
                <option value="conservative">Conservative</option>
                <option value="crypto">Crypto Focus</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={!form.name.trim()}>Provision</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No paper accounts yet. Provision one to start simulating trades.</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl border border-border/60 bg-card p-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><LineChart className="w-3.5 h-3.5 text-sky-500" /> {a.name}</h3>
                <p className="text-[11px] text-muted-foreground capitalize">{a.strategy} · ${(a.starting_balance || 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-semibold">${(a.cash_balance || a.starting_balance || 0).toLocaleString()}</span>
                <button onClick={() => remove(a.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
        <p className="text-[11px] text-muted-foreground">
          Paper trading accounts use simulated money for testing strategies risk-free.
          Visit the <a href="/paper" className="text-foreground underline">Paper Desk</a> to execute simulated trades.
        </p>
      </div>
    </div>
  );
}