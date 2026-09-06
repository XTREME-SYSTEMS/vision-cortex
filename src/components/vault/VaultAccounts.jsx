import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Eye, EyeOff, ExternalLink, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

const accountTypes = ['vercel', 'supabase', 'railway', 'groq', 'google', 'github', 'stripe', 'openai', 'anthropic', 'email', 'domain', 'hosting', 'exchange', 'bank', 'other'];

export default function VaultAccounts() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [form, setForm] = useState({ name: '', account_type: 'other', url: '', email: '', password: '', api_key: '', api_secret: '', token: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.VaultEntry.list('-updated_date', 50);
      setEntries(list || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    try {
      await base44.entities.VaultEntry.create({
        name: form.name,
        account_type: form.account_type,
        url: form.url,
        credentials: {
          email: form.email, password: form.password,
          api_key: form.api_key, api_secret: form.api_secret,
          token: form.token, notes: form.notes
        }
      });
      setForm({ name: '', account_type: 'other', url: '', email: '', password: '', api_key: '', api_secret: '', token: '', notes: '' });
      setShowForm(false);
      load();
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this vault entry?')) return;
    try { await base44.entities.VaultEntry.delete(id); load(); } catch (e) { alert(e.message); }
  };

  const toggleReveal = (id) => setRevealed(r => ({ ...r, [id]: !r[id] }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{entries.length} accounts stored · Admin-only access</p>
        <Button size="sm" onClick={() => setShowForm(s => !s)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Account
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Vercel Account" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Type</Label>
              <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://vercel.com/dashboard" className="h-9" />
          <div className="grid grid-cols-2 gap-2.5">
            <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email" className="h-9" />
            <Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="password" type="password" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="API Key" className="h-9" />
            <Input value={form.api_secret} onChange={e => setForm({ ...form, api_secret: e.target.value })} placeholder="API Secret" type="password" className="h-9" />
          </div>
          <Input value={form.token} onChange={e => setForm({ ...form, token: e.target.value })} placeholder="Token / Refresh Token" className="h-9" />
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="h-9" />
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={!form.name.trim()}>Save to Vault</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No accounts stored yet. Click "Add Account" to store credentials.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const creds = entry.credentials || {};
            const isRevealed = revealed[entry.id];
            return (
              <div key={entry.id} className="rounded-xl border border-border/60 bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{entry.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{entry.account_type}</span>
                    </div>
                    {entry.url && (
                      <a href={entry.url} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> {entry.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleReveal(entry.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => remove(entry.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {isRevealed && (
                  <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                    {creds.email && <p className="text-[11px]"><span className="text-muted-foreground">Email:</span> {creds.email}</p>}
                    {creds.password && <p className="text-[11px]"><span className="text-muted-foreground">Password:</span> {creds.password}</p>}
                    {creds.api_key && <p className="text-[11px] font-mono"><span className="text-muted-foreground">Key:</span> {creds.api_key}</p>}
                    {creds.api_secret && <p className="text-[11px] font-mono"><span className="text-muted-foreground">Secret:</span> {creds.api_secret}</p>}
                    {creds.token && <p className="text-[11px] font-mono"><span className="text-muted-foreground">Token:</span> {creds.token.substring(0, 30)}…</p>}
                    {creds.notes && <p className="text-[11px] text-muted-foreground">{creds.notes}</p>}
                    {(entry.assigned_api_keys || []).length > 0 && (
                      <div className="pt-1">
                        <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Key className="w-2.5 h-2.5" /> Assigned API Keys:</p>
                        {entry.assigned_api_keys.map((k, i) => <p key={i} className="text-[10px] font-mono text-muted-foreground">{k.substring(0, 40)}…</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}