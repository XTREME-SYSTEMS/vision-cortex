import React from 'react';
import { Sun, Loader2, Sparkles, AlertTriangle, TrendingUp, Calendar, Bot, DollarSign, ArrowRight } from 'lucide-react';

export default function DailyBrief({ brief, loading, onGenerate, lastGenerated }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Daily Brief</h3>
          {lastGenerated && <span className="text-[10px] text-muted-foreground">· {new Date(lastGenerated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
        </div>
        <button onClick={onGenerate} disabled={loading} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground text-background disabled:opacity-50 hover:opacity-90 transition-opacity">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Generating…' : 'Generate Brief'}
        </button>
      </div>

      {loading && !brief ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Prime is reviewing all systems and formulating your brief…
        </div>
      ) : brief ? (
        <div className="space-y-3">
          {brief.what_happened && (
            <p className="text-sm leading-relaxed">{brief.what_happened}</p>
          )}

          {brief.key_wins?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Key Wins</p>
              <ul className="space-y-0.5">
                {brief.key_wins.map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-emerald-500">✓</span> {w}</li>)}
              </ul>
            </div>
          )}

          {brief.critical_issues?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Critical Issues</p>
              <ul className="space-y-0.5">
                {brief.critical_issues.map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-red-500">!</span> {w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
            {brief.today_plan?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-sky-500 font-semibold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Today's Plan</p>
                <ul className="space-y-0.5">
                  {brief.today_plan.map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-sky-500">{i + 1}.</span> {w}</li>)}
                </ul>
              </div>
            )}
            {brief.week_plan?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-violet-500 font-semibold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> This Week</p>
                <ul className="space-y-0.5">
                  {brief.week_plan.map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-violet-500">{i + 1}.</span> {w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {brief.revenue_opportunities?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Revenue Opportunities</p>
              <ul className="space-y-0.5">
                {brief.revenue_opportunities.map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-emerald-500">$</span> {w}</li>)}
              </ul>
            </div>
          )}

          {brief.agent_assignments?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-foreground font-semibold mb-1 flex items-center gap-1"><Bot className="w-3 h-3" /> Agent Assignments</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.agent_assignments.map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-muted border border-border/40">
                    <span className="font-semibold">{a.agent}:</span> {a.task}
                  </span>
                ))}
              </div>
            </div>
          )}

          {brief.next_autonomous_actions && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold mb-1 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Next Autonomous Actions</p>
              <p className="text-xs text-muted-foreground italic">{brief.next_autonomous_actions}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">Press "Generate Brief" for Prime's daily summary.</p>
      )}
    </div>
  );
}