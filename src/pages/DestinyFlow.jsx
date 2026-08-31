import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, HelpCircle, Target, Telescope, FlaskConical, Hammer, Rocket, Brain, CheckCircle2, AlertTriangle } from "lucide-react";
import DestinyTimeline from "@/components/destiny/DestinyTimeline";
import IntroCard from "@/components/destiny/IntroCard";
import { money } from "@/components/ideas/format";

const STEPS = [
  { id: "vision", label: "Vision", icon: Sparkles, purpose: "Tell the system, in one honest sentence, the life you want.", summary: "Your seed sentence is the root everything grows from. The more specific, the sharper every later decision becomes." },
  { id: "quest", label: "Quest", icon: HelpCircle, purpose: "Answer a few questions. Each answer compounds into the next one.", summary: "The system narrows your goal from open-ended to locked — steering every opportunity, simulation, and build toward it." },
  { id: "goal", label: "Goal Lock", icon: Target, purpose: "Confirm your locked goal. This becomes the engine's target.", summary: "Once locked, the engine scores every scraped opportunity against this goal and reverse-engineers the path to hit it." },
  { id: "discover", label: "Discover", icon: Telescope, purpose: "The system scrapes the web for opportunities matched to your goal.", summary: "Vision sweeps forums, trends, and products in the background, then scores each one to your profile and goal." },
  { id: "simulate", label: "Simulate", icon: FlaskConical, purpose: "Forecast the top opportunity across multiple horizons.", summary: "Revenue, cost, break-even, and probability of hitting your goal — with reverse-engineering if it falls short." },
  { id: "build", label: "Build", icon: Hammer, purpose: "Generate the full launch pack — brand, site, content.", summary: "Runs in the background: business name, palette, website copy, and a 30-day social schedule." },
  { id: "launch", label: "Launch", icon: Rocket, purpose: "Provision infrastructure and ship to production.", summary: "Vercel + Supabase provisioning, domain, and the live URL — gated by unit economics." },
  { id: "compound", label: "Compound", icon: Brain, purpose: "Extract a doctrine from the outcome.", summary: "What worked becomes a reusable insight that feeds tomorrow's discovery — the compounding loop closes." },
];

