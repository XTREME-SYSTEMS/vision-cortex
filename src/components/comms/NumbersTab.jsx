import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Plus, Loader2, RefreshCw, CheckCircle2, X } from 'lucide-react';

export default function NumbersTab() {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [countryCode, setCountryCode] = useState('US');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: 'list_numbers' });
      const data = res.data?.data || res.data || [];
      setNumbers(Array.isArray(data) ? data : (data.numbers || []));
    } catch (e) {
      toast({ title: 'Failed to load numbers', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const buy = async () => {
    if (!areaCode) { toast({ title: 'Area code required' }); return; }
    setBuying(true);
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: 'buy_number', area_code: areaCode, country_code: countryCode });
      if (res.data?.ok === false) throw new Error(res.data?.data?.error || 'Buy failed');
      toast({ title: 'Number purchased', description: res.data?.data?.phone_number || 'Check numbers list' });
      setShowBuy(false);
      setAreaCode('');
      load();
    } catch (e) {
      toast({ title: 'Buy failed', description: e.message, variant: 'destructive' });
    }
    setBuying(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{numbers.length} phone number(s) provisioned</p>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
          <button onClick={() => setShowBuy(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Buy Number
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : numbers.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          <Phone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No numbers yet. Buy one to start sending SMS, MMS, WhatsApp, and voice.
        </div>
      ) : (
        <div className="grid gap-2">
          {numbers.map((n, i) => (
            <div key={n.id || n.phone_number || i} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium font-mono">{n.phone_number || n.number || n.phoneNumber}</p>
                <p className="text-xs text-muted-foreground">{n.friendly_name || n.label || 'Provisioned number'}</p>
              </div>
              <div className="flex items-center gap-2">
                {n.capabilities && (
                  <div className="flex gap-1">
                    {n.capabilities.sms && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">SMS</span>}
                    {n.capabilities.mms && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">MMS</span>}
                    {n.capabilities.voice && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">Voice</span>}
                    {n.capabilities.whatsapp && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">WhatsApp</span>}
                  </div>
                )}
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuy && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBuy(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Buy Phone Number</h3>
              <button onClick={() => setShowBuy(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Area Code</label>
                <input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="e.g. 305" maxLength={5}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Country</label>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
            <button onClick={buy} disabled={buying || !areaCode}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Purchase Number
            </button>
          </div>
        </div>
      )}
    </div>
  );
}