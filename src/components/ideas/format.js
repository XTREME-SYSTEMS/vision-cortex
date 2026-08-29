export const money = (n) => {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
};

export const verdictTone = (v) =>
  ({
    approved: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10',
    conditional: 'text-amber-500 border-amber-500/40 bg-amber-500/10',
    rejected: 'text-rose-500 border-rose-500/40 bg-rose-500/10',
    pending: 'text-muted-foreground border-border bg-muted/50',
  }[v || 'pending']);