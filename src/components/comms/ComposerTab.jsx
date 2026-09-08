import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Send, Loader2, MessageSquare, Mail, Phone, Image, FileText, Inbox } from 'lucide-react';

const CHANNELS = [
  { key: 'sms', label: 'SMS', icon: MessageSquare, activeClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' },
  { key: 'mms', label: 'MMS', icon: Image, activeClass: 'bg-blue-500/10 border-blue-500/40 text-blue-500' },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone, activeClass: 'bg-green-500/10 border-green-500/40 text-green-500' },
];

export default function ComposerTab() {
  const { toast } = useToast();
  const [channel, setChannel] = useState('sms');
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState('');
  const [sending, setSending] = useState(false);
  const [numbers, setNumbers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);

  const loadNumbers = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'list_numbers' });
      if (res.data?.ok) setNumbers(res.data.numbers || []);
    } catch { /* ignore */ }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const list = await base44.entities.CommunicationTemplate.list('-created_date', 50);
      setTemplates(list || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadNumbers(); loadTemplates(); }, [loadNumbers, loadTemplates]);

  const send = async () => {
    if (!to || !text) { toast({ title: 'Recipient and message required', variant: 'destructive' }); return; }
    if (!from) { toast({ title: 'Select a from number', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const payload = { action: `send_${channel}`, to, from, text };
      if (channel === 'mms') {
        const urls = mediaUrls.split(',').map(u => u.trim()).filter(Boolean);
        if (urls.length) payload.media_urls = urls;
      }
      const res = await base44.functions.invoke('telnyxComms', payload);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Send failed');
      toast({ title: `${channel.toUpperCase()} sent`, description: `To ${to}` });
      setText(''); setMediaUrls('');
    } catch (e) {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const loadInbox = async () => {
    setLoadingInbox(true);
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'list_messages' });
      if (res.data?.ok) setMessages(res.data.messages || []);
    } catch { /* ignore */ }
    setLoadingInbox(false);
  };

  const applyTemplate = (t) => {
    setText(t.template_body || '');
    setShowTemplates(false);
  };

  return (
    <div className="space-y-3">
      {/* Channel selector */}
      <div className="flex gap-1.5">
        {CHANNELS.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.key} onClick={() => setChannel(c.key)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                channel === c.key ? c.activeClass : 'border-border text-muted-foreground hover:text-foreground')}>
              <Icon className="h-4 w-4" /> {c.label}
            </button>
          );
        })}
        <button onClick={() => { setShowInbox(s => !s); if (!showInbox) loadInbox(); }}
          className={cn('flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
            showInbox ? 'bg-accent border-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
          <Inbox className="h-4 w-4" /> Inbox
        </button>
      </div>

      {/* Inbox view */}
      {showInbox ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{messages.length} recent message(s)</p>
            <button onClick={loadInbox} disabled={loadingInbox} className="text-xs text-primary hover:underline">
              {loadingInbox ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {loadingInbox ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No messages yet.</p>
          ) : (
            messages.map((m, i) => (
              <div key={m.id || i} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium">{m.direction === 'inbound' ? '← From' : '→ To'} {m.direction === 'inbound' ? m.from : m.to}</p>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded', m.direction === 'inbound' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500')}>
                    {m.direction}
                  </span>
                </div>
                <p className="text-sm text-foreground">{m.text || m.body || '(no text)'}</p>
                {m.media?.length > 0 && <p className="text-[11px] text-muted-foreground mt-1">📎 {m.media.length} attachment(s)</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* From number */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">From Number</label>
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              <option value="">Select a number…</option>
              {numbers.map((n, i) => (
                <option key={n.id || i} value={n.phone_number}>{n.phone_number} {n.name ? `(${n.name})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">To (E.164 e.g. +13055551234)</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="+13055551234"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>

          {/* MMS media URLs */}
          {channel === 'mms' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Media URL(s) — comma separated</label>
              <input value={mediaUrls} onChange={e => setMediaUrls(e.target.value)} placeholder="https://...image.jpg"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
          )}

          {/* Message body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message</label>
              <button onClick={() => setShowTemplates(s => !s)} className="text-xs text-primary hover:underline flex items-center gap-1">
                <FileText className="h-3 w-3" /> Templates
              </button>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Type your message…"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{text.length} chars</p>
          </div>

          {/* Template picker */}
          {showTemplates && (
            <div className="rounded-lg border border-border bg-card p-2 max-h-48 overflow-y-auto space-y-1">
              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No templates yet. Create some in the Templates tab.</p>
              ) : templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)} className="w-full text-left p-2 rounded hover:bg-accent transition-colors">
                  <p className="text-xs font-medium truncate">{t.channel} · {t.situation} · {t.tone}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.template_body?.substring(0, 80)}…</p>
                </button>
              ))}
            </div>
          )}

          <button onClick={send} disabled={sending}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send {channel.toUpperCase()}
          </button>
        </>
      )}
    </div>
  );
}