export default function DestinyFlow() {
  const [step, setStep] = useState(0);
  const [introOpen, setIntroOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // onboarding state
  const [seed, setSeed] = useState("");
  const [profileId, setProfileId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [custom, setCustom] = useState("");
  const [goal, setGoal] = useState(null);

  // pipeline state
  const [buildId, setBuildId] = useState(null);
  const [ideas, setIdeas] = useState(null);
  const [topIdea, setTopIdea] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [buildPack, setBuildPack] = useState(null);
  const [launch, setLaunch] = useState(null);
  const [doctrine, setDoctrine] = useState(null);

  const cur = STEPS[step];
  const completed = new Set(STEPS.map((s, i) => i).filter((i) => i < step));

  const goStep = useCallback((i) => {
    setStep(i);
    setIntroOpen(true);
    setError(null);
  }, []);

  const beginStep = () => setIntroOpen(false);
  const next = () => step < STEPS.length - 1 && goStep(step + 1);
  const back = () => step > 0 && goStep(step - 1);

  // ── Vision: start the quest ──
  const startQuest = async () => {
    if (!seed.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("onboardingQuest", { action: "start", seed_sentence: seed });
      setProfileId(res.data?.profile_id);
      setQuestion(res.data?.question);
      next();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Quest: answer (compounds into next question) ──
  const answer = async (value) => {
    setRunning(true);
    setError(null);
    try {
      const ans = { question: question.question, answer: value };
      const newAnswers = [...answers, ans];
      setAnswers(newAnswers);
      const res = await base44.functions.invoke("onboardingQuest", { answer: ans });
      if (res.data?.completed) {
        setGoal(res.data.goal);
        setStep(STEPS.findIndex((s) => s.id === "goal"));
        setIntroOpen(true);
      } else {
        setQuestion(res.data.question);
        setCustom("");
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Goal Lock: create build context ──
  const lockGoal = async () => {
    setRunning(true);
    setError(null);
    try {
      const title = `Destiny: ${goal?.kind || "residual income"} → ${goal?.value || ""} by ${goal?.by_horizon || "1y"}`.trim();
      const b = await base44.entities.BuildQueue.create({
        title,
        business_name: title,
        stage: "queued",
        status: "running",
        current_step: "discover",
        source: "destiny_flow",
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

  // ── Discover: scrape in background ──
  const discover = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("visionSweep", { goal });
      const list = res.data?.ideas || res.ideas || [];
      setIdeas(list);
      setTopIdea(list[0] || null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // ── Simulate ──
  const simulate = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("simulateStrategy", { idea_id: topIdea?.id, goal });
      setSimulation(res.data || res);
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
      const res = await base44.functions.invoke("generateBuildPack", { idea_id: topIdea?.id, build_id: buildId });
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
      const res = await base44.functions.invoke("launchPipelineBuild", { id: buildId });
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
      const res = await base44.functions.invoke("councilCompound", {});
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
        {/* Back button */}
        {step > 0 && !introOpen && (
          <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* ── VISION ── */}
        {cur.id === "vision" && !introOpen && (
          <div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">Describe the life you want.</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              One sentence. Be honest and specific — the system will spend the next few questions turning it into a locked goal, then steer every recommendation toward it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startQuest()}
                placeholder="e.g. I want to be a millionaire in a year running a fully automated digital business."
                className="rounded-full h-12 text-base flex-1"
                autoFocus
              />
              <Button onClick={startQuest} disabled={running || !seed.trim()} className="rounded-full h-12 px-6">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : "Begin quest"}
              </Button>
            </div>
          </div>
        )}

        {/* ── QUEST ── */}
        {cur.id === "quest" && !introOpen && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Question {answers.length + 1}
              </span>
              <span className="text-[11px] text-muted-foreground">{answers.length} answered</span>
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
                    <button
                      key={opt}
                      onClick={() => answer(opt)}
                      disabled={running}
                      className="w-full text-left p-4 rounded-2xl border border-border/60 hover:border-primary hover:bg-muted/40 transition-colors text-[15px]"
                    >
                      {opt}
                    </button>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && custom.trim() && answer(custom)}
                      placeholder="Something else…"
                      className="rounded-full"
                    />
                    <Button variant="outline" className="rounded-full" disabled={running || !custom.trim()} onClick={() => answer(custom)}>
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GOAL LOCK ── */}
        {cur.id === "goal" && !introOpen && (
          <div>
            <h1 className="font-display text-4xl tracking-tight">Your goal is locked.</h1>
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Locked target</p>
              <p className="font-display text-2xl">{goal?.kind || "Residual income"} → {goal?.value || ""}</p>
              <p className="text-sm text-muted-foreground mt-1">by {goal?.by_horizon || "1 year"}</p>
              {goal?.summary && <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">{goal.summary}</p>}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              From here, everything runs in the background. The engine scrapes opportunities, simulates the best one, builds the launch pack, and ships it — you just approve.
            </p>
            <Button onClick={lockGoal} disabled={running} className="mt-8 rounded-full h-12 px-8">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lock & start the engine"}
            </Button>
          </div>
        )}

        {/* ── DISCOVER ── */}
        {cur.id === "discover" && !introOpen && (
          <StepRunner
            title="Discovering opportunities"
            desc="Vision is scraping forums, trends, and products — matched to your goal."
            onRun={discover}
            running={running}
            done={!!ideas}
            cta="Continue to simulation"
            onNext={next}
          >
            {ideas?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{ideas.length} opportunities found. Top match:</p>
                <div className="rounded-xl border border-border p-4">
                  <p className="font-medium">{topIdea?.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{topIdea?.one_liner}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                    <span>Profit: {money(topIdea?.est_monthly_profit_usd)}/mo</span>
                    <span>Launch: {money(topIdea?.launch_cost_usd)}</span>
                    <span>{topIdea?.time_to_launch_days}d</span>
                  </div>
                </div>
              </div>
            ) : null}
          </StepRunner>
        )}

        {/* ── SIMULATE ── */}
        {cur.id === "simulate" && !introOpen && (
          <StepRunner
            title="Simulating the top opportunity"
            desc="Forecasting revenue, cost, break-even, and probability of your goal."
            onRun={simulate}
            running={running}
            done={!!simulation}
            cta="Continue to build"
            onNext={next}
          >
            {simulation?.metrics && (
              <div className="grid grid-cols-2 gap-3">
                <Metric label="12m revenue" value={money(simulation.metrics.total_revenue)} />
                <Metric label="12m profit" value={money(simulation.metrics.total_profit)} />
                <Metric label="Break-even day" value={simulation.metrics.break_even_day || "—"} />
                <Metric label="ROI" value={`${simulation.metrics.roi_pct || 0}%`} />
                {simulation.reverse_feasible !== undefined && (
                  <div className="col-span-2 rounded-lg border border-border p-3 text-sm">
                    <span className="text-muted-foreground">Reverse-engineered to goal: </span>
                    <span className={simulation.reverse_feasible ? "text-primary font-medium" : "text-destructive font-medium"}>
                      {simulation.reverse_feasible ? "feasible" : "needs adjustment"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </StepRunner>
        )}

        {/* ── BUILD ── */}
        {cur.id === "build" && !introOpen && (
          <StepRunner
            title="Generating the launch pack"
            desc="Brand, website copy, and 30-day social schedule — in the background."
            onRun={build}
            running={running}
            done={!!buildPack}
            cta="Continue to launch"
            onNext={next}
          >
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
                {buildPack.website?.sections?.length > 0 && (
                  <p className="text-sm text-muted-foreground">{buildPack.website.sections.length} site sections generated.</p>
                )}
              </div>
            )}
          </StepRunner>
        )}

        {/* ── LAUNCH ── */}
        {cur.id === "launch" && !introOpen && (
          <StepRunner
            title="Launching to production"
            desc="Provisioning Vercel + Supabase and shipping the live site."
            onRun={launchIt}
            running={running}
            done={!!launch}
            cta="Continue to compound"
            onNext={next}
          >
            {launch?.live_url && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Live URL</p>
                <a href={launch.live_url} target="_blank" rel="noreferrer" className="text-primary font-medium underline">
                  {launch.live_url}
                </a>
              </div>
            )}
            {launch?.status === "blocked" && (
              <p className="text-sm text-muted-foreground">{launch.blocked_reason || "Launch gated — check unit economics."}</p>
            )}
          </StepRunner>
        )}

        {/* ── COMPOUND ── */}
        {cur.id === "compound" && !introOpen && (
          <StepRunner
            title="Compounding the brain"
            desc="Extracting a doctrine from this run to feed tomorrow's discovery."
            onRun={compound}
            running={running}
            done={!!doctrine}
            cta="Finish cycle"
            onNext={() => {}}
            isLast
          >
            {doctrine?.doctrine && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">New doctrine</p>
                <p className="text-sm">{doctrine.doctrine}</p>
              </div>
            )}
            {doctrine && (
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-medium">Destiny cycle complete. The loop is closed.</p>
              </div>
            )}
          </StepRunner>
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
            {running ? "Running in background…" : "Run now"}
          </Button>
        )}
        {done && !isLast && (
          <Button onClick={onNext} className="rounded-full h-11 px-6">
            {cta} <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
        {done && isLast && (
          <span className="text-sm text-muted-foreground">Cycle complete.</span>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl mt-0.5">{value}</p>
    </div>
  );
}