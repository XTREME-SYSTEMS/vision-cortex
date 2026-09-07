import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Settings, User, MessageSquare, Brain, Mic, Cpu,
  Phone, Save, Loader2, Plus, X, Check, Trash2, Send,
  ShieldCheck, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const VOICES = [
  { id: 'alloy', label: 'Alloy — neutral, balanced' },
  { id: 'echo', label: 'Echo — warm, steady' },
  { id: 'fable', label: 'Fable — expressive, British' },
  { id: 'onyx', label: 'Onyx — deep, authoritative' },
  { id: 'nova', label: 'Nova — bright, energetic' },
  { id: 'shimmer', label: 'Shimmer — soft, airy' },
  { id: 'sage', label: 'Sage — calm, thoughtful' },
  { id: 'ash', label: 'Ash — raspy, grounded' },
  { id: 'ballad', label: 'Ballad — melodic, earnest' },
  { id: 'coral', label: 'Coral — confident, warm' },
];

const TONES = ['concise', 'friendly', 'professional', 'casual', 'formal', 'witty'];

const TRAIT_SUGGESTIONS = ['concise', 'proactive', 'witty', 'analytical', 'decisive', 'loyal', 'tenacious', 'direct', 'empathetic', 'strategic'];

export default function AgentSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newTrait, setNewTrait] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newMemory, setNewMemory] = useState('');
  const [commsStatus, setCommsStatus] = useState(null);
  const [commsAction, setCommsAction] = useState(null);
  const [commsResult, setCommsResult] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [healResult, setHealResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.AgentSettings.list('-updated_date', 1);
      if (list.length > 0) {
        setSettings(list[0]);
      } else {
        setSettings({
          user_name: '',
          about_user: '',
          response_style: '',
          personality_traits: [],
          conversation_rules: [],
          memory_enabled: true,
          memories: [],
          voice: 'alloy',
          tone: 'concise',
          model: 'gpt-4o-realtime-preview',
          auto_submit_voice: false,
          language: 'en',
          temperature: 0.7,
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (settings.id) {
        await base44.entities.AgentSettings.update(settings.id, settings);
      } else {
        const created = await base44.entities.AgentSettings.create(settings);
        setSettings(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const update = (field, value) => setSettings((s) => ({ ...s, [field]: value }));

  const addTrait = () => {
    const t = newTrait.trim().toLowerCase();
    if (t && !settings.personality_traits.includes(t)) {
      update('personality_traits', [...settings.personality_traits, t]);
    }
    setNewTrait('');
  };

  const removeTrait = (t) => update('personality_traits', settings.personality_traits.filter((x) => x !== t));

  const addRule = () => {
    const r = newRule.trim();
    if (r) update('conversation_rules', [...settings.conversation_rules, r]);
    setNewRule('');
  };

  const removeRule = (i) => update('conversation_rules', settings.conversation_rules.filter((_, idx) => idx !== i));

  const addMemory = () => {
    const m = newMemory.trim();
    if (m) update('memories', [...settings.memories, { content: m, category: 'manual' }]);
    setNewMemory('');
  };

  const removeMemory = (i) => update('memories', settings.memories.filter((_, idx) => idx !== i));

  const checkComms = async () => {
    setCommsAction('status');
    setCommsResult(null);
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: 'status' });
      setCommsStatus(res?.data || res);
    } catch (e) {
      setCommsStatus({ error: e.message });
    } finally {
      setCommsAction(null);
    }
  };

  const runCommsAction = async (actionName) => {
    setCommsAction(actionName);
    try {
      const res = await base44.functions.invoke('xtremeComms', { action: actionName });
      const data = res?.data || res;
      if (actionName === 'runAutonomousAudit') setAuditResult(data);
      else if (actionName === 'preflightHeal') setHealResult(data);
      return data;
    } catch (e) {
      if (actionName === 'runAutonomousAudit') setAuditResult({ error: e.message });
      else if (actionName === 'preflightHeal') setHealResult({ error: e.message });
    } finally {
      setCommsAction(null);
    }
  };

  useEffect(() => { checkComms(); }, []);

  if (loading || !settings) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading settings…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h1 className="font-display text-2xl tracking-tight">Agent Settings</h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-sm hover:opacity-90 transition-opacity"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Personalization — Custom Instructions */}
      <Section icon={User} title="Personalization" desc="Tell Prime about you and how to respond — applied to every conversation">
        <Field label="Your name" desc="What Prime should call you">
          <input
            value={settings.user_name || ''}
            onChange={(e) => update('user_name', e.target.value)}
            placeholder="e.g. Chris"
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        <Field label="What would you like Prime to know about you?" desc="Your background, context, preferences, goals">
          <textarea
            value={settings.about_user || ''}
            onChange={(e) => update('about_user', e.target.value)}
            rows={4}
            placeholder="e.g. I'm building an autonomous AI company. I value speed, directness, and systems thinking. I prefer concise answers over long explanations."
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        <Field label="How would you like Prime to respond?" desc="Tone, format, style preferences">
          <textarea
            value={settings.response_style || ''}
            onChange={(e) => update('response_style', e.target.value)}
            rows={3}
            placeholder="e.g. Be direct and concise. Use bullet points for lists. Proactively surface risks and opportunities. Don't hedge."
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        <Field label="Personality traits" desc="Select or add traits for Prime's personality">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {settings.personality_traits.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs bg-foreground/5 border border-border/40 rounded-full px-2 py-1">
                {t}
                <button onClick={() => removeTrait(t)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5 mb-2">
            <input
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrait())}
              placeholder="Add a trait…"
              className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addTrait} className="px-3 rounded-lg bg-muted hover:bg-muted/70 border border-border/40"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {TRAIT_SUGGESTIONS.filter((t) => !settings.personality_traits.includes(t)).map((t) => (
              <button
                key={t}
                onClick={() => update('personality_traits', [...settings.personality_traits, t])}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground border border-border/30 transition-colors"
              >
                + {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Conversation rules" desc="Rules Prime follows in every conversation">
          <div className="space-y-1.5 mb-2">
            {settings.conversation_rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
                <span className="flex-1">{r}</span>
                <button onClick={() => removeRule(i)} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
              placeholder="Add a rule…"
              className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addRule} className="px-3 rounded-lg bg-muted hover:bg-muted/70 border border-border/40"><Plus className="w-4 h-4" /></button>
          </div>
        </Field>
      </Section>

      {/* Memory */}
      <Section icon={Brain} title="Memory" desc="Prime remembers things across conversations">
        <Toggle
          label="Memory enabled"
          desc="Allow Prime to remember and reference past conversations"
          checked={settings.memory_enabled}
          onChange={(v) => update('memory_enabled', v)}
        />
        {settings.memory_enabled && (
          <Field label="Memories" desc="Things Prime should remember">
            <div className="space-y-1.5 mb-2">
              {settings.memories.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
                  <Brain className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="flex-1">{m.content}</span>
                  <button onClick={() => removeMemory(i)} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMemory())}
                placeholder="Add a memory…"
                className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              <button onClick={addMemory} className="px-3 rounded-lg bg-muted hover:bg-muted/70 border border-border/40"><Plus className="w-4 h-4" /></button>
            </div>
          </Field>
        )}
      </Section>

      {/* Voice */}
      <Section icon={Mic} title="Voice & Audio" desc="Settings for real-time voice conversations">
        <Field label="Voice" desc="Voice for real-time voice chat (OpenAI Realtime API)">
          <select
            value={settings.voice}
            onChange={(e) => update('voice', e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </Field>

        <Toggle
          label="Auto-submit voice"
          desc="Automatically submit voice transcriptions without manual send"
          checked={settings.auto_submit_voice}
          onChange={(v) => update('auto_submit_voice', v)}
        />
      </Section>

      {/* Model */}
      <Section icon={Cpu} title="Model" desc="AI model and response behavior">
        <Field label="Tone" desc="Conversation tone">
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => update('tone', t)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize',
                  settings.tone === t ? 'bg-foreground text-background border-foreground' : 'bg-muted border-border/40 hover:bg-muted/70'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Temperature: ${settings.temperature?.toFixed(1)}`} desc="0 = focused & deterministic, 2 = creative & varied">
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => update('temperature', parseFloat(e.target.value))}
            className="w-full accent-foreground"
          />
        </Field>

        <Field label="Language" desc="Conversation language">
          <select
            value={settings.language}
            onChange={(e) => update('language', e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
          </select>
        </Field>
      </Section>

      {/* Xtreme Communications */}
      <Section icon={Phone} title="Xtreme Communications" desc="SMS, MMS, WhatsApp, Email, Voice Agent — Twilio-equivalent comms system">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            'w-2 h-2 rounded-full',
            commsStatus?.configured === false ? 'bg-amber-500' :
            commsStatus?.status === 'connected' ? 'bg-emerald-500' :
            commsStatus?.error ? 'bg-red-500' : 'bg-muted-foreground'
          )} />
          <span className="text-xs text-muted-foreground">
            {commsStatus?.configured === false ? 'Not configured — add API keys in Secrets' :
             commsStatus?.status === 'connected' ? 'Connected' :
             commsStatus?.error ? 'Connection error' : 'Checking…'}
          </span>
          <button onClick={checkComms} disabled={commsAction} className="ml-auto text-xs px-2 py-1 rounded-lg border border-border/40 hover:bg-muted">
            {commsAction ? 'Checking…' : 'Recheck'}
          </button>
        </div>

        {commsStatus?.configured === false && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-amber-500 mb-1">Setup required</p>
            <p>Set these secrets in Dashboard → Secrets:</p>
            <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
              <li>• XTREME_COMMS_API_KEY — your API key</li>
              <li>• XTREME_COMMS_ACCOUNT_SID — your account SID</li>
              <li>• XTREME_COMMS_URL — API base URL (optional)</li>
            </ul>
          </div>
        )}

        <Field label="Default from number" desc="Phone number for SMS/calls">
          <input
            value={settings.xtreme_comms_from_number || ''}
            onChange={(e) => update('xtreme_comms_from_number', e.target.value)}
            placeholder="+1XXXXXXXXXX"
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        <Field label="Default from email" desc="Email address for outgoing emails">
          <input
            value={settings.xtreme_comms_from_email || ''}
            onChange={(e) => update('xtreme_comms_from_email', e.target.value)}
            placeholder="prime@visioncortex.com"
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        {/* Autonomous Audit & Auto-Heal */}
        <div className="rounded-lg bg-muted/50 border border-border/30 p-3 space-y-2">
          <p className="text-xs font-medium">System Operations</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => runCommsAction('runAutonomousAudit')}
              disabled={!!commsAction}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
            >
              {commsAction === 'runAutonomousAudit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              Run Autonomous Audit
            </button>
            <button
              onClick={() => runCommsAction('preflightHeal')}
              disabled={!!commsAction}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
            >
              {commsAction === 'preflightHeal' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Run Auto-Heal
            </button>
          </div>
          {auditResult && (
            <div className={cn('text-[10px] rounded p-2 border', auditResult.error ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-emerald-500/5 border-emerald-500/20 text-muted-foreground')}>
              {auditResult.error ? '❌ ' + auditResult.error : '✅ Audit: ' + JSON.stringify(auditResult.data || auditResult).slice(0, 300)}
            </div>
          )}
          {healResult && (
            <div className={cn('text-[10px] rounded p-2 border', healResult.error ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-amber-500/5 border-amber-500/20 text-muted-foreground')}>
              {healResult.error ? '❌ ' + healResult.error : '✅ Healed: ' + JSON.stringify(healResult.data || healResult).slice(0, 300)}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-2">
          Full portal at xtreme-communications.com — purchase numbers, create AI voice agents, send SMS/MMS/WhatsApp/Email, make calls.
        </p>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="space-y-3 pl-10">{children}</div>
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-0.5">{label}</label>
      {desc && <p className="text-[10px] text-muted-foreground mb-1.5">{desc}</p>}
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <label className="text-xs font-medium block">{label}</label>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors shrink-0',
          checked ? 'bg-foreground' : 'bg-muted'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-background border border-border/40 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
}