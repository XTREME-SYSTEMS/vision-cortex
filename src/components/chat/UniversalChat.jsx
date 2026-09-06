import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Bot, User, AlertCircle, FlaskConical, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UniversalChat({ activeAgents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showValidation, setShowValidation] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((m) => [...m, { author: 'You', author_type: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const res = await base44.functions.invoke('primusOrchestrate', {
        message: text,
        history: messages.slice(-8),
        agent_names: activeAgents,
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
      newMsgs.push({ author: 'Prime Eden Skye', author_type: 'agent', content: data.reply, accent: 'foreground', primary: true });
      // Validation verdict
      if (data.validation) {
        newMsgs.push({ author: 'VALIDATOR', author_type: 'agent', content: data.validation, validation: true });
      }
      // Approval request
      if (data.delegation?.needs_approval) {
        newMsgs.push({ author: 'Prime Eden Skye', author_type: 'agent', content: '⏸ Awaiting your approval to execute. ' + (data.delegation.approval_reason || ''), approval: true });
      }
      setMessages((m) => [...m, ...newMsgs]);
    } catch (e) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Error: ' + (e.message || 'Failed to reach Prime Eden Skye') }]);
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
      const scenarios = sim.scenarios || [];
      const simText =
        '📊 SIMULATION: ' + (sim.topic || topic) + '\n\n' +
        (sim.summary || '') + '\n\n' +
        'SCENARIOS:\n' +
        scenarios.map((s) => '• ' + s.name + ' (' + Math.round((s.probability || 0) * 100) + '%): ' + s.outcome + ' | Impact: ' + (s.financial_impact || 'N/A') + ' | Timeline: ' + (s.timeline || 'N/A')).join('\n') +
        '\n\nExpected value: ' + (sim.expected_value || 'N/A') +
        '\nConfidence: ' + Math.round((sim.confidence || 0) * 100) + '%\n\n' +
        'Risks: ' + ((sim.key_risks || []).join('; ')) + '\n' +
        'Opportunities: ' + ((sim.opportunities || []).join('; ')) + '\n\n' +
        'Recommendation: ' + (sim.recommendation || 'N/A');
      setMessages((m) => [...m, { author: 'Prime Eden Skye', author_type: 'agent', content: simText, accent: 'chart-3', simulation: true }]);
    } catch (e) {
      setMessages((m) => [...m, { author: 'System', author_type: 'agent', content: 'Simulation error: ' + (e.message || 'failed') }]);
    } finally {
      setSimulating(false);
    }
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

  return (
    <div className="h-full flex flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-foreground text-background grid place-items-center mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Prime Eden Skye is online.</p>
            <p className="text-xs mt-1 max-w-xs">Your primary orchestrator. It delegates to the right agents, validates every decision, and asks before executing anything.</p>
            <p className="text-[10px] mt-2 text-muted-foreground/70">Type a message or press Simulate to model a topic.</p>
          </div>
        )}
        {messages.map((m, i) => {
          if (m.validation) {
            const v = validationVerdict(m.content);
            if (!v || !showValidation) return null;
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
          return (
            <div key={i} className={cn('flex gap-2.5', m.author_type === 'user' ? 'justify-end' : 'justify-start', m.delegated && 'opacity-70')}>
              {m.author_type === 'agent' && (
                <div className={cn('w-7 h-7 rounded-full grid place-items-center shrink-0 mt-0.5', isPrimary ? 'bg-foreground text-background' : 'bg-muted')}>
                  {m.author === 'System' ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
              )}
              <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm', m.author_type === 'user' ? 'bg-foreground text-background' : isPrimary ? 'bg-foreground/5 border border-foreground/15' : m.simulation ? 'bg-chart-3/10 border border-chart-3/30' : 'bg-muted text-foreground', m.approval && 'border-amber-500/40 bg-amber-500/5')}>
                {m.author_type === 'agent' && m.author !== 'System' && (
                  <p className={cn('text-[10px] uppercase tracking-wider mb-0.5 font-semibold', isPrimary ? 'text-foreground' : 'text-muted-foreground')}>
                    {m.author}{m.delegated && ' · delegated'}
                    {m.simulation && ' · simulation'}
                    {m.approval && ' · approval needed'}
                  </p>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
              {m.author_type === 'user' && (
                <div className="w-7 h-7 rounded-full bg-foreground text-background grid place-items-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
        {sending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-foreground text-background grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Prime Eden Skye is orchestrating…</div>
          </div>
        )}
        {simulating && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-chart-3/20 grid place-items-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-chart-3" />
            </div>
            <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">Running multi-scenario simulation…</div>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-border/60">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <button
            onClick={simulate}
            disabled={simulating || sending || (!input.trim() && !messages.some((m) => m.author_type === 'user'))}
            title="Simulate the current topic"
            className="rounded-xl bg-chart-3/15 text-foreground border border-chart-3/30 p-2.5 disabled:opacity-40 hover:bg-chart-3/25 transition-colors shrink-0"
          >
            {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message Prime Eden Skye…"
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
        <div className="flex items-center justify-center gap-3 mt-1.5">
          <p className="text-[10px] text-muted-foreground">
            Prime Eden Skye orchestrates · {activeAgents.length > 0 ? 'delegation hints: ' + activeAgents.join(' · ') : 'auto-delegate'}
          </p>
          <button
            onClick={() => setShowValidation((s) => !s)}
            className={cn('text-[10px] flex items-center gap-1', showValidation ? 'text-foreground' : 'text-muted-foreground/50')}
          >
            <ShieldCheck className="w-3 h-3" /> {showValidation ? 'Validator on' : 'Validator off'}
          </button>
        </div>
      </div>
    </div>
  );
}