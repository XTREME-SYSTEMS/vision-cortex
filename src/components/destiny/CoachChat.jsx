import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

// Minimal conversation UI for the personalCoach agent.
export default function CoachChat({ lifePlanId }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const conv = base44.agents.createConversation({
      agent_name: 'personalCoach',
      metadata: { name: 'Life Plan Coach', life_plan_id: lifePlanId },
    });
    setConversation(conv);
    setMessages(conv.messages || []);
    return conv;
  };

  const send = async () => {
    if (!input.trim()) return;
    const conv = await ensureConversation();
    const updated = base44.agents.addMessage(conv, { role: 'user', content: input });
    setMessages(updated.messages || []);
    setInput('');
    setLoading(true);
    const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    // poll for completion (subscribe streams tokens)
    setTimeout(() => { setLoading(false); unsub(); }, 60000);
  };

  return (
    <div className="rounded-xl border border-border flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Personal AI coach</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Say hi — your coach will check your plan, remind you of today's milestone, and help you log reality.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.role === 'user' ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-muted rounded-2xl px-3.5 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div></div>}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask your coach…" className="rounded-full" />
        <Button size="icon" className="rounded-full shrink-0" onClick={send} disabled={loading}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}