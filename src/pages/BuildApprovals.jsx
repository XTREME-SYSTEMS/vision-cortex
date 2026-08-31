import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image } from '@/components/ui/image';
import { Rocket, Loader2, Palette, Globe, CalendarDays, Check } from 'lucide-react';

export default function BuildApprovals() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [ideaId, setIdeaId] = useState('');
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    base44.entities.Idea.list('rank', 20).then((r) => { setIdeas(r || []); if (r?.[0]) setIdeaId(r[0].id); }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!ideaId) return;
    setLoading(true); setErr(''); setPack(null);
    try {
      const res = await base44.functions.invoke('generateBuildPack', { idea_id: ideaId });
      setPack(res.data);
    } catch (e) {
      setErr('Generation failed — try again.');
    } finally { setLoading(false); }
  };

  const approve = async () => {
    setLaunching(true); setErr('');
    try {
      const idea = ideas.find((i) => i.id === ideaId);
      const bq = await base44.entities.BuildQueue.create({
        title: pack?.brand?.brand_name || idea?.title || 'New build',
        idea_id: ideaId,
        stage: 'queued',
        status: 'queued',
        source: 'approval',
        business_name: pack?.brand?.brand_name || idea?.title,
        industry: idea?.industry,
        current_step: 'profile',
      });
      navigate(`/build/${bq.id}`);
    } catch (e) {
      setErr('Could not start build — try again.');
    } finally { setLaunching(false); }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Build Approvals · Step 4</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Approve the pack. Arm the launch.</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Pick an opportunity, generate its complete launch pack — brand, website, 30-day content, hero image — then approve it into the Build Pipeline.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={ideaId} onValueChange={setIdeaId}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Pick an opportunity" /></SelectTrigger>
          <SelectContent>{ideas.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={generate} disabled={loading || !ideaId} className="rounded-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Generate build pack
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>

      {loading && !pack && (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      )}

      {pack && (
        <div className="space-y-6">
          {pack.hero_url && (
            <div className="rounded-2xl overflow-hidden border border-border/60 aspect-[16/6]">
              <Image src={pack.hero_url} alt="Hero" className="w-full h-full" fittingType="fill" />
            </div>
          )}

          {/* Brand */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-4"><Palette className="w-4 h-4" /><h2 className="font-medium">Brand</h2></div>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <h3 className="font-display text-3xl tracking-tight">{pack.brand?.brand_name}</h3>
                <p className="text-muted-foreground mt-1">{pack.brand?.tagline}</p>
                <p className="text-xs text-muted-foreground mt-2">Voice: {pack.brand?.voice}</p>
              </div>
              <div className="flex gap-2">
                {(pack.brand?.palette || []).map((c) => (
                  <div key={c} className="w-10 h-10 rounded-lg border border-border/60" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
            {pack.brand?.domain_suggestions?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {pack.brand.domain_suggestions.map((d) => (
                  <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono">{d}</span>
                ))}
              </div>
            )}
          </section>

          {/* Website */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-4"><Globe className="w-4 h-4" /><h2 className="font-medium">Website</h2></div>
            <h3 className="font-display text-2xl tracking-tight">{pack.website?.headline}</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">{pack.website?.subhead}</p>
            <div className="mt-4 space-y-3">
              {(pack.website?.sections || []).map((s, i) => (
                <div key={i} className="border-l-2 border-border pl-3">
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
            {pack.website?.social_proof && (
              <p className="mt-4 text-sm italic text-muted-foreground border-t border-border/50 pt-3">“{pack.website.social_proof}”</p>
            )}
            <div className="mt-4">
              <Button className="rounded-full">{pack.website?.cta || 'Get started'}</Button>
            </div>
          </section>

          {/* Content */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-4 h-4" /><h2 className="font-medium">30-day content schedule</h2></div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {(pack.content || []).map((p, i) => (
                <div key={i} className="text-xs rounded-lg bg-muted/40 p-2.5">
                  <span className="font-mono text-muted-foreground">D{p.day}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-foreground text-background text-[10px] uppercase tracking-wide">{p.platform}</span>
                  <p className="mt-1 leading-relaxed">{p.post}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={approve} disabled={launching} className="rounded-full">
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve & send to Build Pipeline
            </Button>
            <Button variant="outline" className="rounded-full" onClick={generate} disabled={loading}>Regenerate</Button>
          </div>
        </div>
      )}
    </div>
  );
}