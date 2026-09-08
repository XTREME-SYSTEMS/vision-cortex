import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Loader2, RefreshCw, PhoneCall, AlertCircle } from 'lucide-react';

export default function VoiceTab() {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [recentCalls, setRecentCalls] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'list_numbers' });
      if (res.data?.ok) setNumbers(res.data.numbers || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const makeCall = async () => {
    if (!to || !from) { toast({ title: 'To and From required' }); return; }
    setCalling(true);
    try {
      const payload = { action: 'make_call', to, from };
      if (webhookUrl) payload.webhook_url = webhookUrl;
      const res = await base44.functions.invoke('telnyxComms', payload);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Call failed');
      toast({ title: 'Call initiated', description: `Calling ${to}` });
      setRecentCalls(prev => [{ to, from, at: new Date().toISOString(), call: res.data.call }, ...prev].slice(0, 10));
      setTo('');
    } catch (e) {
      toast({ title: 'Call failed', description: e.message, variant: 'destructive' });
    }
    setCalling(false);
  };

  return (
    <div className="space-y-4">
      {/* Connection note */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground">
          <span className="font-medium">Telnyx Call Control</span> — Voice calls require a Telnyx Call Control Application (Connection) configured in your Telnyx dashboard. Set the webhook URL below to your Call Control app's webhook endpoint to enable AI-driven call flows.
        </p>
      </div>

      {/* Make a call */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2"><PhoneCall className="h-4 w-4 text-violet-500" /> Place a Voice Call</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">From</label>
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              <option value="">Select number…</option>
              {numbers.map((n, i) => <option key={n.id || i} value={n.phone_number}>{n.phone_number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">To (E.164)</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="+13055551234"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Webhook URL (Call Control app)</label>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://visioncortex.base44.app/functions/..."
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
        </div>
        <button onClick={makeCall} disabled={calling}
          className="w-full px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Place Call
        </button>
      </div>

      {/* Recent calls */}
      {recentCalls.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-2">Recent Calls (this session)</h3>
          <div className="space-y-1.5">
            {recentCalls.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border border-border/60">
                <p className="text-sm font-mono">{c.from} → {c.to}</p>
                <span className="text-[11px] text-muted-foreground">{new Date(c.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end">
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh Numbers
        </button>
      </div>
    </div>
  );
}