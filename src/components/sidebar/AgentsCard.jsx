import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentsCard({ activeAgents, onToggleAgent, onClose }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AgentProfile.list('-order', 100)
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <h2 className="font-display text-lg tracking-tight">Select Agents to Chat With</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading agents…
          </div>
        ) : agents.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No agent profiles found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {agents.map((a) => {
              const selected = activeAgents.includes(a.name);
              return (
                <button
                  key={a.id}
                  onClick={() => onToggleAgent(a.name)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    selected ? 'border-foreground bg-foreground/5 ring-1 ring-foreground/20' : 'border-border hover:bg-muted'
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-muted grid place-items-center text-sm font-semibold shrink-0">
                    {a.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.role || 'Agent'}</p>
                  </div>
                  {selected && (
                    <span className="w-5 h-5 rounded-full bg-foreground text-background grid place-items-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-border/60 text-xs text-muted-foreground">
        {activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''} selected — your messages go to these agents.
      </div>
    </div>
  );
}