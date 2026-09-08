import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Loader2, Plus, Bot, PhoneCall, X, RefreshCw } from 'lucide-react';

export default function VoiceTab() {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [agentId, setAgentId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', voice: 'alloy', instructions: '', model: 'gpt-4o-realtime-preview' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [numRes, agentRes] = await Promise.all([
        base44.functions.invoke('xtremeComms', { action: 'list_numbers' }),
        base44.functions.invoke('xtremeComms', { action: 'list_voice_agents' }),
      ]);
      setNumbers(Array.isArray(numRes.data?.data) ? numRes.data.data : (numRes.data?.data?.numbers || []));
      setAgents(Array.isArray(agentRes.data?.data) ? agentRes.data.data : (agentRes.data?.data?.agents || []));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const makeCall = async () => {
    if (!to || !from) { toast({ title: 'To and From required' }); return; }
    setCalling(true);
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: 'make_call', to, from, agent_id: agentId || undefined, instructions: instructions || undefined });
      if (res.data?.ok === false) throw new Error(res.data?.data?.error || 'Call failed');
      toast({ title: 'Call initiated', description: `Calling ${to}` });
      setTo(''); setInstructions('');
    } catch (e) {
      toast({ title: 'Call failed', description: e.message, variant: 'destructive' });
    }
    setCalling(false);
  };

  const createAgent = async () => {
    if (!newAgent.name) { toast({ title: 'Name required' }); return; }
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: 'create_voice_agent', ...newAgent });
      if (res.data?.ok === false) throw new Error(res.data?.data?.error || 'Create failed');
      toast({ title: 'Voice agent created', description: newAgent.name });
      setShowCreate(false);
      setNewAgent({ name: '', voice: 'alloy', instructions: '', model: 'gpt-4o-realtime-preview' });
      load();
    } catch (e) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Make a call */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2"><PhoneCall className="h-4 w-4 text-violet-500" /> Make a Voice Call</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">From</label>
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              <option value="">Select number…</option>
              {numbers.map((n, i) => <option key={i} value={n.phone_number || n.number}>{n.phone_number || n.number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">To (E.164)</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="+13055551234"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Voice Agent (optional)</label>
          <select value={agentId} onChange={e => setAgentId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
            <option value="">Default voice</option>
            {agents.map((a, i) => <option key={a.id || i} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Instructions (optional)</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} placeholder="e.g. Ask about their HVAC service needs…"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
        </div>
        <button onClick={makeCall} disabled={calling}
          className="w-full px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Place Call
        </button>
      </div>

      {/* Voice agents */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Voice Agents</h3>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="px-2 py-1 rounded border border-border text-xs hover:bg-accent flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs flex items-center gap-1">
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
        </div>
        {agents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No voice agents. Create one to use custom AI voices for calls.</p>
        ) : (
          <div className="space-y-1.5">
            {agents.map((a, i) => (
              <div key={a.id || i} className="flex items-center justify-between p-2 rounded border border-border/60">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">Voice: {a.voice || 'default'} · Model: {a.model || 'auto'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create agent modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> New Voice Agent</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
              <input value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sales Rep AI"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Voice</label>
              <select value={newAgent.voice} onChange={e => setNewAgent(p => ({ ...p, voice: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'sage', 'ash', 'ballad', 'coral'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Instructions</label>
              <textarea value={newAgent.instructions} onChange={e => setNewAgent(p => ({ ...p, instructions: e.target.value }))} rows={3} placeholder="You are a friendly sales agent for…"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            </div>
            <button onClick={createAgent} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Create Agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}