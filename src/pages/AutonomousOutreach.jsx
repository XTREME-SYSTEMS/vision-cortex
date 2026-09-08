import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Rocket, Loader2, Search, Zap, Phone, Mail, FileText, Send,
  CheckCircle, AlertCircle, Clock, Users, Target, TrendingUp,
  Play, Pause, RefreshCw, Eye, Sparkles
} from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'scraping', label: 'Scrape', icon: Search, desc: 'Find every business' },
  { key: 'enriching', label: 'Enrich', icon: Zap, desc: 'Employees, revenue, equipment, materials' },
  { key: 'auditing', label: 'Audit', icon: Eye, desc: 'Website leaks, upsells, AI tools' },
  { key: 'messaging', label: 'MMS Blast', icon: Send, desc: 'Batch outreach to owners' },
  { key: 'calling', label: 'AI Calls', icon: Phone, desc: 'Eden Skye schedules consultations' },
  { key: 'following_up', label: 'Follow-Up', icon: RefreshCw, desc: 'Persistent agent nurtures leads' },
];

const HOOKS = [
  { v: 'free_audit', label: 'Free Website Audit', desc: 'Show them where they lose leads' },
  { v: 'ai_tools', label: 'AI Tools', desc: 'Auto-respond, never miss a job' },
  { v: 'free_lead_gen_website', label: 'Free Lead Gen Website', desc: 'First month free — we get paid if they get leads' },
];

