import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, Play, ArrowRight, CheckCircle2, Circle, Loader2,
  Brain, TrendingUp, Crown, Search, ListOrdered, Code2,
  Server, Copy, ShieldCheck, Rocket, AlertTriangle, Link2, Key
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'strategize', label: 'Strategize', icon: Brain, agent: 'Shadow', desc: '10 strategies + financial predictions' },
  { id: 'simulate', label: 'Simulate', icon: TrendingUp, agent: 'Quant', desc: 'p10/p50/p90 per strategy' },
  { id: 'recommend', label: 'Recommend', icon: Crown, agent: 'Council', desc: 'Pick highest-probability strategy' },
  { id: 'research', label: 'Tech Research', icon: Search, agent: 'Shadow', desc: 'Best tech, templates, AI models' },
  { id: 'queue', label: 'Queue', icon: ListOrdered, agent: 'Architect', desc: 'Stage into BuildQueue' },
  { id: 'build', label: 'Build Pack', icon: Code2, agent: 'Chief Architect', desc: 'Full build manifest' },
  { id: 'provision', label: 'Provision', icon: Server, agent: 'SRE', desc: 'Vercel + Supabase + GitHub + Drive' },
  { id: 'clone', label: 'Clone', icon: Copy, agent: 'Shadow', desc: 'Clone Shadow + system, reverse-engineer gaps' },
  { id: 'validate', label: 'Validate', icon: ShieldCheck, agent: 'Validator', desc: 'Audit to 100% (retry ×3)' },
  { id: 'launch', label: 'Launch', icon: Rocket, agent: 'Launch Conductor', desc: 'Go-live + verify' },
];

const STAGE_MAP = {
  strategize: 'strategizing', simulate: 'simulating', recommend: 'recommending',
  research: 'researching', queue: 'queuing', build: 'building',
  provision: 'provisioning', clone: 'cloning', validate: 'validating', launch: 'launching',
  vision: 'vision', complete: 'complete', failed: 'failed'
};

function StageStatus({ stageId, pipeline }) {
  const currentStage = pipeline?.stage || 'vision';
  const stageMapVal = STAGE_MAP[stageId];
  const isDone = pipeline?.validation_scores?.[stageId] != null;
  const isCurrent = currentStage === stageMapVal;
  const isPast = STAGES.findIndex(s => s.id === stageId) < STAGES.findIndex(s => STAGE_MAP[s.id] === currentStage);
  const score = pipeline?.validation_scores?.[stageId];

  if (isDone) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (isCurrent) return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
  if (isPast) return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  return <Circle className="w-4 h-4 text-muted-foreground/40" />;
}

