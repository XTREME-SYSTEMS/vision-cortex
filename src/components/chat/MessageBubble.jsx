import React from 'react';
import { Lightbulb, AlertTriangle, Sparkles, Telescope } from 'lucide-react';

const kinds = {
  insight: { Icon: Lightbulb, label: 'Insight' },
  warning: { Icon: AlertTriangle, label: 'Warning' },
  opportunity: { Icon: Sparkles, label: 'Opportunity' },
  foresight: { Icon: Telescope, label: 'Foresight' },
};

export default function MessageBubble({ msg }) {
  const isUser = msg.author_type === 'user';
  const meta = kinds[msg.kind];
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center text-[10px] font-display text-white" style={{ background: msg.accent || (isUser ? '#3f3f46' : '#111') }}>
        {msg.author.slice(0, 2).toUpperCase()}
      </span>
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <p className="text-[11px] text-muted-foreground mb-1">
          {msg.author}
          {meta && <span className="ml-2 inline-flex items-center gap-1"><meta.Icon className="w-3 h-3" />{meta.label}</span>}
        </p>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-foreground text-background' : 'bg-card border border-border/60'}`}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}