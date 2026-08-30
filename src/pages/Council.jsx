import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/chat/MessageBubble';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Users, Sparkles } from 'lucide-react';

export default function Council() {
  const [messages, setMessages] = useState(null);
  const [agents, setAgents] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [convening, setConvening] = useState(false);
  const endRef = useRef(null);

  const load = () => base44.entities.ChatMessage.list('created_date', 300).then(setMessages);

  useEffect(() => {
    load();
    base44.entities.AgentProfile.list('order', 50).then(setAgents);
    // Realtime pub/sub — every new transmission appears live for all observers.
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      setMessages((prev) => {
        if (!prev) return prev;
        if (event.type === 'create') return [...prev, event.data];
        return prev;
      });
    });
    return unsub;
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, convening]);

  const phase = useMemo(() => {
    if (!messages || !agents.length) return null;
    return messages.length < agents.length ? 'introductions' : 'deliberation';
  }, [messages, agents]);

  const send = async () => {
    if (!text.trim() || busy) return;
    const prompt = text.trim();
    setBusy(true);
    try {
      await base44.entities.ChatMessage.create({ author: 'You', author_type: 'user', content: prompt, kind: 'message' });
      setText('');
      const res = await base44.functions.invoke('agentDebate', { prompt, agentIds: agents.map((a) => a.id), webSearch: false });
      const data = res.data || res;
      const accentFor = (name) => agents.find((a) => a.name === name)?.accent || '#3f3f46';
      const entries = [];
      for (const t of data.transcript || []) {
        entries.push({ author: t.author, author_type: 'agent', content: t.content, kind: t.kind || 'message', accent: accentFor(t.author) });
      }
      if (data.resolution) entries.push({ author: 'Resolution', author_type: 'agent', content: data.resolution, kind: 'foresight', accent: '#0f766e' });
      if (data.foresight) entries.push({ author: 'Foresight', author_type: 'agent', content: data.foresight, kind: 'foresight', accent: '#1d4ed8' });
      if (entries.length) await base44.entities.ChatMessage.bulkCreate(entries);
    } catch (e) {
      await base44.entities.ChatMessage.create({ author: 'System', author_type: 'agent', content: `Transmission failed: ${e.message || e}`, kind: 'warning', accent: '#dc2626' });
    } finally {
      setBusy(false);
    }
  };

  const convene = async () => {
    setConvening(true);
    try { await base44.functions.invoke('councilSession', {}); }
    catch {}
    finally { setConvening(false); }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Xtreme Vision Council</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">The Council Chamber.</h1>
        <p className="mt-3 text-sm text-muted-foreground">An anti-hierarchical chamber where every member leads from their expertise. Agents deliberate on a 24/7 schedule; humans may enter at any time. All transmissions are logged permanently.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={convene} disabled={convening} className="rounded-full">
          {convening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {convening ? 'Convening…' : 'Convene the council now'}
        </Button>
        {phase && (
          <span className={`text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${phase === 'introductions' ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'}`}>
            {phase === 'introductions' ? 'Introduction phase' : 'Deliberation phase'}
          </span>
        )}
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{messages?.length || 0} transmissions logged</span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/40">
        <div className="no-scrollbar p-5 space-y-5 max-h-[55vh] overflow-y-auto">
          {messages === null && <p className="text-sm text-muted-foreground">Connecting to the council…</p>}
          {messages?.length === 0 && <p className="text-sm text-muted-foreground">The chamber is silent. Convene the council to begin the founding introductions.</p>}
          {messages?.map((m) => <MessageBubble key={m.id} msg={m} />)}
          {(busy || convening) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {convening ? 'Council convening a scheduled session…' : 'Members deliberating…'}
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
              disabled={busy}
              placeholder={busy ? 'Deliberating…' : 'Address the council…'}
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