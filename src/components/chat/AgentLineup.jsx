import React, { useEffect, useRef } from 'react';

export default function AgentLineup({ agents, selected, onSelectionChange }) {
  const selecting = useRef(false);
  const anchor = useRef(null);
  const moved = useRef(false);

  const addId = (id) =>
    onSelectionChange((prev) => {
      const s = new Set(prev);
      s.add(id);
      return s;
    });

  const down = (agent, e) => {
    selecting.current = true;
    anchor.current = agent.id;
    moved.current = false;
    onSelectionChange(new Set([agent.id]));
  };

  const move = (e) => {
    if (!selecting.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const chip = el?.closest('[data-agent-id]');
    if (!chip) return;
    const id = chip.getAttribute('data-agent-id');
    if (anchor.current && id !== anchor.current) moved.current = true;
    addId(id);
  };

  useEffect(() => {
    const up = () => {
      selecting.current = false;
      anchor.current = null;
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  const allOn = agents.length > 0 && selected.size === agents.length;

  return (
    <div className="flex items-center gap-2">
      <div onPointerMove={move} className="flex gap-2.5 overflow-x-auto pb-1 flex-1 -mx-1 px-1 cursor-pointer select-none">
        {agents.map((a) => {
          const on = selected.has(a.id);
          return (
            <button
              key={a.id}
              data-agent-id={a.id}
              onPointerDown={(e) => down(a, e)}
              className="flex flex-col items-center gap-1.5 shrink-0 touch-none"
            >
              <span
                className={`h-12 w-12 rounded-2xl grid place-items-center text-[11px] font-display text-white transition-all ${
                  on ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105' : 'opacity-50'
                }`}
                style={{ background: a.accent || '#3f3f46' }}
              >
                {(a.codename || a.name).slice(0, 2).toUpperCase()}
              </span>
              <span className={`text-[10px] tracking-wide whitespace-nowrap ${on ? 'text-foreground' : 'text-muted-foreground'}`}>
                {a.name}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSelectionChange(allOn ? new Set() : new Set(agents.map((a) => a.id)))}
        className="shrink-0 text-[10px] uppercase tracking-widest px-3 py-2 rounded-full border border-border/70 text-muted-foreground hover:text-foreground transition-colors"
      >
        {allOn ? 'Clear' : 'All'}
      </button>
    </div>
  );
}