function StrategiesList({ strategies }) {
  if (!strategies?.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {strategies.map((s, i) => (
        <Card key={i} className="p-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium">{i + 1}. {s.name}</p>
            <Badge variant="outline" className="text-[9px] shrink-0">{s.fit_score}/100</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.angle}</p>
          {s.financial_prediction && (
            <div className="flex gap-3 mt-1.5 text-[10px]">
              <span className="text-emerald-600">Y1: ${(s.financial_prediction.monthly_revenue_year1 || 0).toLocaleString()}/mo</span>
              <span className="text-muted-foreground">BE: mo {s.financial_prediction.break_even_month || '?'}</span>
              <span className="text-muted-foreground">{s.financial_prediction.margin_pct || 0}% margin</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function SimulationsList({ simulations }) {
  if (!simulations?.length) return null;
  return (
    <div className="space-y-1.5">
      {simulations.map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium w-32 truncate">{s.strategy_name}</span>
          <div className="flex-1 flex gap-2">
            <Badge variant="outline" className="text-[9px] text-rose-600">p10 ${(s.p10 || 0).toLocaleString()}</Badge>
            <Badge variant="outline" className="text-[9px] text-amber-600">p50 ${(s.p50 || 0).toLocaleString()}</Badge>
            <Badge variant="outline" className="text-[9px] text-emerald-600">p90 ${(s.p90 || 0).toLocaleString()}</Badge>
          </div>
          <span className="text-muted-foreground text-[10px]">{s.probability_of_success || 0}%</span>
        </div>
      ))}
    </div>
  );
}

function CloneStatus({ cloneStatus }) {
  if (!cloneStatus) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Badge variant={cloneStatus.shadow_cloned ? 'default' : 'outline'} className="text-[10px]">
          Shadow: {cloneStatus.shadow_cloned ? 'Cloned' : 'Pending'}
        </Badge>
        <Badge variant={cloneStatus.system_cloned ? 'default' : 'outline'} className="text-[10px]">
          System: {cloneStatus.system_cloned ? 'Cloned' : 'Pending'}
        </Badge>
      </div>
      {cloneStatus.gaps?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Gaps Identified + Replacements</p>
          <div className="space-y-1">
            {cloneStatus.gaps.map((g, i) => (
              <div key={i} className="text-[11px] flex gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{g}</span>
                {cloneStatus.replacements?.[i] && (
                  <span className="text-emerald-600 font-medium">→ {cloneStatus.replacements[i]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AutoConnectSection() {
  const [keys, setKeys] = useState({ vercel: '', supabase: '', github: '', stripe: '' });
  const [saved, setSaved] = useState({});

  const save = (service) => {
    if (!keys[service]) return;
    setSaved(s => ({ ...s, [service]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [service]: false })), 2000);
  };

  const services = [
    { id: 'vercel', label: 'Vercel', type: 'key', placeholder: 'vercel_xxxxxxxx' },
    { id: 'supabase', label: 'Supabase', type: 'key', placeholder: 'sbp_xxxxxxxx' },
    { id: 'github', label: 'GitHub', type: 'oauth', placeholder: '' },
    { id: 'stripe', label: 'Stripe', type: 'key', placeholder: 'sk_xxxxxxxx' },
  ];

  return (
    <Card className="p-3">
      <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Link2 className="w-3.5 h-3.5" /> Auto-Connect Services</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            {s.type === 'oauth' ? (
              <Button size="sm" variant="outline" className="h-8 text-xs flex-1">
                <Link2 className="w-3 h-3" /> Connect {s.label}
              </Button>
            ) : (
              <>
                <Key className="w-3 h-3 text-muted-foreground shrink-0" />
                <Input
                  type="password"
                  value={keys[s.id]}
                  onChange={(e) => setKeys(k => ({ ...k, [s.id]: e.target.value }))}
                  placeholder={s.placeholder}
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" variant={saved[s.id] ? 'default' : 'outline'} onClick={() => save(s.id)} className="h-8 text-xs px-2">
                  {saved[s.id] ? <CheckCircle2 className="w-3 h-3" /> : 'Save'}
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function VisionPipelinePanel() {
  const [user, setUser] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [active, setActive] = useState(null);
  const [vision, setVision] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (!u || u.role !== 'admin') return;
      const list = await base44.entities.VisionPipeline.list('-created_date', 10);
      setPipelines(list);
      if (!active && list.length > 0) setActive(list[0]);
    } catch (e) { setError(e.message); }
  }, [active]);

  useEffect(() => {
    load();
    const unsub = base44.entities.VisionPipeline.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const startPipeline = async () => {
    if (!vision.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke('visionPipelineOrchestrator', {
        body: { vision_statement: vision.trim() }
      });
      if (res.pipeline) { setActive(res.pipeline); setVision(''); await load(); }
      else if (res.error) throw new Error(res.error);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const runNext = async () => {
    if (!active || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke('visionPipelineOrchestrator', {
        body: { pipeline_id: active.id }
      });
      if (res.pipeline) setActive(res.pipeline);
      if (res.error) throw new Error(res.error);
      await load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-600" /> Vision Pipeline — End-to-End Autonomous Build
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vision → 10 strategies → simulate → recommend → research → queue → build → provision → clone → validate → launch
        </p>
      </div>

      {/* Vision Input */}
      <Card className="p-3 border-purple-500/20 bg-purple-500/5">
        <Textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          placeholder="Enter your one-sentence vision... e.g., 'Build an autonomous AI content agency that generates $10k/mo with zero human input'"
          className="text-sm bg-background resize-none"
          rows={2}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">Shadow will generate 10 strategies specific to his skillset</p>
          <Button onClick={startPipeline} disabled={!vision.trim() || busy} size="sm" className="text-xs">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Start Pipeline
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-2.5 border-destructive/30 bg-destructive/5">
          <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>
        </Card>
      )}

      {/* Pipeline Selector */}
      {pipelines.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className={cn(
                'text-[10px] px-2.5 py-1 rounded-full border transition-colors truncate max-w-[200px]',
                active?.id === p.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'
              )}
            >
              {p.vision_statement.slice(0, 40)}...
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          {/* Pipeline Stage Tracker */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-[10px] capitalize">{active.stage}</Badge>
              <Button onClick={runNext} disabled={busy || active.stage === 'complete' || active.stage === 'failed'} size="sm" className="text-xs">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                {active.stage === 'vision' ? 'Run Pipeline' : 'Run Next Stage'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {STAGES.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50">
                  <StageStatus stageId={s.id} pipeline={active} />
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{i + 1}. {s.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">{s.agent}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Strategies */}
          {active.strategies?.length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> {active.strategies.length} Strategies + Financial Predictions</p>
              <StrategiesList strategies={active.strategies} />
            </Card>
          )}

          {/* Simulations */}
          {active.simulations?.length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Simulations (p10/p50/p90)</p>
              <SimulationsList simulations={active.simulations} />
            </Card>
          )}

          {/* Recommendation */}
          {active.recommendation && (
            <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-emerald-600" /> Council Recommendation</p>
              <p className="text-sm font-medium">{active.recommendation.strategy_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{active.recommendation.reason}</p>
              <Badge variant="default" className="text-[10px] mt-1.5">{active.recommendation.probability_of_goal}% probability of goal</Badge>
            </Card>
          )}

          {/* Tech Research */}
          {active.tech_research && (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Tech Research (Best Stack, Templates, AI Models)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {active.tech_research.best_tech_stack && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Tech Stack</p><p>{active.tech_research.best_tech_stack.join(', ')}</p></div>
                )}
                {active.tech_research.best_ai_models && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">AI Models</p><p>{active.tech_research.best_ai_models.join(', ')}</p></div>
                )}
                {active.tech_research.best_templates && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Templates</p><p>{active.tech_research.best_templates.join(', ')}</p></div>
                )}
                {active.tech_research.max_capability_features && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Max Features</p><p>{active.tech_research.max_capability_features.join(', ')}</p></div>
                )}
              </div>
            </Card>
          )}

          {/* Clone Status */}
          {active.clone_status && (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Clone + Gap Analysis</p>
              <CloneStatus cloneStatus={active.clone_status} />
            </Card>
          )}

          {/* Validation Scores */}
          {active.validation_scores && Object.keys(active.validation_scores).length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Validation Scores (target: 100)</p>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(active.validation_scores).map(([stage, score]) => (
                  <Badge key={stage} variant="outline" className={cn('text-[10px]', score >= 100 ? 'text-emerald-600 border-emerald-500/30' : 'text-amber-600 border-amber-500/30')}>
                    {stage}: {score}/100
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Auto-Connect */}
          <AutoConnectSection />
        </>
      )}
    </div>
  );
}