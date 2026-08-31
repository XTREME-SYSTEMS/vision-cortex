import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Loader2, DollarSign, Sparkles, TrendingUp } from 'lucide-react';

const PLATFORM_TONE = {
  X: 'bg-foreground text-background',
  LinkedIn: 'bg-blue-600 text-white',
  TikTok: 'bg-pink-500 text-white',
  Instagram: 'bg-fuchsia-500 text-white',
  Reddit: 'bg-orange-500 text-white',
};

export default function Marketer() {
  const [builds, setBuilds] = useState([]);
  const [buildId, setBuildId] = useState('');
  const [campaign, setCampaign] = useState(null);
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doctrines, setDoctrines] = useState([]);
  const [revAmount, setRevAmount] = useState('');
  const [revPattern, setRevPattern] = useState('');
  const [logging, setLogging] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    base44.entities.BuildQueue.list('-updated_date', 30).then((r) => { setBuilds(r || []); if (r?.[0]) setBuildId(r[0].id); }).catch(() => {});
    base44.entities.Doctrine.filter({ source: 'marketer' }).then((r) => setDoctrines((r || []).slice(0, 6))).catch(() => {});
  }, []);

  const generate = async () => {
    if (!buildId) return;
    setLoading(true); setErr(''); setCampaign(null);
    try {
      const res = await base44.functions.invoke('runMarketer', { build_id: buildId });
      setCampaign(res.data?.campaign || []);
      setIdea(res.data?.idea);
    } catch (e) {
      setErr('Campaign generation failed — try again.');
    } finally { setLoading(false); }
  };

  const logRevenue = async () => {
    if (!revAmount) return;
    setLogging(true); setErr('');
    try {
      await base44.functions.invoke('runMarketer', {
        build_id: buildId,
        revenue_signal: {
          amount: Number(revAmount),
          pattern: revPattern || 'content-led acquisition',
          insight: revPattern ? `Revenue $${revAmount} driven by: ${revPattern}.` : undefined,
          confidence: 0.75,
        },
      });
      setRevAmount(''); setRevPattern('');
      const r = await base44.entities.Doctrine.filter({ source: 'marketer' });
      setDoctrines((r || []).slice(0, 6));
    } catch (e) {
      setErr('Could not log revenue signal.');
    } finally { setLogging(false); }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Marketer Agent · Step 5</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Distribute. Earn. Compound.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          The Marketer runs a 30-day autonomous distribution campaign for every launched brand. Every revenue signal feeds back into doctrine — so the system learns what works and compounds it.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={buildId} onValueChange={setBuildId}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Pick a launched build" /></SelectTrigger>
          <SelectContent>{builds.map((b) => <SelectItem key={b.id} value={b.id}>{b.title || b.business_name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={generate} disabled={loading || !buildId} className="rounded-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Generate campaign
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>

      {loading && !campaign && (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      )}

      {campaign?.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <h2 className="font-medium">{idea?.brand} — 30-day campaign</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaign.map((p, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">Day {p.day}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${PLATFORM_TONE[p.platform] || 'bg-muted text-muted-foreground'}`}>{p.platform}</span>
                </div>
                <p className="font-medium text-sm leading-snug">{p.hook}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed flex-1">{p.post}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-2 pt-2 border-t border-border/40">Goal: {p.goal}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Revenue → doctrine loop */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4" /><h2 className="font-medium">Revenue → Doctrine feedback loop</h2></div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Revenue ($)</label>
            <Input type="number" value={revAmount} onChange={(e) => setRevAmount(e.target.value)} placeholder="e.g. 2400" className="mt-1.5 w-40" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">What drove it (winning pattern)</label>
            <Input value={revPattern} onChange={(e) => setRevPattern(e.target.value)} placeholder="e.g. Day 3 X thread on churn stats" className="mt-1.5" />
          </div>
          <Button onClick={logRevenue} disabled={logging || !revAmount || !buildId} className="rounded-full">
            {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Log signal → doctrine
          </Button>
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Recent marketer doctrines</p>
          {doctrines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue signals logged yet. The loop starts with the first dollar.</p>
          ) : (
            <div className="space-y-2">
              {doctrines.map((d) => (
                <div key={d.id} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium">{d.topic}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{d.insight}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">confidence {Math.round((d.confidence || 0) * 100)}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}