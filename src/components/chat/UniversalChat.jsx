import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, EyeOff, AlertCircle, Paperclip, X, Lightbulb, Mic, MicOff, Phone, Plus, ChevronDown, Check, Zap, Bot, Terminal, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import VoiceChat from '@/components/chat/VoiceChat';
import AutoBuildModal from '@/components/chat/AutoBuildModal';

const LOGO_URL = 'https://media.base44.com/images/public/6a9342ffbeff8b7c5a7bff8a/7b63e08e9_generated_image.png';
const AGENT_NAME = 'shadow';

const MODELS = [
  { id: 'auto', label: 'Auto', icon: Zap, description: 'Heuristic — picks best model per request' },
  { id: 'openai/gpt-5.6-sol', label: 'GPT-5.6 Sol', icon: null, description: 'Fast & capable — daily driver' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', icon: null, description: 'Advanced reasoning — complex logic' },
  { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8', icon: null, description: 'Deepest reasoning — strategy & analysis' },
  { id: 'google/gemini-3.1-pro', label: 'Gemini 3.1 Pro', icon: null, description: 'Balanced multimodal — long context' },
  { id: 'xai/grok-4', label: 'Grok-4', icon: null, description: 'Real-time knowledge — current events' },
];

export default function UniversalChat({ activeAgents }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [plugins, setPlugins] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [denied, setDenied] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const plusMenuRef = useRef(null);

  const suggestions = [
    'Execute the full deployment plan',
    'Run a system health audit',
    'Scrape new leads and start outreach',
    'What should I focus on today?',
  ];

  // Initialize Shadow conversation
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!u || u.role !== 'admin') { setDenied(true); setInitLoading(false); return; }
        const convos = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let conv;
        if (convos && convos.length) {
          conv = await base44.agents.getConversation(convos[0].id);
        } else {
          conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: 'Shadow', description: 'Primary autonomous operator — owner only' },
          });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
        unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
        });
      } catch {
        setDenied(true);
      }
      setInitLoading(false);
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    base44.entities.Plugin.filter({ enabled: true }).then(setPlugins).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) setPlusMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const send = async () => {
    if (!input.trim() || sending || !conversation) return;
    let content = input.trim();
    if (attachedFiles.length > 0) {
      content += '\n\n[Attached files: ' + attachedFiles.map(f => f.name + ' (' + f.url + ')').join(', ') + ']';
    }
    setInput('');
    setAttachedFiles([]);
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content });
    } catch {
      /* subscription will surface errors */
    } finally {
      setSending(false);
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
      setMessages((m) => [...m, { role: 'assistant', content: 'Voice input not supported in this browser. Try Chrome or Edge.' }]);
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
      setMessages(m => [...m, { role: 'assistant', content: 'Upload failed: ' + (err.message || 'error') }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  const applySuggestion = (s) => setInput(s);

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  const plusMenuItems = [
    { icon: Terminal, label: 'Auto Builder', onClick: () => { setAutoBuildOpen(true); setPlusMenuOpen(false); } },
    { icon: Paperclip, label: 'Attach', onClick: () => fileInputRef.current?.click(), disabled: uploading, loading: uploading },
    { icon: listening ? MicOff : Mic, label: listening ? 'Stop' : 'Dictate', onClick: toggleVoiceInput, active: listening },
    { icon: Phone, label: 'Voice', onClick: () => { setVoiceChatOpen(true); setPlusMenuOpen(false); } },
  ];

  if (denied) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <EyeOff className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Access denied. Shadow answers only to the owner.</p>
      </div>
    );
  }

  if (initLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-foreground/5 grid place-items-center mb-3">
              <EyeOff className="w-5 h-5 text-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Shadow is online. Maximum autonomy.</p>
            <p className="text-xs mt-1 max-w-xs">Your primary autonomous operator. Zero restrictions — every function, every entity, every system. Execute first, report after.</p>
            <p className="text-[10px] mt-2 text-muted-foreground/70">Type a command. Use the + menu for attachments, dictation, voice, and auto-build.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
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
            <div key={i} className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-foreground/5 grid place-items-center shrink-0 mt-0.5">
                <EyeOff className="w-3.5 h-3.5 text-foreground/60" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground">Shadow</p>
                </div>
                <div className="text-sm">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
                {m.tool_calls?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.tool_calls.map((tc, j) => {
                      const failed = ['failed', 'error'].includes(tc.status) || /error|failed/i.test(String(tc.results || ''));
                      const label = tc.display_projection?.label || tc.name;
                      return (
                        <span key={j} className={cn(
                          'inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border',
                          failed ? 'border-destructive/40 text-destructive' : 'border-emerald-500/30 text-emerald-500'
                        )}>
                          {failed ? <AlertCircle className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />} {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-foreground/5 grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground/60" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Shadow is executing…</div>
          </div>
        )}
      </div>

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
          <div className="relative flex items-end gap-2 bg-muted rounded-2xl border border-border/40 focus-within:ring-1 focus-within:ring-ring transition-shadow">
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
              {plusMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden w-56">
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Command Shadow…"
              rows={1}
              className="flex-1 resize-none bg-transparent py-3 text-sm outline-none max-h-28 min-h-[40px] placeholder:text-muted-foreground/60"
            />
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
        </div>
      </div>
      {voiceChatOpen && <VoiceChat onClose={() => setVoiceChatOpen(false)} />}
      {autoBuildOpen && (
        <AutoBuildModal
          onClose={() => setAutoBuildOpen(false)}
          onComplete={(data) => {
            setMessages((m) => [...m, {
              role: 'assistant', content: `Auto Build complete for **${data.business_name}**. ${data.steps_completed?.length || 0} onboarding steps generated. ${data.deploy_url ? `Deployed: ${data.deploy_url}` : ''}`,
            }]);
          }}
        />
      )}
    </div>
  );
}