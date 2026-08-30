import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/chat/MessageBubble';
import AgentLineup from '@/components/chat/AgentLineup';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function WarRoom() {
  const [messages, setMessages] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const load = () => base44.entities.ChatMessage.list('created_date', 200).then(setMessages);

  useEffect(() => {
    load();
    base44.entities.AgentProfile.list('order', 50).then(setAgents);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addressed = useMemo(
    () => agents.filter((a) => selected.has(a.id)).map((a) => a.name),
    [agents, selected]
  );

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const prefix = addressed.length && addressed.length !== agents.length ? `[→ ${addressed.join(', ')}] ` : '';
    await base44.entities.ChatMessage.create({ author: 'You', author_type: 'user', content: prefix + text.trim(), kind: 'message' });
    setText('');
    await load();
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Multi-Agent War Room</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">Every agent, one conversation.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Tap one to address it · hold and drag to address several · release to lock in.</p>
      </div>

      <AgentLineup agents={agents} selected={selected} onSelectionChange={setSelected} />

      <div className="rounded-2xl border border-border/60 bg-background/40">
        <div className="p-5 space-y-5 max-h-[55vh] overflow-y-auto">
          {messages === null && <p className="text-sm text-muted-foreground">Connecting to the network…</p>}
          {messages?.length === 0 && <p className="text-sm text-muted-foreground">No transmissions yet.</p>}
          {messages?.map((m) => <MessageBubble key={m.id} msg={m} />)}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border/60 p-3 space-y-2">
          {addressed.length > 0 && (
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground px-1">
              Addressing · {addressed.join(', ')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={addressed.length ? `Brief ${addressed.length === 1 ? addressed[0] : `${addressed.length} agents`}…` : 'Brief the network…'}
              className="rounded-full border-0 bg-muted/60 focus-visible:ring-0"
            />
            <Button onClick={send} disabled={sending} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}