export default function AutonomousOutreach() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [showNew, setShowNew] = useState(false);

  // New campaign form
  const [form, setForm] = useState({
    name: '',
    industry: 'epoxy',
    location: 'Florida',
    keyword: '',
    radius_miles: 50,
    hooks: ['free_audit', 'ai_tools', 'free_lead_gen_website'],
    from_number: '',
    batch_size: 50,
    max_daily_calls: 100,
    autonomous: false,
  });

  const loadCampaigns = useCallback(async () => {
    try {
      const list = await base44.entities.OutreachCampaign.list('-created_date', 50);
      setCampaigns(list || []);
    } catch { setCampaigns([]); }
    setLoading(false);
  }, []);

  const loadNumbers = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('telnyxComms', { action: 'list_numbers' });
      if (res.data?.ok) setNumbers(res.data.numbers || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCampaigns(); loadNumbers(); }, [loadCampaigns, loadNumbers]);

  const createCampaign = async () => {
    if (!form.industry || !form.location || !form.name) {
      toast({ title: 'Name, industry, and location required', variant: 'destructive' });
      return;
    }
    try {
      const campaign = await base44.entities.OutreachCampaign.create({
        ...form,
        type: 'full_pipeline',
        status: 'queued',
      });
      toast({ title: 'Campaign created', description: campaign.name });
      setShowNew(false);
      loadCampaigns();
      // Auto-start the pipeline
      runPipeline(campaign.id);
    } catch (e) {
      toast({ title: 'Failed to create', description: e.message, variant: 'destructive' });
    }
  };

  const runPipeline = async (campaignId) => {
    setRunning(campaignId);
    try {
      const res = await base44.functions.invoke('batchLeadFactory', {
        action: 'run_pipeline',
        campaign_id: campaignId,
        industry: form.industry,
        location: form.location,
        keyword: form.keyword,
        radius_miles: form.radius_miles,
        hooks: form.hooks,
      });
      if (res.data?.ok) {
        toast({
          title: 'Pipeline complete',
          description: `${res.data.total_leads} leads · ${res.data.enriched} enriched · ${res.data.audited} audited`,
        });
      } else {
        toast({ title: 'Pipeline issue', description: res.data?.error || 'Unknown', variant: 'destructive' });
      }
      loadCampaigns();
    } catch (e) {
      toast({ title: 'Pipeline failed', description: e.message, variant: 'destructive' });
    }
    setRunning(null);
  };

  const sendBatchMms = async (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign?.from_number) {
      toast({ title: 'Set a from number first', variant: 'destructive' });
      return;
    }
    setRunning(campaignId);
    try {
      const res = await base44.functions.invoke('batchMmsOutreach', {
        action: 'send_batch',
        campaign_id: campaignId,
        from: campaign.from_number,
        channel: 'mms',
        batch_size: campaign.batch_size || 50,
        delay_seconds: 3,
      });
      toast({
        title: `MMS batch sent`,
        description: `${res.data?.sent} sent · ${res.data?.failed} failed`,
        variant: res.data?.failed > 0 ? 'destructive' : 'default',
      });
      loadCampaigns();
    } catch (e) {
      toast({ title: 'MMS batch failed', description: e.message, variant: 'destructive' });
    }
    setRunning(null);
  };

  const startCallCampaign = async (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign?.from_number) {
      toast({ title: 'Set a from number first', variant: 'destructive' });
      return;
    }
    setRunning(campaignId);
    try {
      const res = await base44.functions.invoke('aiCallCampaign', {
        action: 'start_campaign',
        campaign_id: campaignId,
        from: campaign.from_number,
        max_calls: campaign.max_daily_calls || 100,
      });
      toast({
        title: 'AI call campaign started',
        description: `${res.data?.calls_made} calls placed · ${res.data?.calls_failed} failed`,
      });
      loadCampaigns();
    } catch (e) {
      toast({ title: 'Call campaign failed', description: e.message, variant: 'destructive' });
    }
    setRunning(null);
  };

  const runFollowUps = async () => {
    const fromNumber = numbers[0]?.phone_number;
    if (!fromNumber) {
      toast({ title: 'No Telnyx numbers available', variant: 'destructive' });
      return;
    }
    setRunning('follow-ups');
    try {
      const res = await base44.functions.invoke('persistentMessageAgent', {
        action: 'run_follow_ups',
        from: fromNumber,
        max_per_run: 50,
      });
      toast({ title: 'Follow-ups sent', description: `${res.data?.sent} sent · ${res.data?.failed} failed` });
    } catch (e) {
      toast({ title: 'Follow-ups failed', description: e.message, variant: 'destructive' });
    }
    setRunning(null);
  };

  const toggleHook = (hook) => {
    setForm(prev => ({
      ...prev,
      hooks: prev.hooks.includes(hook) ? prev.hooks.filter(h => h !== hook) : [...prev.hooks, hook],
    }));
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2">
            <Rocket className="h-5 w-5 md:h-6 md:w-6 text-violet-500" /> Autonomous Outreach Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full pipeline: scrape → enrich → audit → MMS blast → AI voice calls → persistent follow-up. All autonomous.
          </p>
        </div>
        <button onClick={() => setShowNew(s => !s)}
          className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:opacity-90 flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Pipeline stages visual */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {PIPELINE_STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="rounded-lg border border-border bg-card p-2.5 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1 text-violet-500" />
              <p className="text-[10px] font-medium">{s.label}</p>
              <p className="text-[9px] text-muted-foreground hidden md:block leading-tight mt-0.5">{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* New campaign form */}
      {showNew && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2"><Rocket className="h-4 w-4 text-violet-500" /> Create New Campaign</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Campaign Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Epoxy Florida Blitz"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Industry *</label>
              <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                placeholder="epoxy, hvac, roofing..."
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Location *</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="Florida, Miami FL..."
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Keyword</label>
              <input value={form.keyword} onChange={e => setForm(p => ({ ...p, keyword: e.target.value }))}
                placeholder="optional"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Radius (miles)</label>
              <input type="number" value={form.radius_miles} onChange={e => setForm(p => ({ ...p, radius_miles: parseInt(e.target.value) || 50 }))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">From Number</label>
              <select value={form.from_number} onChange={e => setForm(p => ({ ...p, from_number: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                <option value="">Select number…</option>
                {numbers.map((n, i) => <option key={n.id || i} value={n.phone_number}>{n.phone_number}</option>)}
              </select>
            </div>
          </div>

          {/* Hooks */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Marketing Hooks</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {HOOKS.map(h => (
                <label key={h.v} className={cn('flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                  form.hooks.includes(h.v) ? 'border-violet-500/40 bg-violet-500/10' : 'border-border hover:bg-accent')}>
                  <input type="checkbox" checked={form.hooks.includes(h.v)} onChange={() => toggleHook(h.v)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className="text-[10px] text-muted-foreground">{h.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced settings */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Batch Size</label>
              <input type="number" value={form.batch_size} onChange={e => setForm(p => ({ ...p, batch_size: parseInt(e.target.value) || 50 }))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Max Daily AI Calls</label>
              <input type="number" value={form.max_daily_calls} onChange={e => setForm(p => ({ ...p, max_daily_calls: parseInt(e.target.value) || 100 }))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input type="checkbox" checked={form.autonomous} onChange={e => setForm(p => ({ ...p, autonomous: e.target.checked }))} />
              <span className="text-sm">Run autonomously (daily)</span>
            </label>
          </div>

          <button onClick={createCampaign} disabled={running === 'new'}
            className="w-full px-4 py-2.5 rounded-lg bg-violet-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {running === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Create & Launch Pipeline
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <button onClick={runFollowUps} disabled={running === 'follow-ups'}
          className="rounded-lg border border-border bg-card p-3 hover:border-violet-500/40 transition-colors text-left flex items-center gap-3 disabled:opacity-50">
          <RefreshCw className={cn('h-5 w-5 text-violet-500', running === 'follow-ups' && 'animate-spin')} />
          <div>
            <p className="text-sm font-medium">Run Follow-Ups Now</p>
            <p className="text-[11px] text-muted-foreground">Send due follow-ups to all CRM contacts</p>
          </div>
        </button>
      </div>

      {/* Campaigns list */}
      <div>
        <h3 className="text-sm font-medium mb-2">Campaigns</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No campaigns yet. Create one above to get started.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} running={running} onPipeline={runPipeline} onMms={sendBatchMms}
                onCalls={startCallCampaign} onUpdate={loadCampaigns} numbers={numbers} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaign Card Component ──────────────────────────────────
function CampaignCard({ campaign, running, onPipeline, onMms, onCalls, onUpdate, numbers }) {
  const [expanded, setExpanded] = useState(false);
  const [fromNumber, setFromNumber] = useState(campaign.from_number || '');

  const updateFrom = async (num) => {
    setFromNumber(num);
    await base44.entities.OutreachCampaign.update(campaign.id, { from_number: num });
    onUpdate();
  };

  const stats = [
    { label: 'Leads', value: campaign.total_leads || 0, icon: Users },
    { label: 'Enriched', value: campaign.enriched_leads || 0, icon: Zap },
    { label: 'Audited', value: campaign.audited_leads || 0, icon: Eye },
    { label: 'MMS Sent', value: campaign.messages_sent || 0, icon: Send },
    { label: 'Calls', value: campaign.calls_made || 0, icon: Phone },
    { label: 'Consults', value: campaign.consultations_scheduled || 0, icon: CheckCircle },
  ];

  const statusColor = {
    queued: 'bg-muted text-muted-foreground',
    scraping: 'bg-blue-500/10 text-blue-500',
    enriching: 'bg-amber-500/10 text-amber-500',
    auditing: 'bg-purple-500/10 text-purple-500',
    sending: 'bg-cyan-500/10 text-cyan-500',
    calling: 'bg-violet-500/10 text-violet-500',
    completed: 'bg-emerald-500/10 text-emerald-500',
    failed: 'bg-destructive/10 text-destructive',
    paused: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium truncate">{campaign.name}</h4>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', statusColor[campaign.status] || 'bg-muted')}>
                {campaign.status}
              </span>
              {campaign.autonomous && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500">AUTONOMOUS</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaign.industry} · {campaign.location} · {campaign.radius_miles}mi radius
            </p>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary hover:underline shrink-0">
            {expanded ? 'Hide' : 'Details'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center">
                <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-sm font-semibold">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {campaign.progress > 0 && campaign.status !== 'completed' && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${campaign.progress}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{campaign.progress}%</p>
          </div>
        )}

        {/* From number selector */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">From:</span>
          <select value={fromNumber} onChange={e => updateFrom(e.target.value)}
            className="h-8 px-2 rounded border border-border bg-background text-xs focus:border-primary outline-none">
            <option value="">Select…</option>
            {numbers.map((n, i) => <option key={n.id || i} value={n.phone_number}>{n.phone_number}</option>)}
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button onClick={() => onPipeline(campaign.id)} disabled={running === campaign.id}
            className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
            {running === campaign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Run Pipeline
          </button>
          <button onClick={() => onMms(campaign.id)} disabled={running === campaign.id || !fromNumber}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent disabled:opacity-50 flex items-center gap-1">
            <Send className="h-3 w-3" /> Send MMS Batch
          </button>
          <button onClick={() => onCalls(campaign.id)} disabled={running === campaign.id || !fromNumber}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent disabled:opacity-50 flex items-center gap-1">
            <Phone className="h-3 w-3" /> Start AI Calls
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-2">
          {campaign.results?.sample_messages?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Sample Messages</p>
              {campaign.results.sample_messages.map((m, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2 mb-1">
                  <p className="text-[11px] font-medium">{m.business} — {m.phone || 'no phone'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.message}</p>
                </div>
              ))}
            </div>
          )}
          {campaign.results?.send_errors?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1 text-destructive">Send Errors ({campaign.results.send_errors.length})</p>
              {campaign.results.send_errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[11px] text-destructive">• {e}</p>
              ))}
            </div>
          )}
          {campaign.results?.call_errors?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1 text-destructive">Call Errors ({campaign.results.call_errors.length})</p>
              {campaign.results.call_errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[11px] text-destructive">• {e}</p>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Created {new Date(campaign.created_date).toLocaleString()}
            {campaign.started_at && ` · Started ${new Date(campaign.started_at).toLocaleString()}`}
            {campaign.completed_at && ` · Completed ${new Date(campaign.completed_at).toLocaleString()}`}
          </p>
        </div>
      )}
    </div>
  );
}