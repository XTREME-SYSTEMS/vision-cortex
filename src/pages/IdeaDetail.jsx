import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Section, { Bullets } from '@/components/ideas/Section';
import Stat from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { money, verdictTone } from '@/components/ideas/format';
import { ArrowLeft, Rocket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function IdeaDetail() {
  const { id } = useParams();
  const [idea, setIdea] = useState(null);
  const [missing, setMissing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  useEffect(() => {
    base44.entities.Idea.filter({ id }).then((rows) => {
      if (rows.length) setIdea(rows[0]);
      else setMissing(true);
    });
  }, [id]);

  const dispatchToBuilder = async () => {
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await base44.functions.invoke('dispatchToBuilder', {
        idea_id: idea.id,
        auto_advance: true,
        product_type: 'marketing_site'
      });
      setDispatchResult({ ok: true, autobuild_id: res.autobuild_id, message: res.message });
      setIdea({ ...idea, stage: 'building' });
    } catch (err) {
      setDispatchResult({ ok: false, message: err.message || 'Dispatch failed' });
    } finally {
      setDispatching(false);
    }
  };

  if (missing) return <p className="text-sm text-muted-foreground">This opportunity no longer exists.</p>;
  if (!idea) return <p className="text-sm text-muted-foreground">Loading file…</p>;

  const b = idea.branding || {};
  const v = idea.validation || {};

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> All opportunities
      </Link>

      <header className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          {idea.industry} · {idea.sub_industry}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">{idea.title}</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">{idea.one_liner}</p>
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border ${verdictTone(v.verdict)}`}>
            {v.verdict || 'pending'} · {v.confidence ?? '—'}% confidence
          </span>
          <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground">
            stage: {idea.stage}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={dispatchToBuilder}
            disabled={dispatching || idea.stage === 'building'}
            className="gap-2"
          >
            {dispatching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : idea.stage === 'building' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            {idea.stage === 'building' ? 'Dispatched to Builder' : 'Dispatch to Builder'}
          </Button>
          {dispatchResult?.ok && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              AutoBuild {dispatchResult.autobuild_id?.slice(0, 8)}… queued on Xtreme AI v2
            </p>
          )}
          {dispatchResult && !dispatchResult.ok && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {dispatchResult.message}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Success prob." value={`${idea.probability_of_success ?? '—'}%`} />
        <Stat label="Launch cost" value={money(idea.launch_cost_usd)} />
        <Stat label="Monthly profit" value={money(idea.est_monthly_profit_usd)} />
        <Stat label="Yr-1 revenue" value={money(idea.est_annual_revenue_usd)} />
        <Stat label="Time to launch" value={`${idea.time_to_launch_days ?? '—'}d`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Problem"><p>{idea.problem}</p></Section>
        <Section title="Solution"><p>{idea.solution}</p></Section>
        <Section title="Primary target user base"><p>{idea.target_users}</p></Section>
        <Section title="Trend signal"><p>{idea.trend_signal}</p></Section>
        <Section title="Validation opinion">
          <p>{v.opinion}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-2">Evidence</p>
          <Bullets items={v.evidence} />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-2">Blind spots others miss</p>
          <Bullets items={v.blind_spots} />
        </Section>
        <Section title="Automation blueprint"><p>{idea.automation_plan}</p></Section>
        <Section title="Hidden / secret opportunity"><p>{idea.hidden_opportunity}</p></Section>
        <Section title="Moat"><p>{idea.moat}</p></Section>
        <Section title="Investor thesis"><p>{idea.investor_notes}</p></Section>
        <Section title="Monetization"><Bullets items={idea.monetization} /></Section>
        <Section title="Risks"><Bullets items={idea.risks} /></Section>
        <Section title="Recommended stack">
          <div className="flex flex-wrap gap-2">
            {(idea.tech_stack || []).map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{t}</span>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Viral branding pack">
        <p className="font-display text-2xl tracking-tight">{b.brand_name}</p>
        <p className="text-muted-foreground">{b.tagline}</p>
        <p><span className="text-muted-foreground">Voice · </span>{b.voice}</p>
        <div className="flex gap-2 pt-1">
          {(b.palette || []).map((c) => (
            <div key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-6 w-6 rounded-lg border border-border/60" style={{ background: c }} />
              {c}
            </div>
          ))}
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-2">Viral hooks</p>
        <Bullets items={b.viral_hooks} />
      </Section>

      <Section title="Competitive reverse-engineering · top players">
        <div className="space-y-4">
          {(idea.competitors || []).map((c) => (
            <div key={c.name} className="rounded-xl border border-border/60 p-4 space-y-2">
              <div className="flex items-baseline gap-3">
                <p className="font-medium">{c.name}</p>
                <span className="text-xs text-muted-foreground">{c.valuation}</span>
              </div>
              <p><span className="text-muted-foreground">Strengths · </span>{c.strengths}</p>
              <p><span className="text-muted-foreground">Weaknesses · </span>{c.weaknesses}</p>
              <p><span className="text-muted-foreground">Gap to exploit · </span>{c.gap_to_exploit}</p>
            </div>
          ))}
          {!idea.competitors?.length && <p className="text-muted-foreground">Strategy agent has not swept this vertical yet.</p>}
        </div>
      </Section>

      <Section title="Sources">
        <Bullets items={idea.source_urls} />
      </Section>
    </div>
  );
}