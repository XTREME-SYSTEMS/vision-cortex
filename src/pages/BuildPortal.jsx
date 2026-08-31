import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Telescope, Microscope, Gavel, ListTodo, Hammer, Server, Rocket, ShieldCheck, Brain, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import Timeline from "@/components/build/Timeline";
import StepPanel from "@/components/build/StepPanel";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { money } from "@/components/ideas/format";

const STEPS = [
  { id: "discover", label: "Discover", icon: Telescope, desc: "Input your vision. The system scrapes the web and uses the LLM to surface 10 opportunities." },
  { id: "analyze", label: "Analyze", icon: Microscope, desc: "The Council debates the top opportunity — risks, moat, and viability." },
  { id: "decide", label: "Decide", icon: Gavel, desc: "Generate the full investor-grade blueprint with cost, revenue, and timeline." },
  { id: "queue", label: "Queue", icon: ListTodo, desc: "Add the chosen build to the pipeline queue." },
  { id: "build", label: "Build", icon: Hammer, desc: "The Council enhances the build and checks launch-readiness." },
  { id: "provision", label: "Provision", icon: Server, desc: "Provision a Vercel project for the build." },
  { id: "launch", label: "Launch", icon: Rocket, desc: "Launch the build to production." },
  { id: "validate", label: "Validate", icon: ShieldCheck, desc: "Council validation gate — is it ready to run unattended?" },
  { id: "compound", label: "Compound", icon: Brain, desc: "Extract a doctrine and optimize the brain." },
  { id: "repeat", label: "Repeat", icon: RefreshCw, desc: "Loop back to discover the next opportunity." },
];

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "vision-build";
const inputCls = "bg-zinc-900 border-white/10 text-white placeholder:text-white/30";

