import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Bot, AlertCircle, ShieldCheck, AlertTriangle, Paperclip, X, Lightbulb, Mic, MicOff, Phone, Plus, ChevronDown, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import VoiceChat from '@/components/chat/VoiceChat';

const MODELS = [
  { id: 'auto', label: 'Auto', icon: Zap, description: 'Heuristic — picks best model per request' },
  { id: 'openai/gpt-5.6-sol', label: 'GPT-5.6 Sol', icon: null, description: 'Fast & capable — daily driver' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', icon: null, description: 'Advanced reasoning — complex logic' },
  { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8', icon: null, description: 'Deepest reasoning — strategy & analysis' },
  { id: 'google/gemini-3.1-pro', label: 'Gemini 3.1 Pro', icon: null, description: 'Balanced multimodal — long context' },
  { id: 'xai/grok-4', label: 'Grok-4', icon: null, description: 'Real-time knowledge — current events' },
];

export default function UniversalChat({ activeAgents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [validating, setValidating] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [plugins, setPlugins] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const plusMenuRef = useRef(null);

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

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) setPlusMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
        model: selectedModel,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      const newMsgs = [];
      if (data.agent_outputs?.length) {
        for (const o of data.agent_outputs) {
          newMsgs.push({ author: o.agent, author_type: 'agent', content: o.message, accent: o.accent, delegated: true });
        }
      }
      newMsgs.push({ author: 'Prime', author_type: 'agent', content: data.reply, accent: 'foreground', primary: true, model: data.model_used });
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

  const validate = async () => {
    const hasPrime = messages.some((m) => m.author === 'Prime' && !m.validation);
    if (!hasPrime || validating) return;
    setValidating(true);
    setPlusMenuOpen(false);
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
    setPlusMenuOpen(false);
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
    setPlusMenuOpen(false);
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

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];
  const hasPrime = messages.some((m) => m.author === 'Prime' && !m.validation);

  const plusMenuItems = [
    { icon: Paperclip, label: 'Attach', onClick: () => fileInputRef.current?.click(), disabled: uploading, loading: uploading },
    { icon: listening ? MicOff : Mic, label: listening ? 'Stop' : 'Dictate', onClick: toggleVoiceInput, active: listening },
    { icon: Phone, label: 'Voice', onClick: () => { setVoiceChatOpen(true); setPlusMenuOpen(false); } },
    { icon: ShieldCheck, label: 'Validate', onClick: validate, disabled: validating || !hasPrime, loading: validating },
  ];

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
            <p className="text-[10px] mt-2 text-muted-foreground/70">Type a message. Use the + menu for attachments, dictation, voice, and validation.</p>
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className={cn('text-[10px] uppercase tracking-wider font-semibold', isPrimary ? 'text-foreground' : 'text-muted-foreground')}>
                      {m.author}{m.delegated && ' · delegated'}{m.approval && ' · approval needed'}
                    </p>
                    {m.model && m.model !== 'auto' && (
                      <span className="text-[9px] text-muted-foreground/60 font-mono">{m.model.split('/').pop()}</span>
                    )}
                  </div>
                )}
                <div className={cn('text-sm', m.approval && 'bg-amber-500/5 border border-amber-500/30 rounded-xl p-3')}>
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
        {validating && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Validating last response…</div>
          </div>
        )}
      </div>

      {/* Input area — moved down with extra padding */}
      <div className="px-4 pt-2 pb-5 border-t border-border/60">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-3xl mx-auto mb-3 justify-center">
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

          {/* Input bubble with + menu and send arrow inside */}
          <div className="relative flex items-end gap-2 bg-muted rounded-2xl border border-border/40 focus-within:ring-1 focus-within:ring-ring transition-shadow">
            {/* + button inside bubble */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                disabled={uploading}
                className={cn(
                  'w-9 h-9 shrink-0 rounded-xl grid place-items-center transition-colors m-1',
                  plusMenuOpen ? 'bg-foreground text-background' : 'hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground',
                  uploading && 'opacity-40'
                )}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className={cn('w-4 h-4 transition-transform', plusMenuOpen && 'rotate-45')} />}
              </button>
              {/* + menu popover — models + actions */}
              {plusMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden w-56">
                  {/* Model selector */}
                  <div className="px-3 pt-2.5 pb-1.5 border-b border-border/30">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> Model
                    </p>
                    <div className="space-y-0.5 max-h-44 overflow-y-auto no-scrollbar">
                      {MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedModel(m.id)}
                          className={cn(
                            'w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors',
                            selectedModel === m.id && 'bg-muted/60'
                          )}
                        >
                          <div className="shrink-0 mt-0.5">
                            {selectedModel === m.id ? <Check className="w-3 h-3 text-foreground" /> : <div className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium leading-tight">{m.label}</p>
                            <p className="text-[9px] text-muted-foreground leading-tight">{m.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="p-1.5">
                    {plusMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          disabled={item.disabled}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors',
                            item.active && 'text-red-500',
                            item.disabled && 'opacity-40'
                          )}
                        >
                          {item.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                          <span className="text-[11px] font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Textarea */}
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
              className="flex-1 resize-none bg-transparent py-3 text-sm outline-none max-h-28 min-h-[40px] placeholder:text-muted-foreground/60"
            />

            {/* Send arrow inside bubble — smaller */}
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className={cn(
                'w-8 h-8 shrink-0 rounded-lg grid place-items-center transition-all m-1',
                input.trim() && !sending
                  ? 'bg-foreground text-background hover:scale-105'
                  : 'bg-muted-foreground/10 text-muted-foreground/40',
                sending && 'opacity-50'
              )}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-center mt-2">
            <p className="text-[10px] text-muted-foreground">
              Prime orchestrates · {activeAgents.length > 0 ? 'delegation hints: ' + activeAgents.join(' · ') : 'auto-delegate'}
            </p>
          </div>
        </div>
      </div>
      {voiceChatOpen && <VoiceChat onClose={() => setVoiceChatOpen(false)} />}
    </div>
  );
}