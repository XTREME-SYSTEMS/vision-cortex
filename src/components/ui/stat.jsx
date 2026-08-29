import React from 'react';

export default function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}