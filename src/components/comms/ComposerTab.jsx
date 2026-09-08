import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Send, Loader2, MessageSquare, Mail, Phone, Image, Sparkles, FileText } from 'lucide-react';

const CHANNELS = [
  { key: 'sms', label: 'SMS', icon: MessageSquare, activeClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' },
  { key: 'mms', label: 'MMS', icon: Image, activeClass: 'bg-blue-500/10 border-blue-500/40 text-blue-500' },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone, activeClass: 'bg-green-500/10 border-green-500/40 text-green-500' },
  { key: 'email', label: 'Email', icon: Mail, activeClass: 'bg-violet-500/10 border-violet-500/40 text-violet-500' },
];

export default function ComposerTab() {
  const { toast } = useToast();
  const [channel, setChannel] = useState('sms');
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [numbers, setNumbers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const loadNumbers = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: 'list_numbers' });
      const data = res.data?.data || res.data || [];
      setNumbers(Array.isArray(data) ? data : (data.numbers || []));
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
    if (!to || !body) { toast({ title: 'Recipient and message required', variant: 'destructive' }); return; }
    if (channel !== 'email' && !from) { toast({ title: 'Select a from number', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const payload = { action: `send_${channel}`, to, from, body };
      if (channel === 'mms') payload.media_url = mediaUrl;
      if (channel === 'email') { payload.subject = subject; payload.from = from || undefined; delete payload.from; }
      const res = await base44.functions.invoke('xtremeComms', payload);
      if (res.data?.ok === false) throw new Error(res.data?.data?.error || 'Send failed');
      toast({ title: `${channel.toUpperCase()} sent`, description: `To ${to}` });
      setBody(''); setSubject(''); setMediaUrl('');
    } catch (e) {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const applyTemplate = (t) => {
    setBody(t.template_body || '');
    if (channel === 'email') setSubject(t.template_body?.split('\n')[0] || '');
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
      </div>

      {/* From number (not for email) */}
      {channel !== 'email' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">From Number</label>
          <select value={from} onChange={e => setFrom(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
            <option value="">Select a number…</option>
            {numbers.map((n, i) => (
              <option key={n.id || i} value={n.phone_number || n.number || n.phoneNumber}>
                {n.phone_number || n.number || n.phoneNumber} {n.friendly_name ? `(${n.friendly_name})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Recipient */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
          {channel === 'email' ? 'To Email' : 'To Phone (E.164 e.g. +13055551234)'}
        </label>
        <input value={to} onChange={e => setTo(e.target.value)} placeholder={channel === 'email' ? 'name@example.com' : '+13055551234'}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
      </div>

      {/* Email subject */}
      {channel === 'email' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
        </div>
      )}

      {/* MMS media URL */}
      {channel === 'mms' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Media URL</label>
          <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://...image.jpg"
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
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Type your message…"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
        <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{body.length} chars</p>
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
    </div>
  );
}