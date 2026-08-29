import React from 'react';

export default function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <h2 className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function Bullets({ items }) {
  if (!items?.length) return <p className="text-muted-foreground">—</p>;
  return (
    <ul className="space-y-2">
      {items.map((i, idx) => (
        <li key={idx} className="flex gap-3">
          <span className="mt-2 h-1 w-1 rounded-full bg-foreground/50 shrink-0" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}