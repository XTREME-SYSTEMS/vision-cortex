import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key, Copy, Loader2, Check, KeyRound, Trash2, RefreshCw, Pencil,
  Ban, Eye, Shield, AlertTriangle, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PERMISSION_OPTIONS = ['read', 'write', 'execute', 'admin', 'sync', 'scrape', 'build', 'deploy', 'communicate', 'full'];

export default function ApiKeyManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Generate form state
  const [genName, setGenName] = useState('');
  const [genPrefix, setGenPrefix] = useState('vc');
  const [genLength, setGenLength] = useState(48);
  const [genCategory, setGenCategory] = useState('');
  const [genPermissions, setGenPermissions] = useState(['read', 'write']);
  const [genNotes, setGenNotes] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPermissions, setEditPermissions] = useState([]);
  const [editNotes, setEditNotes] = useState('');

  const loadKeys = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('manageApiKeys', { action: 'list' });
      const data = res.data || res;
      setKeys(data.keys || []);
    } catch (e) {
      console.error('Failed to load keys:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const generate = async () => {
    if (!genName.trim()) { alert('Key name is required'); return; }
    setActionLoading({ ...actionLoading, generate: true });
    try {
      const res = await base44.functions.invoke('manageApiKeys', {
        action: 'generate',
        name: genName.trim(),
        prefix: genPrefix,
        length: Number(genLength),
        category: genCategory,
        permissions: genPermissions,
        notes: genNotes
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setGeneratedKey(data);
      setGenName(''); setGenNotes(''); setGenPermissions(['read', 'write']);
      setShowGenerate(false);
      loadKeys();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, generate: false }); }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revokeKey = async (keyId, name) => {
    if (!confirm(`Revoke key "${name}"? It will stop working immediately.`)) return;
    setActionLoading({ ...actionLoading, [`revoke_${keyId}`]: true });
    try {
      await base44.functions.invoke('manageApiKeys', { action: 'revoke', key_id: keyId });
      loadKeys();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`revoke_${keyId}`]: false }); }
  };

  const rotateKey = async (keyId, name) => {
    if (!confirm(`Rotate key "${name}"? A new key will be generated and the old one will stop working.`)) return;
    setActionLoading({ ...actionLoading, [`rotate_${keyId}`]: true });
    try {
      const res = await base44.functions.invoke('manageApiKeys', { action: 'rotate', key_id: keyId });
      const data = res.data || res;
      setGeneratedKey({ ...data, key_name: name });
      loadKeys();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`rotate_${keyId}`]: false }); }
  };

  const deleteKey = async (keyId, name) => {
    if (!confirm(`Permanently delete key "${name}"? This cannot be undone.`)) return;
    setActionLoading({ ...actionLoading, [`delete_${keyId}`]: true });
    try {
      await base44.functions.invoke('manageApiKeys', { action: 'delete', key_id: keyId });
      loadKeys();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`delete_${keyId}`]: false }); }
  };

  const startEdit = (key) => {
    setEditingKey(key);
    setEditName(key.name);
    setEditPermissions(key.permissions || []);
    setEditNotes(key.notes || '');
  };

  const saveEdit = async () => {
    setActionLoading({ ...actionLoading, [`save_${editingKey.id}`]: true });
    try {
      await base44.functions.invoke('manageApiKeys', {
        action: 'update',
        key_id: editingKey.id,
        name: editName,
        permissions: editPermissions,
        notes: editNotes
      });
      setEditingKey(null);
      loadKeys();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`save_${editingKey.id}`]: false }); }
  };

  const togglePermission = (perm, current, setter) => {
    if (current.includes(perm)) {
      setter(current.filter(p => p !== perm));
    } else {
      setter([...current, perm]);
    }
  };

  const activeKeys = keys.filter(k => k.status === 'active');
  const revokedKeys = keys.filter(k => k.status === 'revoked');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">API Keys</h3>
          <p className="text-[11px] text-muted-foreground">{activeKeys.length} active · {revokedKeys.length} revoked · {keys.length} total</p>
        </div>
        <Button size="sm" onClick={() => setShowGenerate(!showGenerate)}>
          <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Generate Key
        </Button>
      </div>

      {/* Generate Form */}
      {showGenerate && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Generate New API Key</h4>
            <button onClick={() => setShowGenerate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <Label className="text-[11px]">Key Name *</Label>
              <Input value={genName} onChange={e => setGenName(e.target.value)} placeholder="e.g. Production Brain Key" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Prefix</Label>
              <Input value={genPrefix} onChange={e => setGenPrefix(e.target.value)} placeholder="vc" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Length</Label>
              <Input type="number" value={genLength} onChange={e => setGenLength(e.target.value)} min="16" max="128" className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Category (optional)</Label>
              <Input value={genCategory} onChange={e => setGenCategory(e.target.value)} placeholder="e.g. cortex_brain" className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Permissions</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PERMISSION_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePermission(p, genPermissions, setGenPermissions)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-md border transition-colors',
                      genPermissions.includes(p)
                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-500'
                        : 'border-border/40 text-muted-foreground hover:border-border'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Notes (optional)</Label>
              <Input value={genNotes} onChange={e => setGenNotes(e.target.value)} placeholder="What is this key used for?" className="h-9" />
            </div>
          </div>
          <Button size="sm" onClick={generate} disabled={actionLoading.generate}>
            {actionLoading.generate ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Key className="w-3.5 h-3.5 mr-1.5" />}
            Generate & Save Key
          </Button>
        </div>
      )}

      {/* Generated Key Popup */}
      {generatedKey && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-emerald-500">Key Generated Successfully</h4>
            </div>
            <button onClick={() => setGeneratedKey(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono break-all bg-background/50 rounded-md p-2.5 border border-border/30 select-all">{generatedKey.key}</p>
            <Button
              size="sm"
              onClick={() => copyKey(generatedKey.key)}
              className={cn('w-full', copied && 'bg-emerald-500 text-white hover:bg-emerald-600')}
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy Key'}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber-500 bg-amber-500/10 rounded-md p-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Save this key now — it will <strong>never</strong> be shown again. Only the preview will be visible later.</span>
          </div>
          {generatedKey.key_preview && (
            <p className="text-[10px] text-muted-foreground">Preview for later: <code className="font-mono">{generatedKey.key_preview}</code></p>
          )}
        </div>
      )}

      {/* Keys Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading keys...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
          No API keys yet. Click "Generate Key" to create one.
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Preview</div>
            <div className="col-span-2">Permissions</div>
            <div className="col-span-1">Usage</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-border/20">
            {keys.map(k => (
              <div key={k.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs hover:bg-muted/10">
                {/* Name */}
                <div className="col-span-3">
                  {editingKey?.id === k.id ? (
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-xs" />
                  ) : (
                    <div>
                      <p className="font-medium truncate">{k.name}</p>
                      {k.assigned_to && <p className="text-[10px] text-muted-foreground truncate">→ {k.assigned_to}</p>}
                    </div>
                  )}
                </div>
                {/* Preview */}
                <div className="col-span-3 font-mono text-[10px] text-muted-foreground truncate">
                  {k.key_preview}
                </div>
                {/* Permissions */}
                <div className="col-span-2">
                  {editingKey?.id === k.id ? (
                    <div className="flex flex-wrap gap-0.5">
                      {PERMISSION_OPTIONS.slice(0, 6).map(p => (
                        <button
                          key={p}
                          onClick={() => togglePermission(p, editPermissions, setEditPermissions)}
                          className={cn(
                            'text-[8px] px-1 py-0.5 rounded border',
                            editPermissions.includes(p) ? 'bg-violet-500/20 border-violet-500/30 text-violet-500' : 'border-border/30 text-muted-foreground'
                          )}
                        >
                          {p.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-0.5">
                      {(k.permissions || []).map(p => (
                        <span key={p} className="text-[8px] px-1 py-0.5 rounded bg-muted/40 text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Usage */}
                <div className="col-span-1 text-[10px] text-muted-foreground">
                  {k.usage_count || 0}
                </div>
                {/* Status */}
                <div className="col-span-1">
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                    k.status === 'active' ? 'bg-emerald-500/15 text-emerald-500' :
                    k.status === 'revoked' ? 'bg-red-500/15 text-red-500' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {k.status}
                  </span>
                </div>
                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {editingKey?.id === k.id ? (
                    <>
                      <button onClick={saveEdit} disabled={actionLoading[`save_${k.id}`]} className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500">
                        {actionLoading[`save_${k.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      </button>
                      <button onClick={() => setEditingKey(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      {k.status === 'active' && (
                        <>
                          <button onClick={() => startEdit(k)} title="Edit" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => rotateKey(k.id, k.name)} disabled={actionLoading[`rotate_${k.id}`]} title="Rotate" className="p-1.5 rounded hover:bg-amber-500/10 text-amber-500">
                            {actionLoading[`rotate_${k.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          </button>
                          <button onClick={() => revokeKey(k.id, k.name)} disabled={actionLoading[`revoke_${k.id}`]} title="Revoke" className="p-1.5 rounded hover:bg-orange-500/10 text-orange-500">
                            {actionLoading[`revoke_${k.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteKey(k.id, k.name)} disabled={actionLoading[`delete_${k.id}`]} title="Delete" className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                        {actionLoading[`delete_${k.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}