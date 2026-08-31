import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Stat from '@/components/ui/stat';
import IdeaRow from '@/components/ideas/IdeaRow';
import { money } from '@/components/ideas/format';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import VisionStatement from '@/components/dashboard/VisionStatement';
import MorningBrief from '@/components/dashboard/MorningBrief';

export default function Dashboard() {
  const [ideas, setIdeas] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    base44.entities.Idea.list('rank', 60).then(setIdeas);
  }, []);

  const filtered = useMemo(() => {
    if (!ideas) return [];
    const s = q.toLowerCase();
    return ideas.filter((i) => !s || [i.title, i.industry, i.sub_industry].join(' ').toLowerCase().includes(s));
  }, [ideas, q]);

  const totals = useMemo(() => {
    if (!ideas?.length) return null;
    return {
      count: ideas.length,
      avgProb: Math.round(ideas.reduce((a, i) => a + (i.probability_of_success || 0), 0) / ideas.length),
      profit: ideas.reduce((a, i) => a + (i.est_monthly_profit_usd || 0), 0),
      approved: ideas.filter((i) => i.validation?.verdict === 'approved').length,
    };
  }, [ideas]);

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Vision Agent · Daily Sweep</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Today's highest-leverage opportunities.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Scraped from forums, social platforms, and the world's top products — scored, validated, and priced for launch.
        </p>
      </div>

      <div className="space-y-4">
        <VisionStatement />
        <MorningBrief />
      </div>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Opportunities" value={totals.count} sub="ranked today" />
          <Stat label="Avg. success" value={`${totals.avgProb}%`} sub="weighted probability" />
          <Stat label="Combined MRR est." value={money(totals.profit)} sub="if all launched" />
          <Stat label="Validated" value={totals.approved} sub="approved by validation agent" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search niche or industry" className="pl-9 rounded-full" />
        </div>
      </div>

      <div className="space-y-3">
        {ideas === null && <p className="text-sm text-muted-foreground">Loading intelligence…</p>}
        {ideas?.length === 0 && <p className="text-sm text-muted-foreground">No opportunities logged yet.</p>}
        {filtered.map((idea) => (
          <IdeaRow key={idea.id} idea={idea} open={openId === idea.id} onToggle={() => setOpenId(openId === idea.id ? null : idea.id)} />
        ))}
      </div>
    </div>
  );
}