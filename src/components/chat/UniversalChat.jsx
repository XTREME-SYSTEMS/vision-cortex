import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Bot, User, AlertCircle, FlaskConical, ShieldCheck, AlertTriangle, Paperclip, X, Lightbulb, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import VoiceChat from '@/components/chat/VoiceChat';

export default function UniversalChat({ activeAgents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [plugins, setPlugins] = useState([]);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const suggestions = [
    'Analyze my current portfolio',
    'Find new business opportunities',
    'Run a system health audit',
    'What should I focus on today?',
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    base44.entities.Plugin.filter({ enabled: true }).then(setPlugins).catch(() => {});
  }, []);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((m) => [...m, { author: 'You', author_type: 'user', content: text }]);
    setInput('');
    setAttachedFiles([]);
    setSending(true);
    try {
      const res = await base44.functions.invoke('primusOrchestrate', {
        message: text,
        history: messages.slice(-8),
        agent_names: activeAgents,
        file_urls: attachedFiles.length > 0 ? attachedFiles.map(f => f.url) : undefined,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      const newMsgs = [];
      // Show delegated agent outputs (collapsed)
      if (data.agent_outputs?.length) {
        for (const o of data.agent_outputs) {
          newMsgs.push({ author: o.agent, author_type: 'agent', content: o.message, accent: o.accent, delegated: true });
        }
      }
      // Primus unified reply
      newMsgs.push({ author: 'Prime', author_type: 'agent', content: data.reply, accent: 'foreground', primary: true });
      // Approval request
      if (data.delegation?.needs_approval) {
        newMsgs.push({ author: 'Prime', author_type: 'agent', content: '⏸ Awaiting your approval to execute. ' + (data.delegation.approval_reason || ''), approval: true });
      }
      setMessages((m) => [...m, ...newMsgs]);
    } catch (e) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Error: ' + (e.message || 'Failed to reach Prime') }]);
    } finally {
      setSending(false);
    }
  };

  const simulate = async () => {
    const topic = input.trim() || messages.filter((m) => m.author_type === 'user').pop()?.content;
    if (!topic || simulating) return;
    setSimulating(true);
    setMessages((m) => [...m, { author: 'You', author_type: 'user', content: '🔬 Simulate: ' + topic }]);
    if (input.trim()) setInput('');
    try {
      const res = await base44.functions.invoke('simulateTopic', { topic, context: messages.slice(-6).map((m) => m.content).join('\n') });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      const sim = data.simulation || {};
      const options = sim.options || [];
      const simText =
        '📊 DECISION SIMULATION: ' + (sim.topic || topic) + '\n\n' +
        (sim.summary || '') + '\n\n' +
        '3 OPTIONS EVALUATED:\n' +
        options.map((o) => '• ' + o.name + ' (' + Math.round((o.success_probability || 0) * 100) + '% success): ' + o.approach + ' | Impact: ' + (o.financial_impact || 'N/A') + ' | Timeline: ' + (o.timeline || 'N/A')).join('\n') +
        '\n\n✅ CHOSEN: ' + (sim.chosen_option || 'N/A') +
        '\nRationale: ' + (sim.chosen_rationale || 'N/A') +
        '\nCore alignment: ' + (sim.core_alignment || 'N/A') +
        (sim.aligned === false ? ' ⚠️ Not fully aligned' : ' ✓ Aligned') +
        '\nConfidence: ' + Math.round((sim.confidence || 0) * 100) + '%\n\n' +
        'Recommendation: ' + (sim.recommendation || 'N/A');
      setMessages((m) => [...m, { author: 'Prime', author_type: 'agent', content: simText, accent: 'chart-3', simulation: true }]);
    } catch (e) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Simulation error: ' + (e.message || 'failed') }]);
    } finally {
      setSimulating(false);
    }
  };

  const validate = async () => {
    const hasPrime = messages.some((m) => m.author === 'Prime' && !m.validation);
    if (!hasPrime || validating) return;
    setValidating(true);
    try {
      const res = await base44.functions.invoke('primusOrchestrate', { action: 'validate' });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      if (data.validation) {
        setMessages((m) => [...m, { author: 'VALIDATOR', author_type: 'agent', content: data.validation, validation: true }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Validation error: ' + (e.message || 'failed') }]);
    } finally {
      setValidating(false);
    }
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Voice input not supported in this browser. Try Chrome or Edge.' }]);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const validationVerdict = (v) => {
    if (!v || !v.verdict) return null;
    const map = {
      APPROVED: { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/30' },
      APPROVED_WITH_NOTES: { icon: ShieldCheck, color: 'text-sky-500', bg: 'bg-sky-500/5 border-sky-500/30' },
      REJECTED: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/5 border-rose-500/30' },
    };
    return map[v.verdict] || map.APPROVED;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ name: file.name, url: file_url, size: file.size });
      }
      setAttachedFiles(prev => [...prev, ...uploaded]);
    } catch (err) {
      setMessages(m => [...m, { author: 'System', author_type: 'agent', content: 'Upload failed: ' + (err.message || 'error') }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  const applySuggestion = (s) => setInput(s);

  return (
    <div className="h-full flex flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-foreground text-background grid place-items-center mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Prime is online.</p>
            <p className="text-xs mt-1 max-w-xs">Your primary orchestrator. It delegates to the right agents and asks before executing anything.</p>
            <p className="text-[10px] mt-2 text-muted-foreground/70">Type a message. Use the validate or simulate buttons when you want deeper analysis.</p>
          </div>
        )}
        {messages.map((m, i) => {
          if (m.validation) {
            const v = validationVerdict(m.content);
            if (!v) return null;
            const VIcon = v.icon;
            return (
              <div key={i} className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-muted grid place-items-center shrink-0 mt-0.5">
                  <VIcon className={cn('w-3.5 h-3.5', v.color)} />
                </div>
                <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-xs border', v.bg)}>
                  <p className={cn('text-[10px] uppercase tracking-wider mb-1 font-semibold', v.color)}>Validator · {m.content.verdict}</p>
                  {m.content.risks?.length > 0 && <p className="text-muted-foreground mb-1">Risks: {m.content.risks.join('; ')}</p>}
                  {m.content.fixes?.length > 0 && <p className="text-muted-foreground mb-1">Fixes: {m.content.fixes.join('; ')}</p>}
                  <p className="text-muted-foreground italic">{m.content.reasoning}</p>
                </div>
              </div>
            );
          }
          const isPrimary = m.primary || m.approval;
          const isUser = m.author_type === 'user';

          // ChatGPT style: user = gray bubble right, AI = no bubble left with avatar
          if (isUser) {
            return (
              <div key={i} className="flex justify-end">
                <div className="bg-muted rounded-3xl px-4 py-2.5 text-sm max-w-[80%]">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={cn('flex gap-3', m.delegated && 'opacity-70')}>
              <div className={cn('w-7 h-7 rounded-full grid place-items-center shrink-0 mt-0.5', isPrimary ? 'bg-foreground text-background' : 'bg-muted')}>
                {m.author === 'System' ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {m.author !== 'System' && (
                  <p className={cn('text-[10px] uppercase tracking-wider mb-1 font-semibold', isPrimary ? 'text-foreground' : 'text-muted-foreground')}>
                    {m.author}{m.delegated && ' · delegated'}{m.simulation && ' · simulation'}{m.approval && ' · approval needed'}
                  </p>
                )}
                <div className={cn('text-sm', m.simulation && 'bg-chart-3/5 border border-chart-3/20 rounded-xl p-3', m.approval && 'bg-amber-500/5 border border-amber-500/30 rounded-xl p-3')}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-foreground text-background grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Prime is orchestrating…</div>
          </div>
        )}
        {simulating && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-chart-3/20 grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-chart-3" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Evaluating 3 options, picking best…</div>
          </div>
        )}
        {validating && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Validating last response…</div>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-border/60">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-3xl mx-auto mb-2.5 justify-center">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => applySuggestion(s)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/40 transition-colors flex items-center gap-1"
              >
                <Lightbulb className="w-2.5 h-2.5" /> {s}
              </button>
            ))}
          </div>
        )}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-3xl mx-auto mb-2">
            {attachedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] bg-muted rounded-lg px-2 py-1 border border-border/40">
                <Paperclip className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="truncate max-w-32">{f.name}</span>
                <button onClick={() => removeFile(i)} className="hover:text-destructive transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
          {/* Model picker — ChatGPT style */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-muted">
              <Bot className="w-3 h-3" />
              Prime
            </div>
            {plugins.map((p) => (
              <span key={p.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border border-border/30 text-muted-foreground">
                {p.name}
              </span>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message Prime…"
            rows={1}
            className="w-full resize-none bg-muted rounded-xl px-3.5 py-3 text-sm outline-none max-h-28 min-h-[44px] focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center justify-between gap-1 mt-2">
            <ActionButton icon={Paperclip} label="Attach" tooltip="Attach files" onClick={() => fileInputRef.current?.click()} disabled={uploading} loading={uploading} />
            <ActionButton icon={listening ? MicOff : Mic} label={listening ? 'Stop' : 'Dictate'} tooltip="Voice-to-text input" onClick={toggleVoiceInput} active={listening} />
            <ActionButton icon={Phone} label="Voice" tooltip="Real-time voice chat with interrupt" onClick={() => setVoiceChatOpen(true)} />
            <ActionButton icon={ShieldCheck} label="Validate" tooltip="Validate last Prime response" onClick={validate} disabled={validating || !messages.some((m) => m.author === 'Prime' && !m.validation)} loading={validating} />
            <ActionButton icon={FlaskConical} label="Simulate" tooltip="Evaluate 3 options, pick best" onClick={simulate} disabled={simulating || (!input.trim() && !messages.some((m) => m.author_type === 'user'))} loading={simulating} />
            <ActionButton icon={Send} label="Send" tooltip="Send message" onClick={send} disabled={sending || !input.trim()} loading={sending} primary />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1.5">
          <p className="text-[10px] text-muted-foreground">
            Prime orchestrates · {activeAgents.length > 0 ? 'delegation hints: ' + activeAgents.join(' · ') : 'auto-delegate'}
          </p>
        </div>
      </div>
      {voiceChatOpen && <VoiceChat onClose={() => setVoiceChatOpen(false)} />}
    </div>
  );
}

function ActionButton({ icon: Icon, label, tooltip, onClick, disabled, loading, active, primary }) {
  return (
    <div className="relative group flex-1">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-full flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors',
          primary ? 'bg-foreground text-background' : active ? 'bg-red-500/15 text-red-500' : 'hover:bg-muted text-foreground',
          disabled && 'opacity-40'
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        <span className="text-[9px] font-medium">{label}</span>
      </button>
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {tooltip}
      </span>
    </div>
  );
}