export default function BuildPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [agentIds, setAgentIds] = useState([]);
  const [vision, setVision] = useState("");
  const [prompt, setPrompt] = useState("");
  const [focus, setFocus] = useState("");
  const [qTitle, setQTitle] = useState("");
  const [projName, setProjName] = useState("");
  const [ctx, setCtx] = useState({});
  const [res, setRes] = useState({});

  const load = async () => {
    try {
      const b = await base44.entities.BuildQueue.get(id);
      setBuild(b);
      const visited = new Set(b.visited_steps || []);
      const idx = STEPS.findIndex((s) => s.id === b.current_step);
      setStep(idx >= 0 ? idx : 0);
      setRes((r) => {
        const out = { ...r };
        visited.forEach((sid) => { if (!out[sid]) out[sid] = { _done: true }; });
        return out;
      });
    } catch { /* build not found */ }
  };

  useEffect(() => {
    load();
    base44.entities.AgentProfile.list("order", 50)
      .then((a) => setAgentIds(a.filter((x) => x.status !== "paused" && x.status !== "error").map((x) => x.id)))
      .catch(() => {});
    base44.entities.Doctrine.filter({ category: "leadership" }, "-created_date", 20).then((rows) => {
      const v = rows.find((r) => /vision statement/i.test(r.topic || ""));
      if (v) setVision(v.insight || "");
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cur = STEPS[step];
  const completed = new Set(STEPS.map((s, i) => i).filter((i) => (build?.visited_steps || []).includes(STEPS[i].id)));

  const markDone = async (stepId, extra) => {
    const visited = Array.from(new Set([...(build?.visited_steps || []), stepId]));
    const nextIdx = STEPS.findIndex((s) => s.id === stepId) + 1;
    const nextStep = STEPS[nextIdx]?.id || stepId;
    const patch = { visited_steps: visited, current_step: nextStep, status: stepId === "compound" ? "complete" : "running", ...extra };
    try { const updated = await base44.entities.BuildQueue.update(id, patch); setBuild(updated); } catch {}
  };

  const run = async () => {
    if (cur.id === "repeat") {
      try { await base44.entities.BuildQueue.update(id, { visited_steps: [], current_step: "discover", status: "queued" }); } catch {}
      setStep(0); setCtx({}); setRes({}); await load(); return;
    }
    setRunning(true);
    try {
      let out;
      if (cur.id === "discover") {
        out = await base44.functions.invoke("nightlyPipelinePrep", { vision });
        const top = out.pipelines?.[0];
        setCtx((c) => ({ ...c, topIdea: top || null, pipelines: out.pipelines, simulation: out.simulation }));
        setPrompt((p) => p || (top ? `Analyze ${top.title} for viability, risks, and moat.` : "Analyze the top opportunity."));
        setFocus((f) => f || (top ? top.title : ""));
      } else if (cur.id === "analyze") {
        out = await base44.functions.invoke("agentDebate", { prompt, agentIds, webSearch: true });
        setCtx((c) => ({ ...c, debate: out }));
      } else if (cur.id === "decide") {
        out = await base44.functions.invoke("councilBlueprint", { focus });
        setCtx((c) => ({ ...c, blueprint: out.idea }));
        setQTitle(out.idea?.title || "");
        setProjName(slug(out.idea?.title));
        await base44.entities.BuildQueue.update(id, { idea_id: out.idea?.id || "" }).catch(() => {});
      } else if (cur.id === "queue") {
        out = await base44.functions.invoke("pipelineOrchestrator", {});
        setCtx((c) => ({ ...c, build: out }));
      } else if (cur.id === "build") {
        out = await base44.functions.invoke("pipelineOrchestrator", {});
        setCtx((c) => ({ ...c, build: out }));
      } else if (cur.id === "provision") {
        out = await base44.functions.invoke("provisionVercel", { mode: "create", name: projName || slug(build?.business_name || build?.title) });
        setCtx((c) => ({ ...c, vercel: out.project }));
      } else if (cur.id === "launch") {
        out = await base44.functions.invoke("launchPipelineBuild", { id });
        setCtx((c) => ({ ...c, launch: out }));
      } else if (cur.id === "validate") {
        out = await base44.functions.invoke("pipelineOrchestrator", {});
        setCtx((c) => ({ ...c, validation: out }));
      } else if (cur.id === "compound") {
        out = await base44.functions.invoke("councilCompound", {});
        setCtx((c) => ({ ...c, doctrine: out }));
      }
      setRes((r) => ({ ...r, [cur.id]: out }));
      await markDone(cur.id);
    } catch (e) {
      setRes((r) => ({ ...r, [cur.id]: { error: e.message || String(e) } }));
    }
    setRunning(false);
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const jump = (i) => setStep(i);

  const canRun = (() => {
    if (cur.id === "analyze") return !!(prompt && agentIds.length);
    if (cur.id === "decide") return !!focus;
    return true;
  })();

  const r = res[cur.id];
  const err = r?.error;

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      <header className="flex h-14 items-center gap-3 border-b border-white/10 bg-zinc-950 px-4">
        <button
          onClick={() => navigate("/build")}
          className="flex items-center gap-1.5 rounded-md border border-amber-400 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-400/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Queue
        </button>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">{build?.business_name || build?.title || "Build"}</div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400">Auto Builder</div>
        </div>
        <span className="ml-auto rounded bg-lime-400/10 px-1.5 py-0.5 text-[10px] font-medium text-lime-300">
          {(build?.product_type || "marketing_site").replace("_", " ")}
        </span>
      </header>

      <Timeline steps={STEPS} current={step} completed={completed} onJump={jump} />

      <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-28">
        <div className="mx-auto max-w-3xl">
          <StepPanel step={cur} running={running} canRun={canRun} canNext={completed.has(step)} isLast={step === STEPS.length - 1} onRun={run} onNext={next}>
            {cur.id === "discover" && (
              <>
                <Textarea value={vision} onChange={(e) => setVision(e.target.value)} placeholder="Your vision / ideas — what do you want the system to build?" rows={4} className={`resize-none ${inputCls}`} />
                {r && !err && !r._done && (
                  <div className="space-y-1">
                    <p className="text-xs text-lime-400">Highest: {r.simulation?.highest_return?.title || "—"} · Fastest: {r.simulation?.fastest_return?.title || "—"} · Best: {r.simulation?.best_balance || "—"}</p>
                    {(r.pipelines || []).map((p, i) => (<div key={p.id} className="text-sm py-1 border-b border-white/10 last:border-0"><span className="text-white/40">{i + 1}.</span> {p.title}</div>))}
                  </div>
                )}
              </>
            )}

            {cur.id === "analyze" && (
              <>
                <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Debate prompt" className={inputCls} />
                {agentIds.length === 0 && <p className="text-xs text-white/40">No active agents — add agents on the Agents page first.</p>}
                {r && !err && !r._done && (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(r.transcript || []).map((t, i) => (<div key={i} className="text-sm leading-snug"><span className="font-medium text-white">{t.author}: </span><span className="text-white/60">{t.content}</span></div>))}
                  </div>
                )}
              </>
            )}

            {cur.id === "decide" && (
              <>
                <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus for the blueprint" className={inputCls} />
                {r?.idea && (
                  <div className="rounded-xl bg-white/5 p-4 space-y-1">
                    <p className="font-medium text-white">{r.idea.title}</p>
                    <p className="text-sm text-white/50">{r.idea.one_liner}</p>
                    <div className="flex gap-4 text-xs text-white/50 pt-1">
                      <span>Cost: {money(r.idea.launch_cost_usd)}</span>
                      <span>Profit: {money(r.idea.est_monthly_profit_usd)}/mo</span>
                      <span>Launch: {r.idea.time_to_launch_days}d</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {cur.id === "queue" && r && !err && !r._done && (
              <div className="space-y-1 text-sm">
                <p><span className="text-white/50">Resolution: </span>{r.resolution}</p>
                <p><span className="text-white/50">Ready to launch: </span>{r.ready_to_launch ? "Yes" : "Not yet"}</p>
                {r.queued && <p className="text-white/50">Queued new opportunity: {r.queued}</p>}
              </div>
            )}

            {cur.id === "build" && r && !err && !r._done && (
              <div className="space-y-1 text-sm">
                <p><span className="text-white/50">Resolution: </span>{r.resolution}</p>
                <p><span className="text-white/50">Ready to launch: </span>{r.ready_to_launch ? "Yes" : "Not yet"}</p>
                {r.queued && <p className="text-white/50">Queued new opportunity: {r.queued}</p>}
              </div>
            )}

            {cur.id === "provision" && (
              <>
                <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Vercel project name" className={inputCls} />
                {r?.project && <p className="text-sm text-lime-400">Provisioned: {r.project.name} ({r.project.id})</p>}
              </>
            )}

            {cur.id === "launch" && r && !err && !r._done && (
              r.launched
                ? <p className="text-sm text-lime-400">Launched → {r.vercel_project?.name} ({r.vercel_project?.id})</p>
                : <p className="text-sm text-white/50">{r.reason || "Nothing launch-ready — run Build + Validate first."}</p>
            )}

            {cur.id === "validate" && r && !err && !r._done && (
              <div className="text-sm space-y-1">
                <p><span className="text-white/50">Ready to launch: </span>{r.ready_to_launch ? "Yes" : "Not yet"}</p>
                <p className="text-white/50">{r.resolution}</p>
              </div>
            )}

            {cur.id === "compound" && r && !err && !r._done && (
              <p className="text-sm text-lime-400">Brain compounded. {r.resolution || ""}</p>
            )}

            {cur.id === "repeat" && (
              <p className="text-sm text-white/50">Press “Reset & loop” to clear the timeline and run the next opportunity from Discover.</p>
            )}

            {err && <div className="flex items-center gap-2 text-sm text-rose-400"><AlertTriangle className="w-4 h-4" /> {err}</div>}
          </StepPanel>
        </div>
      </main>
    </div>
  );
}