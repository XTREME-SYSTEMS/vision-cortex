import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { money, verdictTone } from './format';

export default function IdeaRow({ idea, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden transition-colors hover:border-foreground/25">
      <button onClick={onToggle} className="w-full text-left px-5 py-4 flex items-center gap-4">
        <span className="font-mono text-xs text-muted-foreground w-7 shrink-0">{String(idea.rank || 0).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{idea.title}</p>
          <p className="text-xs text-muted-foreground truncate">{idea.industry} · {idea.sub_industry}</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Success</p>
            <p className="text-sm font-display">{idea.probability_of_success ?? '—'}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Launch</p>
            <p className="text-sm font-display">{money(idea.launch_cost_usd)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">MRR est.</p>
            <p className="text-sm font-display">{money(idea.est_monthly_profit_usd)}</p>
          </div>
        </div>
        <span className={`hidden md:inline-block text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border ${verdictTone(idea.validation?.verdict)}`}>
          {idea.validation?.verdict || 'pending'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border/50 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{idea.one_liner}</p>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Field label="Problem" value={idea.problem} />
            <Field label="Solution" value={idea.solution} />
            <Field label="Target users" value={idea.target_users} />
            <Field label="Trend signal" value={idea.trend_signal} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(idea.branding?.viral_hooks || []).slice(0, 3).map((h) => (
              <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{h}</span>
            ))}
          </div>
          <Link to={`/idea/${idea.id}`} className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity">
            <Maximize2 className="w-3.5 h-3.5" /> Open full intelligence file
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
      <p className="leading-relaxed">{value || '—'}</p>
    </div>
  );
}