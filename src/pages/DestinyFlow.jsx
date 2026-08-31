import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, ArrowLeft, Sparkles, HelpCircle, Target, Layers, FlaskConical, Hammer, Rocket, Brain, AlertTriangle, Lightbulb, SkipForward, User, Orbit } from 'lucide-react';
import DestinyTimeline from '@/components/destiny/DestinyTimeline';
import IntroCard from '@/components/destiny/IntroCard';
import AIAssistButton from '@/components/destiny/AIAssistButton';
import StrategyList from '@/components/destiny/StrategyList';
import OutcomeView from '@/components/destiny/OutcomeView';
import PersonalQuest from '@/components/destiny/PersonalQuest';
import LifeSimulator from '@/components/destiny/LifeSimulator';
import AccountabilityPanel from '@/components/destiny/AccountabilityPanel';
import { money } from '@/components/ideas/format';

const STEPS = [
  { id: 'vision', label: 'Vision', icon: Sparkles, purpose: 'Tell the system, in one honest sentence, the life you want.', summary: 'Your seed sentence is the root everything grows from. Type a few words and tap the sparkle to let AI expand it — or write your own.' },
  { id: 'quest', label: 'Quest', icon: HelpCircle, purpose: 'A few questions to sharpen your goal. Each answer compounds into the next.', summary: 'Optional. Answer yourself, accept an AI suggestion, or skip entirely — the strategy generator works from your vision alone.' },
  { id: 'goal', label: 'Goal Lock', icon: Target, purpose: 'Confirm your locked goal. This becomes the engine\u2019s target.', summary: 'Once locked, the engine scores every strategy and simulation against this goal and reverse-engineers the path to hit it.' },
  { id: 'strategies', label: 'Strategies', icon: Layers, purpose: 'The system generates 210 distinct strategies from your vision — and recommends the best.', summary: '210 strategies across 7 archetypes, ranked by fit to your goal. The top 10 are shown first — pick one to carry into your life simulation.' },
  { id: 'personal', label: 'You', icon: User, purpose: 'A few questions about who you are — how you decide, your risk, your story.', summary: 'The simulator models your actual life, not a generic one. Your answers shape the decision points, life events, and financial outcomes.' },
  { id: 'simulate', label: 'Life Sim', icon: Orbit, purpose: 'Simulate your life across any horizon — with variables you can change.', summary: 'Pick a horizon from 1 month to 20 years. The AI auto-chooses the best path, but you can override any decision — death, divorce, depression, risk — and watch the net worth rewrite in real time.' },
  { id: 'build', label: 'Build', icon: Hammer, purpose: 'Generate the full launch pack — brand, site, content.', summary: 'Runs in the background: business name, palette, website copy, and a 30-day social schedule.' },
  { id: 'launch', label: 'Launch', icon: Rocket, purpose: 'Provision infrastructure and ship to production.', summary: 'Vercel + Supabase provisioning, domain, and the live URL — gated by unit economics.' },
  { id: 'compound', label: 'Compound', icon: Brain, purpose: 'Extract a doctrine from the outcome.', summary: 'What worked becomes a reusable insight that feeds tomorrow\u2019s discovery — the compounding loop closes.' },
  { id: 'accountability', label: 'Live It', icon: Target, purpose: 'Turn the simulation into a life you actually live.', summary: 'Sync milestones to your Google Calendar, log reality vs the simulation, and let your personal AI coach keep you on the path — recalibrating every time reality diverges.' },
];

const STORAGE_KEY = 'destinyFlow.v2';

