import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Loader2, Factory, Sparkles, TrendingUp, DollarSign, MapPin,
  Cpu, Share2, Palette, Mic, Target, Rocket, Users, FileText,
  Building2, Megaphone, Search, Brain, ChevronRight,
} from 'lucide-react';

const SECTIONS = [
  { key: 'executive_summary', icon: FileText, label: 'Executive Summary' },
  { key: 'deep_audit_refactor', icon: Search, label: 'Deep Audit & Refactor' },
  { key: 'system_factory_architecture', icon: Factory, label: 'System Factory Architecture' },
  { key: 'digital_bid_system', icon: Target, label: 'Digital Bid System' },
  { key: 'lead_generation_system', icon: Users, label: 'Lead Generation' },
  { key: 'seo_aeo_system', icon: TrendingUp, label: 'SEO / AEO System' },
  { key: 'ai_agent_system', icon: Cpu, label: 'AI Agent System' },
  { key: 'social_media_system', icon: Share2, label: 'Social Media System' },
  { key: 'rebranding_plan', icon: Palette, label: 'Rebranding Plan' },
  { key: 'financial_intelligence', icon: Brain, label: 'Financial Intelligence' },
  { key: 'tone_enhancement_system', icon: Mic, label: 'Tone Enhancement' },
  { key: 'business_plan', icon: Building2, label: 'Business Plan' },
  { key: 'financial_plan', icon: DollarSign, label: 'Financial Plan' },
  { key: 'pricing_plans', icon: DollarSign, label: 'Pricing Plans', isPricing: true },
  { key: 'mass_production_plan', icon: MapPin, label: 'Mass Production (70+ Sites)' },
  { key: 'generator_app_optimization', icon: Rocket, label: 'Generator App Optimization' },
  { key: 'implementation_roadmap', icon: Megaphone, label: 'Implementation Roadmap', isRoadmap: true },
];

function SectionBlock({ icon: Icon, label, children }) {
  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-display text-lg tracking-tight">{label}</h3>
      </div>
      {children}
    </Card>
  );
}

function FieldRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="mb-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ListField({ label, items }) {
  if (!items || !items.length) return null;
  return (
    <div className="mb-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground/90 flex gap-2">
            <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="leading-relaxed">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function XtremeFactory() {
  const [blueprints, setBlueprints] = useState([]);
  const [active, setActive] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.MasterBlueprint.list('-created_date', 10);
      setBlueprints(rows || []);
      if (rows && rows[0]) setActive(rows[0]);
    } catch (e) { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('xtremeMasterBlueprint', {
        site_id: '6a97c144575f3ea074413ad3',
      });
      if (res?.data?.blueprint) {
        await load();
      } else if (res?.data?.error) {
        alert(res.data.error);
      }
    } catch (e) {
      alert(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const renderSection = (section) => {
    const data = active?.[section.key];
    if (!data) return null;

    if (section.isPricing) {
      const plans = Array.isArray(data) ? data : [];
      return (
        <SectionBlock icon={section.icon} label={section.label}>
          <div className="grid sm:grid-cols-2 gap-3">
            {plans.map((plan, i) => (
              <div key={i} className="rounded-lg border border-border/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-base">{plan.tier}</h4>
                  <Badge variant="secondary" className="text-[10px]">{plan.target_customer}</Badge>
                </div>
                <div className="flex gap-4">
                  <div><p className="text-[10px] uppercase text-muted-foreground">One-time</p><p className="font-mono text-sm">{plan.one_time_price}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Monthly</p><p className="font-mono text-sm">{plan.monthly_price}</p></div>
                </div>
                <ListField label="Features" items={plan.features} />
              </div>
            ))}
          </div>
        </SectionBlock>
      );
    }

    if (section.isRoadmap) {
      const phases = Array.isArray(data) ? data : [];
      return (
        <SectionBlock icon={section.icon} label={section.label}>
          <div className="space-y-3">
            {phases.map((phase, i) => (
              <div key={i} className="rounded-lg border-l-2 border-foreground/30 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">Phase {i + 1}</span>
                  <h4 className="font-medium text-sm">{phase.phase}</h4>
                  <Badge variant="outline" className="text-[9px] ml-auto">{phase.timeline}</Badge>
                </div>
                <ListField label="Deliverables" items={phase.deliverables} />
                <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/80">Milestone:</span> {phase.milestone}</p>
              </div>
            ))}
          </div>
        </SectionBlock>
      );
    }

    if (section.key === 'executive_summary' || section.key === 'overall_summary') {
      return (
        <SectionBlock icon={section.icon} label={section.label}>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{data}</p>
        </SectionBlock>
      );
    }

    if (section.key === 'ai_agent_system') {
      return (
        <SectionBlock icon={section.icon} label={section.label}>
          <ListField label="Agent Roster" items={data.agent_roster?.map(a => `${a.name} — ${a.role}: ${a.mission}`)} />
          <FieldRow label="Orchestration" value={data.orchestration} />
          <FieldRow label="Autonomous Loops" value={data.autonomous_loops} />
        </SectionBlock>
      );
    }

    // Default: render all object fields
    if (typeof data === 'object') {
      return (
        <SectionBlock icon={section.icon} label={section.label}>
          {Object.entries(data).map(([k, v]) => {
            if (Array.isArray(v)) return <ListField key={k} label={k.replace(/_/g, ' ')} items={v} />;
            if (typeof v === 'object' && v !== null) return <FieldRow key={k} label={k.replace(/_/g, ' ')} value={JSON.stringify(v, null, 2)} />;
            return <FieldRow key={k} label={k.replace(/_/g, ' ')} value={v} />;
          })}
        </SectionBlock>
      );
    }

    return (
      <SectionBlock icon={section.icon} label={section.label}>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{data}</p>
      </SectionBlock>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Factory className="w-5 h-5" />
            <h1 className="font-display text-2xl tracking-tight">Xtreme Factory Blueprint</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Master strategic blueprint for mass-producing autonomous epoxy/polished concrete marketing systems across 70+ XPS Xpress locations.
          </p>
        </div>
        <Button onClick={generate} disabled={generating} className="rounded-full">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating blueprint…' : 'Generate Master Blueprint'}
        </Button>
      </div>

      {/* Blueprint selector */}
      {blueprints.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {blueprints.map((bp) => (
            <button
              key={bp.id}
              onClick={() => setActive(bp)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border transition-colors',
                active?.id === bp.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {new Date(bp.created_date).toLocaleDateString()} · {bp.overall_score || '—'}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && !active && !generating && (
        <Card className="p-10 text-center border-border/60">
          <Factory className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No blueprint yet. Generate one to see the full strategic plan.</p>
        </Card>
      )}

      {generating && !active && (
        <Card className="p-10 text-center border-border/60">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Researching competitors, market data, and generating comprehensive blueprint with web intelligence…</p>
        </Card>
      )}

      {/* Blueprint content */}
      {active && (
        <div className="space-y-3">
          {active.executive_summary && (
            <Card className="p-5 border-foreground/20 bg-muted/30">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Executive Summary</p>
              <p className="text-sm leading-relaxed">{active.executive_summary}</p>
            </Card>
          )}

          {/* Pricing plans highlight */}
          {active.pricing_plans?.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {active.pricing_plans.map((plan, i) => (
                <Card key={i} className="p-4 border-border/60">
                  <h4 className="font-display text-base mb-1">{plan.tier}</h4>
                  <div className="flex gap-3 mb-2">
                    <div><p className="text-[9px] uppercase text-muted-foreground">Setup</p><p className="font-mono text-sm font-medium">{plan.one_time_price}</p></div>
                    <div><p className="text-[9px] uppercase text-muted-foreground">Monthly</p><p className="font-mono text-sm font-medium">{plan.monthly_price}</p></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{plan.target_customer}</p>
                </Card>
              ))}
            </div>
          )}

          {/* All sections */}
          {SECTIONS.filter(s => s.key !== 'executive_summary' && s.key !== 'pricing_plans').map(section => {
            const data = active[section.key];
            if (!data) return null;
            return <div key={section.key}>{renderSection(section)}</div>;
          })}

          {/* Pricing section (full detail) */}
          {active.pricing_plans?.length > 0 && renderSection(SECTIONS.find(s => s.isPricing))}

          {/* Overall summary */}
          {active.overall_summary && (
            <Card className="p-5 border-border/60">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Overall Summary</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{active.overall_summary}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}