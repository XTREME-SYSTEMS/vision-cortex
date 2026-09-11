import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/chat/MessageBubble';
import AgentLineup from '@/components/chat/AgentLineup';
import ActivityStream from '@/components/warroom/ActivityStream';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Globe, Loader2 } from 'lucide-react';

export default function WarRoom() {
  const [messages, setMessages] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const endRef = useRef(null);

  const load = () => base44.entities.ChatMessage.list('created_date', 200).then(setMessages);

  useEffect(() => {
    load();
    base44.entities.AgentProfile.list('order', 50).then(setAgents);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const addressed = useMemo(
    () => agents.filter((a) => selected.has(a.id)),
    [agents, selected]
  );

  const send = async () => {
    if (!text.trim() || busy) return;
    const prompt = text.trim();
    setBusy(true);
    const agentIds = addressed.length ? addressed.map((a) => a.id) : agents.map((a) => a.id);
    const tag = addressed.length && addressed.length !== agents.length ? `[→ ${addressed.map((a) => a.name).join(', ')}] ` : '';
    try {
      await base44.entities.ChatMessage.create({ author: 'You', author_type: 'user', content: tag + prompt, kind: 'message' });
      setText('');
      await load();

      const res = await base44.functions.invoke('agentDebate', { prompt, agentIds, webSearch });
      const data = res.data || res;
      const accentFor = (name) => agents.find((a) => a.name === name)?.accent || '#3f3f46';

      const entries = [];
      for (const t of data.transcript || []) {
        entries.push({ author: t.author, author_type: 'agent', content: t.content, kind: t.kind || 'message', accent: accentFor(t.author) });
      }
      if (data.vote?.held) {
        const tally = (data.vote.tally || []).map((v) => `${v.agent}: ${v.vote}`).join(' · ');
        entries.push({ author: 'The Vote', author_type: 'agent', content: `No common ground — a vote was held. ${tally}. Verdict: ${data.vote.verdict}`, kind: 'warning', accent: '#b45309' });
      }
      if (data.resolution) {
        entries.push({ author: 'Resolution', author_type: 'agent', content: data.resolution, kind: 'foresight', accent: '#111827' });
      }
      if (data.foresight) {
        entries.push({ author: 'Foresight', author_type: 'agent', content: data.foresight, kind: 'foresight', accent: '#0f766e' });
      }
      if (entries.length) await base44.entities.ChatMessage.bulkCreate(entries);
      await load();
    } catch (e) {
      await base44.entities.ChatMessage.create({ author: 'System', author_type: 'agent', content: `Deliberation failed: ${e.message || e}`, kind: 'warning', accent: '#dc2626' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Multi-Agent War Room</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight leading-[1.05]">Every agent, one conversation.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Tap one to address it · hold and drag to address several · release to lock in. Agents debate and vote live.</p>
      </div>

      <AgentLineup agents={agents} selected={selected} onSelectionChange={setSelected} />

      <ActivityStream />

      <div className="rounded-2xl border border-border/60 bg-background/40">
        <div className="no-scrollbar p-5 space-y-5 max-h-[55vh] overflow-y-auto">
          {messages === null && <p className="text-sm text-muted-foreground">Connecting to the network…</p>}
          {messages?.length === 0 && <p className="text-sm text-muted-foreground">No transmissions yet.</p>}
          {messages?.map((m) => <MessageBubble key={m.id} msg={m} />)}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Agents deliberating{webSearch ? ' with live web search' : ''}…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border/60 p-3 space-y-2">
          <div className="flex items-center gap-2 px-1">
            {addressed.length > 0 && (
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Addressing · {addressed.map((a) => a.name).join(', ')}
              </p>
            )}
            <button
              onClick={() => setWebSearch((v) => !v)}
              className={`ml-auto flex items-center gap-1.5 text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
                webSearch ? 'bg-foreground text-background border-foreground' : 'border-border/70 text-muted-foreground'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Web search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && send()}
              disabled={busy}
              placeholder={busy ? 'Deliberating…' : addressed.length ? `Brief ${addressed.length === 1 ? addressed[0].name : `${addressed.length} agents`}…` : 'Brief the network…'}
              className="rounded-full border-0 bg-muted/60 focus-visible:ring-0 disabled:opacity-50"
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