export default function DestinyFlow() {
  const [step, setStep] = useState(0);
  const [introOpen, setIntroOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // onboarding
  const [seed, setSeed] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [custom, setCustom] = useState('');
  const [goal, setGoal] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  // pipeline
  const [buildId, setBuildId] = useState(null);
  const [strategies, setStrategies] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [outcomes, setOutcomes] = useState(null);
  const [persona, setPersona] = useState(null);
  const [personaProfileId, setPersonaProfileId] = useState(null);
  const [buildPack, setBuildPack] = useState(null);
  const [launch, setLaunch] = useState(null);
  const [doctrine, setDoctrine] = useState(null);
  const [lifePlanId, setLifePlanId] = useState(null);
  const [ideaId, setIdeaId] = useState(null);

  // ── Resume from last step ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) {
        setStep(saved.step ?? 0);
        setSeed(saved.seed || '');
        setProfileId(saved.profileId || null);
        setAnswers(saved.answers || []);
        setGoal(saved.goal || null);
        setBuildId(saved.buildId || null);
        setStrategies(saved.strategies || null);
        setRecommendation(saved.recommendation || null);
        setSelectedStrategy(saved.selectedStrategy || null);
        setOutcomes(saved.outcomes || null);
        setPersona(saved.persona || null);
        setPersonaProfileId(saved.personaProfileId || null);
        setBuildPack(saved.buildPack || null);
        setLaunch(saved.launch || null);
        setDoctrine(saved.doctrine || null);
        setLifePlanId(saved.lifePlanId || null);
        setIdeaId(saved.ideaId || null);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Persist state ──
  useEffect(() => {
    const state = { step, seed, profileId, answers, goal, buildId, strategies, recommendation, selectedStrategy, outcomes, persona, personaProfileId, buildPack, launch, doctrine, lifePlanId, ideaId };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [step, seed, profileId, answers, goal, buildId, strategies, recommendation, selectedStrategy, outcomes, buildPack, launch, doctrine, lifePlanId, ideaId]);

  const cur = STEPS[step];
  const completed = new Set(STEPS.map((s, i) => i).filter((i) => i < step));

  const goStep = useCallback((i) => {
    setStep(Math.max(0, Math.min(i, STEPS.length - 1)));
    setIntroOpen(true);
    setError(null);
  }, []);
  const beginStep = () => setIntroOpen(false);
  const next = () => goStep(step + 1);
  const back = () => goStep(step - 1);

  // ── Vision: start the quest ──
  const startQuest = async () => {
    if (!seed.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('onboardingQuest', { action: 'start', seed_sentence: seed });
      setProfileId(res.data?.profile_id);
      setQuestion(res.data?.question);
      next();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Quest: answer (compounds) ──
  const answer = async (value) => {
    setRunning(true);
    setError(null);
    try {
      const ans = { question: question.question, answer: value };
      const newAnswers = [...answers, ans];
      setAnswers(newAnswers);
      setSuggestions(null);
      const res = await base44.functions.invoke('onboardingQuest', { answer: ans });
      if (res.data?.completed) {
        setGoal(res.data.goal);
        setStep(STEPS.findIndex((s) => s.id === 'goal'));
        setIntroOpen(true);
      } else {
        setQuestion(res.data.question);
        setCustom('');
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Quest: AI suggestions ──
  const getSuggestions = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('aiAssist', {
        mode: 'suggest',
        context: { vision: seed, question: question?.question, answers },
      });
      setSuggestions(res.data?.suggestions || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSuggesting(false);
    }
  };

  // ── Quest: skip (AI steers) ──
  const skipQuest = () => {
    setGoal({ kind: 'residual income', value: 10000, by_horizon: '1 year', summary: 'AI-derived from your vision — the engine will steer itself.' });
    setStep(STEPS.findIndex((s) => s.id === 'goal'));
    setIntroOpen(true);
  };

  // ── Goal Lock ──
  const lockGoal = async () => {
    setRunning(true);
    setError(null);
    try {
      const title = `Destiny: ${goal?.kind || 'residual income'} \u2192 ${goal?.value || ''} by ${goal?.by_horizon || '1y'}`.trim();
      const b = await base44.entities.BuildQueue.create({
        title,
        business_name: title,
        stage: 'queued',
        status: 'running',
        current_step: 'strategies',
        source: 'destiny_flow',
        notes: JSON.stringify({ goal, seed, answers }),
      });
      setBuildId(b.id);
      next();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Strategies: generate 210 ──
  const genStrategies = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateStrategies', { vision: seed, goal });
      setStrategies(res.data?.strategies || []);
      setRecommendation(res.data?.recommendation || null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Simulate outcomes ──
  const simulate = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('simulateOutcomes', { strategy: selectedStrategy, goal });
      setOutcomes(res.data?.outcomes || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Lock the life plan (creates Idea + LifePlan), then continue ──
  const lockAndContinue = async (simulation) => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('lockLifePlan', {
        vision: seed,
        strategy: selectedStrategy,
        persona_id: personaProfileId,
        horizon: simulation?.horizon || '1y',
        simulation,
      });
      setLifePlanId(res.data?.life_plan_id);
      setIdeaId(res.data?.idea_id);
      next();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Build pack ──
  const build = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateBuildPack', { idea_id: ideaId, build_id: buildId });
      setBuildPack(res.data || res);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Launch ──
  const launchIt = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('launchPipelineBuild', { id: buildId });
      setLaunch(res.data || res);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Compound ──
  const compound = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('councilCompound', {});
      setDoctrine(res.data || res);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const stepWithMeta = { ...cur, index: step, total: STEPS.length };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <DestinyTimeline steps={STEPS} current={step} completed={completed} onJump={goStep} />
      <IntroCard step={stepWithMeta} open={introOpen} onBegin={beginStep} running={running} />

      <main className="max-w-2xl mx-auto px-5 py-12">
        {/* Manual back / forward */}
        {step > 0 && !introOpen && (
          <div className="flex items-center justify-between mb-8">
            <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={next} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                Forward <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ── VISION ── */}
        {cur.id === 'vision' && !introOpen && (
          <div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Describe the life you want.</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              One sentence. Type a few words and tap the sparkle to let AI expand it — or write your own. This is the root everything grows from.
            </p>
            <div className="mt-8 flex gap-3">
              <Input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startQuest()}
                placeholder="e.g. millionaire in a year, fully automated…"
                className="rounded-full h-12 text-base flex-1"
                autoFocus
              />
              <AIAssistButton text={seed} context="vision sentence" onResult={setSeed} />
              <Button onClick={startQuest} disabled={running || !seed.trim()} className="rounded-full h-12 px-6">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Begin'}
              </Button>
            </div>
          </div>
        )}

        {/* ── QUEST ── */}
        {cur.id === 'quest' && !introOpen && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Question {answers.length + 1}</span>
              <button onClick={skipQuest} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <SkipForward className="w-3.5 h-3.5" /> Skip — let AI steer
              </button>
            </div>
            <div className="h-1 bg-muted rounded-full mb-10 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((answers.length / 6) * 100)}%` }} />
            </div>
            {running || !question ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div>
                <h2 className="font-display text-3xl tracking-tight leading-tight">{question.question}</h2>
                <div className="mt-8 space-y-3">
                  {question.options?.map((opt) => (
                    <button key={opt} onClick={() => answer(opt)} disabled={running} className="w-full text-left p-4 rounded-2xl border border-border/60 hover:border-primary hover:bg-muted/40 transition-colors text-[15px]">
                      {opt}
                    </button>
                  ))}
                  {suggestions?.map((opt) => (
                    <button key={opt} onClick={() => answer(opt)} disabled={running} className="w-full text-left p-4 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary transition-colors text-[15px] flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {opt}
                    </button>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && custom.trim() && answer(custom)} placeholder="Something else…" className="rounded-full" />
                    <Button variant="outline" className="rounded-full" disabled={running || !custom.trim()} onClick={() => answer(custom)}>Send</Button>
                  </div>
                  {!suggestions && (
                    <button onClick={getSuggestions} disabled={suggesting} className="text-sm text-primary hover:underline flex items-center gap-1.5 pt-2">
                      {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />} Suggest answers
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GOAL LOCK ── */}
        {cur.id === 'goal' && !introOpen && (
          <div>
            <h1 className="font-display text-4xl tracking-tight">Your goal is locked.</h1>
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Locked target</p>
              <p className="font-display text-2xl">{goal?.kind || 'Residual income'} → {goal?.value || ''}</p>
              <p className="text-sm text-muted-foreground mt-1">by {goal?.by_horizon || '1 year'}</p>
              {goal?.summary && <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">{goal.summary}</p>}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">From here, everything runs in the background. The engine generates 210 strategies, simulates the best, builds the launch pack, and ships it.</p>
            <Button onClick={lockGoal} disabled={running} className="mt-8 rounded-full h-12 px-8">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lock & start the engine'}
            </Button>
          </div>
        )}

        {/* ── STRATEGIES ── */}
        {cur.id === 'strategies' && !introOpen && (
          <div>
            <h1 className="font-display text-3xl tracking-tight">10 top strategies from your vision.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">The system generated 210 distinct strategies across 7 archetypes and ranked them to your goal. The top 10 are shown first — pick one to carry into your life simulation, or expand to see all 210.</p>
            <div className="mt-8">
              {!strategies ? (
                <Button onClick={genStrategies} disabled={running} className="rounded-full h-11 px-6">
                  {running ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {running ? 'Generating 210 strategies…' : 'Generate strategies'}
                </Button>
              ) : (
                <StrategyList strategies={strategies} recommendation={recommendation} selectedId={selectedStrategy?.id} onSelect={setSelectedStrategy} topN={10} />
              )}
            </div>
            {strategies && (
              <div className="flex items-center gap-3 mt-8">
                <Button onClick={next} disabled={!selectedStrategy} className="rounded-full h-11 px-6">
                  Continue to personal <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button variant="outline" onClick={genStrategies} disabled={running} className="rounded-full h-11">Regenerate</Button>
              </div>
            )}
          </div>
        )}

        {/* ── PERSONAL ── */}
        {cur.id === 'personal' && !introOpen && (
          <div>
            <h1 className="font-display text-3xl tracking-tight">Now, tell it who you are.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {selectedStrategy ? `Strategy locked: ${selectedStrategy.title}. ` : ''}The simulator models your actual life — your decisions, your risk, your story — not a generic founder's.
            </p>
            <div className="mt-8">
              {persona ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-primary" />
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your persona</p>
                  </div>
                  <p className="font-display text-2xl">{persona.archetype}</p>
                  <p className="text-sm text-muted-foreground mt-2">{persona.summary}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border">Decides: {persona.decision_style}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border">Risk: {persona.risk_tolerance}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">Founder fit: {persona.entrepreneur_fit}/100</span>
                  </div>
                  <Button onClick={next} className="rounded-full h-11 px-6 mt-6">
                    Run my life simulation <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              ) : (
                <PersonalQuest vision={seed} onComplete={(p, pid) => { setPersona(p); setPersonaProfileId(pid); }} />
              )}
            </div>
          </div>
        )}

        {/* ── LIFE SIM ── */}
        {cur.id === 'simulate' && !introOpen && (
          <div>
            <h1 className="font-display text-3xl tracking-tight">Your simulated life.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {selectedStrategy ? `${selectedStrategy.title} · ` : ''}{persona?.archetype ? `${persona.archetype} · ` : ''}Pick a horizon and change any decision — the net worth rewrites in real time.
            </p>
            <div className="mt-8">
              <LifeSimulator vision={seed} strategy={selectedStrategy} persona={{ ...persona, relationship_status: answers.find((a) => a.question.includes('relationship'))?.answer }} onDone={(result) => lockAndContinue(result)} />
            </div>
          </div>
        )}

        {/* ── BUILD ── */}
        {cur.id === 'build' && !introOpen && (
          <StepRunner title="Generating the launch pack" desc="Brand, website copy, and 30-day social schedule — in the background." onRun={build} running={running} done={!!buildPack} cta="Continue to launch" onNext={next}>
            {buildPack?.brand && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="font-display text-xl">{buildPack.brand.brand_name || buildPack.brand.name}</p>
                  <p className="text-sm text-muted-foreground italic">{buildPack.brand.tagline}</p>
                  {buildPack.brand.palette?.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {buildPack.brand.palette.map((c, i) => (
                        <span key={i} className="h-6 w-6 rounded-full border border-border" style={{ background: c }} />
                      ))}
                    </div>
                  )}
                </div>
                {buildPack.website?.sections?.length > 0 && <p className="text-sm text-muted-foreground">{buildPack.website.sections.length} site sections generated.</p>}
              </div>
            )}
          </StepRunner>
        )}

        {/* ── LAUNCH ── */}
        {cur.id === 'launch' && !introOpen && (
          <StepRunner title="Launching to production" desc="Provisioning Vercel + Supabase and shipping the live site." onRun={launchIt} running={running} done={!!launch} cta="Continue to compound" onNext={next}>
            {launch?.live_url && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Live URL</p>
                <a href={launch.live_url} target="_blank" rel="noreferrer" className="text-primary font-medium underline">{launch.live_url}</a>
              </div>
            )}
            {launch?.status === 'blocked' && <p className="text-sm text-muted-foreground">{launch.blocked_reason || 'Launch gated — check unit economics.'}</p>}
          </StepRunner>
        )}

        {/* ── COMPOUND ── */}
        {cur.id === 'compound' && !introOpen && (
          <StepRunner title="Compounding the brain" desc="Extracting a doctrine from this run to feed tomorrow's discovery." onRun={compound} running={running} done={!!doctrine} cta="Finish cycle" onNext={() => {}} isLast>
            {doctrine?.doctrine && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">New doctrine</p>
                <p className="text-sm">{doctrine.doctrine}</p>
              </div>
            )}
            {doctrine && <p className="text-sm text-primary font-medium">Destiny cycle complete. The loop is closed.</p>}
          </StepRunner>
        )}

        {/* ── ACCOUNTABILITY ── */}
        {cur.id === 'accountability' && !introOpen && (
          <div>
            <h1 className="font-display text-3xl tracking-tight">Live it.</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">You loved the simulation. Now make it real — sync milestones to your calendar, log reality as it happens, and let your coach keep you on the path.</p>
            <div className="mt-8">
              {lifePlanId ? <AccountabilityPanel lifePlanId={lifePlanId} /> : <p className="text-muted-foreground">Lock a plan from your life simulation first.</p>}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </main>
    </div>
  );
}

function StepRunner({ title, desc, onRun, running, done, cta, onNext, children, isLast }) {
  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">{desc}</p>
      <div className="mt-8">{children}</div>
      <div className="flex items-center gap-3 mt-8">
        {!done && (
          <Button onClick={onRun} disabled={running} className="rounded-full h-11 px-6">
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {running ? 'Running in background…' : 'Run now'}
          </Button>
        )}
        {done && !isLast && <Button onClick={onNext} className="rounded-full h-11 px-6">{cta} <ArrowRight className="w-4 h-4 ml-1.5" /></Button>}
        {done && isLast && <span className="text-sm text-muted-foreground">Cycle complete.</span>}
      </div>
    </div>
  );
}