import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Coins, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentPaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ agent_name: '', amount: 100, payment_type: 'salary', memo: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pays, agentList] = await Promise.all([
        base44.entities.AgentPayment.list('-created_date', 50),
        base44.entities.AgentProfile.list('-order', 20)
      ]);
      setPayments(pays || []);
      setAgents(agentList || []);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.agent_name.trim()) return;
    try {
      await base44.entities.AgentPayment.create({
        agent_name: form.agent_name,
        amount: Number(form.amount),
        payment_type: form.payment_type,
        memo: form.memo,
        validated: false
      });
      setForm({ agent_name: '', amount: 100, payment_type: 'salary', memo: '' });
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const validate = async (p) => {
    try {
      await base44.entities.AgentPayment.update(p.id, { validated: true, validator_notes: 'Approved by Validator agent' });
      load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    try { await base44.entities.AgentPayment.delete(id); load(); } catch (e) { alert(e.message); }
  };

  // Compute leaderboard
  const balances = {};
  payments.forEach(p => {
    if (!balances[p.agent_name]) balances[p.agent_name] = { total: 0, count: 0 };
    balances[p.agent_name].total += p.amount;
    balances[p.agent_name].count++;
  });
  const leaderboard = Object.entries(balances).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-4">
      {/* Leaderboard */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-amber-500" /> Agent Earnings Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments yet.</p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.map(([name, data], i) => (
              <div key={name} className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn('w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold', i === 0 ? 'bg-amber-500/20 text-amber-500' : i === 1 ? 'bg-slate-400/20 text-slate-400' : i === 2 ? 'bg-orange-700/20 text-orange-700' : 'bg-muted text-muted-foreground')}>{i + 1}</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{data.count} payments</span>
                  <span className="font-mono font-semibold text-emerald-500">{data.total.toLocaleString()} CORTEX</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment form */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{payments.length} payments · CORTEX token</p>
        <Button size="sm" onClick={() => setShowForm(s => !s)}><Plus className="w-4 h-4 mr-1.5" /> Pay Agent</Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Agent</Label>
              <select value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">— Select Agent —</option>
                {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px]">Amount (CORTEX)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Type</Label>
              <select value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="salary">Salary</option>
                <option value="bonus">Bonus</option>
                <option value="reward">Reward</option>
                <option value="penalty">Penalty</option>
                <option value="dividend">Dividend</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px]">Memo</Label>
              <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} placeholder="Reason for payment" className="h-9" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={!form.agent_name.trim()}>Create Payment</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Payment ledger */}
      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No payments yet.</p>
      ) : (
        <div className="space-y-1.5">
          {payments.map((p) => (
            <div key={p.id} className="rounded-lg border border-border/40 bg-card p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium">{p.agent_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5 capitalize">{p.payment_type}</span>
                </div>
                {p.memo && <span className="text-[10px] text-muted-foreground truncate">· {p.memo}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-semibold text-emerald-500">+{p.amount} CORTEX</span>
                {p.validated ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">✓ Validated</span>
                ) : (
                  <button onClick={() => validate(p)} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Validate</button>
                )}
                <button onClick={() => remove(p.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}