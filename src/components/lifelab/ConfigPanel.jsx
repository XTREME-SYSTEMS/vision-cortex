import React from 'react';
import { Sparkles, Play, Loader2, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

const OPTIONS = {
  sex: ['male', 'female'],
  childhood: ['poor', 'middle', 'wealthy'],
  education: ['dropout', 'hs', 'college', 'grad'],
  career: ['employee', 'entrepreneur', 'executive', 'creative', 'gig'],
  marriage: ['never', 'early', 'late', 'right'],
  health: ['excellent', 'good', 'poor'],
  finance: ['saver', 'balanced', 'spender'],
  social: ['connected', 'balanced', 'isolated'],
  risk: ['low', 'medium', 'high', 'extreme'],
  region: ['urban', 'suburban', 'rural'],
};

const FIELDS = [
  { key: 'sex', label: 'Sex', hint: 'Drives mortality (SSA life table)' },
  { key: 'childhood', label: 'Childhood', hint: 'Starting health, wealth, odds' },
  { key: 'education', label: 'Education', hint: 'Lifetime income base' },
  { key: 'career', label: 'Career path', hint: 'Income level & volatility' },
  { key: 'marriage', label: 'Marriage', hint: 'Divorce / stability odds' },
  { key: 'health', label: 'Health habits', hint: 'Disease risk multiplier' },
  { key: 'finance', label: 'Financial habits', hint: 'Wealth accumulation rate' },
  { key: 'social', label: 'Social habits', hint: 'Mental-health shield' },
  { key: 'risk', label: 'Risk tolerance', hint: 'Income volatility & exposure' },
  { key: 'region', label: 'Region', hint: 'Cost, crime, opportunity' },
];

export default function ConfigPanel({ cfg, setCfg, onRun, running, goodChoices, badChoices }) {
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const toggleChoice = (kind, id) =>
    setCfg((c) => {
      const list = c.choices[kind];
      return { ...c, choices: { ...c.choices, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl">Life Variables</h2>
          <p className="text-sm text-muted-foreground">Every dropdown reshapes the odds for all 50 lives.</p>
        </div>
        <Button onClick={() => setCfg((c) => ({ ...c, seed: Math.floor(Math.random() * 1e9) }))} variant="outline" size="sm">
          <Dices className="w-4 h-4" /> New seed
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide">{label}</Label>
            <Select value={cfg[key]} onValueChange={(v) => set(key, v)}>
              <SelectTrigger className="w-full capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPTIONS[key].map((o) => (
                  <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/70">{hint}</p>
          </div>
        ))}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide">Starting net worth</Label>
          <Select value={String(cfg.startNetWorth)} onValueChange={(v) => set('startNetWorth', Number(v))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 10000, 50000, 100000, 250000].map((n) => (
                <SelectItem key={n} value={String(n)}>${n.toLocaleString()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground/70">Inherited / starting capital</p>
        </div>
      </div>

      <ChoiceGrid title="Good choices" kind="good" items={goodChoices} active={cfg.choices.good} onToggle={toggleChoice} tone="good" />
      <ChoiceGrid title="Bad choices" kind="bad" items={badChoices} active={cfg.choices.bad} onToggle={toggleChoice} tone="bad" />

      <Button onClick={onRun} disabled={running} size="lg" className="w-full">
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Simulating 50 lives…' : 'Generate 50 Lives'}
      </Button>
    </div>
  );
}

function ChoiceGrid({ title, items, active, onToggle, kind, tone }) {
  const [open, setOpen] = React.useState(false);
  const shown = open ? items : items.slice(0, 9);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{title} <span className="text-muted-foreground font-normal">({active.length} active)</span></h3>
        <button onClick={() => setOpen((o) => !o)} className="text-xs text-muted-foreground hover:text-foreground">
          {open ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {shown.map((c) => {
          const on = active.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onToggle(kind, c.id)}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                on
                  ? tone === 'good'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300'
                  : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${on ? (tone === 'good' ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-muted-foreground/40'}`} />
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}