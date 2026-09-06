import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Copy, Loader2, Check } from 'lucide-react';

export default function ApiKeyManager() {
  const [prefix, setPrefix] = useState('sk');
  const [length, setLength] = useState(48);
  const [vaultEntries, setVaultEntries] = useState([]);
  const [assignTo, setAssignTo] = useState('');
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadVault = useCallback(async () => {
    try {
      const list = await base44.entities.VaultEntry.list('-updated_date', 50);
      setVaultEntries(list || []);
    } catch {}
  }, []);
  useEffect(() => { loadVault(); }, [loadVault]);

  const generate = async () => {
    setLoading(true);
    setGenerated(null);
    try {
      const res = await base44.functions.invoke('generateApiKey', {
        prefix,
        length: Number(length),
        vault_entry_id: assignTo || undefined
      });
      setGenerated(res);
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(generated.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="w-4 h-4" /> Generate API Key / Token</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <Label className="text-[11px]">Prefix</Label>
            <Input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="sk" className="h-9" />
          </div>
          <div>
            <Label className="text-[11px]">Length</Label>
            <Input type="number" value={length} onChange={e => setLength(e.target.value)} min="16" max="128" className="h-9" />
          </div>
          <div>
            <Label className="text-[11px]">Assign to Vault Entry</Label>
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">— None —</option>
              {vaultEntries.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Key className="w-4 h-4 mr-1.5" />}
          Generate Key
        </Button>
      </div>

      {generated && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-emerald-500">Key Generated</h4>
            <button onClick={copy} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-background/50 hover:bg-background transition-colors">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs font-mono break-all bg-background/50 rounded-md p-2 border border-border/30">{generated.key}</p>
          {generated.assigned_to && <p className="text-[11px] text-muted-foreground">Assigned to: {generated.assigned_to}</p>}
          <p className="text-[10px] text-muted-foreground">⚠ Store this key securely. It will not be shown again in plaintext.</p>
        </div>
      )}

      <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
        <p className="text-[11px] text-muted-foreground">
          Generated keys are cryptographically random. When assigned to a vault entry, the key reference is stored with that entry.
          Use prefixes like <code className="text-foreground">sk_</code> for secret keys, <code className="text-foreground">tok_</code> for tokens,
          <code className="text-foreground">pk_</code> for publishable keys.
        </p>
      </div>
    </div>
  );
}