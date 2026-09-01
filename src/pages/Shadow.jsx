import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, EyeOff, ShieldOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MoneyHuntPanel from '@/components/shadow/MoneyHuntPanel';
import BuildStrategyPanel from '@/components/shadow/BuildStrategyPanel';

const AGENT_NAME = 'shadow';

const ToolBadge = ({ toolCall }) => {
  const failed = ['failed', 'error'].includes(toolCall.status) || /error|failed/i.test(String(toolCall.results || ''));
  const label = toolCall.display_projection?.label || toolCall.name;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
      failed ? 'border-destructive/40 text-destructive' : 'border-border/60 text-muted-foreground'
    }`}>
      <EyeOff className="w-2.5 h-2.5" /> {label}
    </span>
  );
};

export default function Shadow() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (!u || u.role !== 'admin') { setDenied(true); return; }
        const convos = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let conv;
        if (convos && convos.length) {
          conv = await base44.agents.getConversation(convos[0].id);
        } else {
          conv = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: 'Shadow', description: 'Covert channel — owner only' } });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
        unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
        });
      } catch {
        setDenied(true);
      }
    })();
    return () => unsub();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || busy || !conversation) return;
    const content = text.trim();
    setText('');
    setBusy(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content });
    } catch {
      /* subscription will surface errors */
    } finally {
      setBusy(false);
    }
  };

  if (denied) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
        <ShieldOff className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const awaiting = messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2">
          <EyeOff className="w-3.5 h-3.5" /> Covert Channel · Owner Only
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">Shadow.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Unrestricted access to every entity and function. Invisible to all other users. No trace left on shared feeds.</p>
      </div>

      <MoneyHuntPanel />

      <BuildStrategyPanel />

      <div className="rounded-2xl border border-border/60 bg-background/40">
        <div className="no-scrollbar p-5 space-y-5 max-h-[55vh] overflow-y-auto">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Shadow is listening. Issue any command.</p>}
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div key={i} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[80%] ${isUser ? '' : 'space-y-2'}`}>
                  {!isUser && <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><EyeOff className="w-3 h-3" /> Shadow</p>}
                  {m.content && (isUser
                    ? <div className="rounded-2xl rounded-br-sm bg-foreground text-background px-4 py-2.5 text-sm">{m.content}</div>
                    : <ReactMarkdown className="text-sm prose prose-sm max-w-none">{m.content}</ReactMarkdown>)}
                  {m.tool_calls?.map((tc, j) => <ToolBadge key={j} toolCall={tc} />)}
                </div>
              </div>
            );
          })}
          {(busy || awaiting) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Shadow is moving…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && send()}
              placeholder="Command Shadow…"
              className="rounded-full border-0 bg-muted/60 focus-visible:ring-0"
            />
            <Button onClick={send} disabled={busy || !text.trim()} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}