import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { money } from '@/components/ideas/format';
import { Compass, Loader2, RefreshCw, Sparkles } from 'lucide-react';

export default function MorningFeed() {
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const p = await base44.entities.UserProfile.filter({});
      if (!p || !p.length) { setProfile(null); return; }
      setProfile(p[0]);
    } catch { setProfile(null); }
  };

  const score = async () => {
    setLoading(true); setErr('');
    try {
      const res = await base44.functions.invoke('scoreIdeaToProfile', { limit: 8 });
      setScores(res.data?.scores || []);
    } catch (e) {
      setErr('Scoring failed — try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (profile) score(); }, [profile?.id]);

  if (profile === null) return null; // no profile yet → don't render

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Compass className="w-4 h-4" />
        <h2 className="font-medium">Morning Feed — scored to your destiny</h2>
        <button onClick={score} disabled={loading} className="ml-auto text-muted-foreground hover:text-foreground">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4 truncate">
        Goal: {profile.goal?.summary || `${profile.goal?.kind || '—'} → ${profile.goal?.value || ''} by ${profile.goal?.by_horizon || ''}`}
      </p>

      {loading && scores === null && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}

      {scores && scores.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">No opportunities to score yet.</p>
      )}

      {scores && scores.length > 0 && (
        <div className="space-y-2.5">
          {scores.map((s, i) => (
            <FeedCard key={s.id} s={s} rank={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

function FeedCard({ s, rank }) {
  const fit = Math.round(s.fit_score || 0);
  const tone = fit >= 75 ? 'text-emerald-600 dark:text-emerald-400' : fit >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground';
  return (
    <Link to={`/idea/${s.id}`} className="block rounded-xl border border-border/50 hover:border-foreground/30 hover:bg-muted/30 transition-colors p-3.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{String(rank).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-[15px]">{s.title}</p>
          <p className="text-xs text-muted-foreground truncate">{s.industry} · {money(s.est_monthly_profit_usd)}/mo</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-display text-lg leading-none ${tone}`}>{fit}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">fit</p>
        </div>
      </div>
      {s.rationale && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <Sparkles className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
          {s.rationale}
        </p>
      )}
      {(s.goal_alignment != null || s.autonomy_match != null || s.risk_match != null) && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {s.goal_alignment != null && <span>Goal {Math.round(s.goal_alignment)}%</span>}
          {s.autonomy_match != null && <span>Autonomy {Math.round(s.autonomy_match)}%</span>}
          {s.risk_match != null && <span>Risk {Math.round(s.risk_match)}%</span>}
          {s.time_to_goal_days != null && <span>~{s.time_to_goal_days}d to goal</span>}
        </div>
      )}
    </Link>
  );
}