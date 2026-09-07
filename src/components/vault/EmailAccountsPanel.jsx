import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Plus, Loader2, Trash2, RefreshCw, X, Check, AlertCircle,
  Send, Inbox, Reply, FileText, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  { id: 'gmail', label: 'Gmail' },
  { id: 'outlook', label: 'Outlook' },
  { id: 'yahoo', label: 'Yahoo' },
  { id: 'proton', label: 'Proton' },
  { id: 'workspace', label: 'Google Workspace' },
  { id: 'sendgrid', label: 'SendGrid' },
  { id: 'resend', label: 'Resend' },
  { id: 'telnyx', label: 'Telnyx' },
  { id: 'custom', label: 'Custom IMAP/SMTP' },
];

const CAPABILITY_OPTIONS = [
  { id: 'read', label: 'Read', icon: Inbox },
  { id: 'send', label: 'Send', icon: Send },
  { id: 'reply', label: 'Reply', icon: Reply },
  { id: 'draft', label: 'Draft', icon: FileText },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'labels', label: 'Labels' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'forward', label: 'Forward' },
  { id: 'schedule', label: 'Schedule' },
];

export default function EmailAccountsPanel() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Form
  const [label, setLabel] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [provider, setProvider] = useState('gmail');
  const [connectionType, setConnectionType] = useState('connector');
  const [capabilities, setCapabilities] = useState(['read', 'send']);
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [vaultEntryId, setVaultEntryId] = useState('');

  const [vaultEntries, setVaultEntries] = useState([]);

  const load = useCallback(async () => {
    try {
      const [emailRes, vaultRes] = await Promise.all([
        base44.entities.EmailAccount.list('-created_date', 50).catch(() => []),
        base44.entities.VaultEntry.list('-created_date', 50).catch(() => []),
      ]);
      setAccounts(emailRes || []);
      setVaultEntries(vaultRes || []);
    } catch (e) {
      console.error('Failed to load email accounts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setLabel(''); setEmailAddress(''); setProvider('gmail'); setConnectionType('connector');
    setCapabilities(['read', 'send']); setImapHost(''); setImapPort(993);
    setSmtpHost(''); setSmtpPort(587); setVaultEntryId('');
  };

  const toggleCap = (capId) => {
    if (capabilities.includes(capId)) {
      setCapabilities(capabilities.filter(c => c !== capId));
    } else {
      setCapabilities([...capabilities, capId]);
    }
  };

  const add = async () => {
    if (!label.trim() || !emailAddress.trim()) { alert('Label and email address required'); return; }
    setActionLoading({ ...actionLoading, add: true });
    try {
      await base44.entities.EmailAccount.create({
        label: label.trim(),
        email_address: emailAddress.trim(),
        provider,
        connection_type: connectionType,
        capabilities,
        imap_host: imapHost,
        imap_port: imapPort,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        assigned_vault_id: vaultEntryId,
        status: connectionType === 'connector' ? 'pending' : 'disconnected'
      });
      resetForm();
      setShowAdd(false);
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, add: false }); }
  };

  const remove = async (id, label) => {
    if (!confirm(`Remove email account "${label}"?`)) return;
    setActionLoading({ ...actionLoading, [`del_${id}`]: true });
    try {
      await base44.entities.EmailAccount.delete(id);
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`del_${id}`]: false }); }
  };

  const setDefault = async (id) => {
    setActionLoading({ ...actionLoading, [`default_${id}`]: true });
    try {
      // Unset all other defaults
      for (const acc of accounts) {
        if (acc.is_default && acc.id !== id) {
          await base44.entities.EmailAccount.update(acc.id, { is_default: false });
        }
      }
      await base44.entities.EmailAccount.update(id, { is_default: true });
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`default_${id}`]: false }); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Email Accounts</h3>
          <p className="text-[11px] text-muted-foreground">
            {accounts.filter(a => a.status === 'connected').length}/{accounts.length} connected
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowAdd(!showAdd); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Connect Email
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Connect Email Account</h4>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Label *</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Support Inbox" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Email Address *</Label>
              <Input value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="user@example.com" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Provider</Label>
              <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px]">Connection Type</Label>
              <select value={connectionType} onChange={e => setConnectionType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="connector">OAuth Connector (Recommended)</option>
                <option value="imap">IMAP/SMTP</option>
                <option value="api">API (SendGrid/Resend)</option>
              </select>
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <Label className="text-[11px] mb-1.5 block">Capabilities</Label>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map(c => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCap(c.id)}
                    className={cn(
                      'flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors',
                      capabilities.includes(c.id)
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-500'
                        : 'border-border/40 text-muted-foreground'
                    )}
                  >
                    {Icon && <Icon className="w-3 h-3" />} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* IMAP/SMTP fields */}
          {connectionType === 'imap' && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px]">IMAP Host</Label>
                <Input value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.gmail.com" className="h-9" />
              </div>
              <div>
                <Label className="text-[11px]">IMAP Port</Label>
                <Input type="number" value={imapPort} onChange={e => setImapPort(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-[11px]">SMTP Host</Label>
                <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="h-9" />
              </div>
              <div>
                <Label className="text-[11px]">SMTP Port</Label>
                <Input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="h-9" />
              </div>
            </div>
          )}

          {/* Vault link */}
          <div>
            <Label className="text-[11px]">Link to Vault Entry (for credentials)</Label>
            <select value={vaultEntryId} onChange={e => setVaultEntryId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">— None —</option>
              {vaultEntries.map(v => <option key={v.id} value={v.id}>{v.name} ({v.account_type})</option>)}
            </select>
          </div>

          <Button size="sm" onClick={add} disabled={actionLoading.add}>
            {actionLoading.add ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
            Connect Account
          </Button>
        </div>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading email accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
          No email accounts connected. Click "Connect Email" to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(a => (
            <div key={a.id} className="rounded-xl border border-border/40 bg-card p-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-lg grid place-items-center shrink-0',
                  a.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' :
                  a.status === 'error' ? 'bg-red-500/10 text-red-500' :
                  a.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-muted/30 text-muted-foreground'
                )}>
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{a.label}</span>
                    {a.is_default && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-medium">Default</span>}
                    <span className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                      a.status === 'connected' ? 'bg-emerald-500/15 text-emerald-500' :
                      a.status === 'error' ? 'bg-red-500/15 text-red-500' :
                      a.status === 'pending' ? 'bg-amber-500/15 text-amber-500' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{a.email_address} · {a.provider} · {a.connection_type}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(a.capabilities || []).map(c => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">{c}</span>
                    ))}
                  </div>
                  {a.last_error && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {a.last_error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.is_default && (
                    <button onClick={() => setDefault(a.id)} disabled={actionLoading[`default_${a.id}`]} title="Set default" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      {actionLoading[`default_${a.id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button onClick={() => remove(a.id, a.label)} disabled={actionLoading[`del_${a.id}`]} title="Remove" className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                    {actionLoading[`del_${a.id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}