import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Bot, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UniversalChat({ activeAgents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    if (activeAgents.length === 0) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Select at least one agent from the Chat Agents panel to start chatting.' }]);
      return;
    }
    const text = input.trim();
    setMessages((m) => [...m, { author: 'You', author_type: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const res = await base44.functions.invoke('universalAgentChat', { message: text, agent_names: activeAgents });
      const replies = res.data?.replies || [];
      setMessages((m) => [...m, ...replies.map((r) => ({ author: r.agent, author_type: 'agent', content: r.message, accent: r.accent }))]);
    } catch (e) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Error: ' + (e.message || 'Failed to reach agents') }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Send a message to your selected agents.</p>
            <p className="text-xs mt-1">Use the Chat Agents button in the sidebar to pick who to talk to.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.author_type === 'user' ? 'justify-end' : 'justify-start')}>
            {m.author_type === 'agent' && (
              <div className="w-7 h-7 rounded-full bg-muted grid place-items-center shrink-0 mt-0.5">
                {m.author === 'System' ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
            )}
            <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm', m.author_type === 'user' ? 'bg-foreground text-background' : 'bg-muted text-foreground')}>
              {m.author_type === 'agent' && m.author !== 'System' && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-semibold">{m.author}</p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
            {m.author_type === 'user' && (
              <div className="w-7 h-7 rounded-full bg-foreground text-background grid place-items-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-muted grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Agents are thinking…</div>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-border/60">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message your agents…"
            rows={1}
            className="flex-1 resize-none bg-muted rounded-xl px-3.5 py-2.5 text-sm outline-none max-h-28 min-h-[40px] focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-xl bg-foreground text-background p-2.5 disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {activeAgents.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Chatting with: {activeAgents.join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}