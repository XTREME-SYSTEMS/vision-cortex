import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const money = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${a}`;
};

const tone = (n) => (n >= 0 ? 'text-emerald-500' : 'text-rose-500');

export default function LifeGrid({ lives }) {
  const [sel, setSel] = useState(null);
  if (!lives?.length) return null;
  const selected = lives.find((l) => l.id === sel);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">50 hypothetical lives</h3>
      <p className="text-xs text-muted-foreground mb-3">Click any life to inspect its year-by-year story.</p>
      <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
        {lives.map((l) => (
          <button
            key={l.id}
            onClick={() => setSel(l.id)}
            className="aspect-square rounded-md border border-border flex flex-col items-center justify-center hover:border-foreground transition-colors"
            title={`Life #${l.id + 1} · died at ${l.diedAtAge} · ${money(l.finalNetWorth)}`}
          >
            <span className="text-[10px] text-muted-foreground">#{l.id + 1}</span>
            <span className={`text-[11px] font-semibold ${tone(l.finalNetWorth)}`}>{money(l.finalNetWorth)}</span>
            <span className="text-[9px] text-muted-foreground">d{l.diedAtAge}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSel(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Life #{selected.id + 1}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="Died at" value={`${selected.diedAtAge}`} />
                <Stat label="Net worth" value={money(selected.finalNetWorth)} cls={tone(selected.finalNetWorth)} />
                <Stat label="Health" value={`${selected.finalHealth}`} />
                <Stat label="Happiness" value={`${selected.finalHappy}`} />
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1">Net worth over life</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={selected.yearly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <XAxis dataKey="age" tick={{ fontSize: 10 }} unit="y" stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={money} stroke="hsl(var(--muted-foreground))" width={45} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v) => money(v)} labelFormatter={(a) => `Age ${a}`} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Line type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1.5">Life events ({selected.eventCount})</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selected.yearly.flatMap((y) => y.events.map((e) => ({ age: y.age, e }))).map((x, i) => (
                    <div key={i} className="text-xs flex gap-2">
                      <span className="text-muted-foreground w-10 shrink-0">age {x.age}</span>
                      <span>{x.e}</span>
                    </div>
                  ))}
                  {!selected.yearly.flatMap((y) => y.events).length && <p className="text-xs text-muted-foreground">No notable events — a quiet life.</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, cls }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${cls || ''}`}>{value}</div>
    </div>
  );
}