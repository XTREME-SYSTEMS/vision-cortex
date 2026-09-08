import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Plus, Loader2, RefreshCw, CheckCircle2, X, Search, Trash2, Wifi } from 'lucide-react';

export default function NumbersTab() {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuy, setShowBuy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState(null);
  const [available, setAvailable] = useState([]);
  const [areaCode, setAreaCode] = useState('');
  const [profiles, setProfiles] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'list_numbers' });
      const data = res.data || {};
      if (!data.ok) throw new Error(data.error || 'Failed to load');
      setNumbers(data.numbers || []);
    } catch (e) {
      toast({ title: 'Failed to load numbers', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'list_messaging_profiles' });
      if (res.data?.ok) setProfiles(res.data.profiles || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadProfiles(); }, [load, loadProfiles]);

  const search = async () => {
    setSearching(true);
    setAvailable([]);
    try {
      const res = await base44.functions.invoke('telnyxComms', {
        action: 'search_numbers',
        country_code: 'US',
        area_code: areaCode || undefined,
        limit: 10,
      });
      const data = res.data || {};
      if (!data.ok) throw new Error(data.error || 'Search failed');
      setAvailable(data.numbers || []);
      if ((data.numbers || []).length === 0) toast({ title: 'No numbers found in that area code' });
    } catch (e) {
      toast({ title: 'Search failed', description: e.message, variant: 'destructive' });
    }
    setSearching(false);
  };

  const buy = async (phoneNumber) => {
    setBuying(phoneNumber);
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'buy_number', phone_number: phoneNumber });
      const data = res.data || {};
      if (!data.ok) throw new Error(data.error || 'Purchase failed');
      toast({ title: 'Number purchased', description: phoneNumber });
      setAvailable(prev => prev.filter(n => n.phone_number !== phoneNumber));
      load();
    } catch (e) {
      toast({ title: 'Purchase failed', description: e.message, variant: 'destructive' });
    }
    setBuying(null);
  };

  const release = async (numberId, phoneNumber) => {
    if (!confirm(`Release ${phoneNumber}? This cannot be undone.`)) return;
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'release_number', number_id: numberId });
      if (!res.data?.ok) throw new Error(res.data?.error || 'Release failed');
      toast({ title: 'Number released', description: phoneNumber });
      load();
    } catch (e) {
      toast({ title: 'Release failed', description: e.message, variant: 'destructive' });
    }
  };

  const assignProfile = async (numberId, profileId) => {
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'update_number', number_id: numberId, messaging_profile_id: profileId || null });
      if (!res.data?.ok) throw new Error(res.data?.error || 'Update failed');
      toast({ title: 'Messaging profile assigned' });
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5 text-emerald-500" /> Telnyx · {numbers.length} number(s) provisioned
        </p>
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
        </button>
      </div>

      {/* Provisioned numbers */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : numbers.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          <Phone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No numbers provisioned yet. Search & buy one below.
        </div>
      ) : (
        <div className="grid gap-2">
          {numbers.map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium font-mono">{n.phone_number}</p>
                  <p className="text-xs text-muted-foreground">{n.name || 'Unnamed'} · {n.status || 'active'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.features && (
                    <div className="flex gap-1">
                      {n.features.sms && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">SMS</span>}
                      {n.features.mms && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">MMS</span>}
                      {n.features.voice && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">Voice</span>}
                    </div>
                  )}
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <button onClick={() => release(n.id, n.phone_number)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {profiles.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Messaging Profile:</span>
                  <select value={n.messaging_profile_id || ''} onChange={e => assignProfile(n.id, e.target.value)}
                    className="h-7 px-2 rounded border border-border bg-background text-[11px] focus:border-primary outline-none">
                    <option value="">None</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search & buy */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Search & Buy Numbers</h3>
        <div className="flex gap-2">
          <input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="Area code (e.g. 305)" maxLength={5}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <button onClick={search} disabled={searching}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </button>
        </div>
        {available.length > 0 && (
          <div className="space-y-1.5">
            {available.map((n, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border border-border/60">
                <div>
                  <p className="text-sm font-mono">{n.phone_number}</p>
                  <p className="text-[11px] text-muted-foreground">{n.locality}, {n.region} · {n.cost?.amount ? `$${n.cost.amount}/mo` : ''}</p>
                </div>
                <button onClick={() => buy(n.phone_number)} disabled={buying === n.phone_number}
                  className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                  {buying === n.phone_number ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Buy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}