import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Telescope, Microscope, Gavel, ListTodo, Hammer, Server, Rocket, ShieldCheck, Brain, RefreshCw, AlertTriangle } from 'lucide-react';
import Timeline from '@/components/build/Timeline';
import StepPanel from '@/components/build/StepPanel';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { money } from '@/components/ideas/format';

const STEPS = [
  { id: 'discover', label: 'Discover', icon: Telescope, desc: 'Input your vision. The system scrapes the web and uses the LLM to surface 10 opportunities.' },
  { id: 'analyze', label: 'Analyze', icon: Microscope, desc: 'The Council debates the top opportunity — risks, moat, and viability.' },
  { id: 'decide', label: 'Decide', icon: Gavel, desc: 'Generate the full investor-grade blueprint with cost, revenue, and timeline.' },
  { id: 'queue', label: 'Queue', icon: ListTodo, desc: 'Add the chosen build to the pipeline queue.' },
  { id: 'build', label: 'Build', icon: Hammer, desc: 'The Council enhances the build and checks launch-readiness.' },
  { id: 'provision', label: 'Provision', icon: Server, desc: 'Provision a Vercel project for the build.' },
  { id: 'launch', label: 'Launch', icon: Rocket, desc: 'Launch the build to production.' },
  { id: 'validate', label: 'Validate', icon: ShieldCheck, desc: 'Council validation gate — is it ready to run unattended?' },
  { id: 'compound', label: 'Compound', icon: Brain, desc: 'Extract a doctrine and optimize the brain.' },
  { id: 'repeat', label: 'Repeat', icon: RefreshCw, desc: 'Loop back to discover the next opportunity.' },
];

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'vision-build';
const inputCls = 'bg-zinc-900 border-white/10 text-white placeholder:text-white/30';

export default function Build() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(new Set());
  const [agentIds, setAgentIds] = useState([]);
  const [vision, setVision] = useState('');
  const [prompt, setPrompt] = useState('');
  const [focus, setFocus] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [projName, setProjName] = useState('');
  const [ctx, setCtx] = useState({});
  const [res, setRes] = useState({});

  useEffect(() => {
    base44.entities.AgentProfile.list('order', 50)
      .then((a) => setAgentIds(a.filter((x) => x.status !== 'paused' && x.status !== 'error').map((x) => x.id)))
      .catch(() => {});
    base44.entities.Doctrine.filter({ category: 'leadership' }, '-created_date', 20).then((rows) => {
      const v = rows.find((r) => /vision statement/i.test(r.topic || ''));
      if (v) setVision(v.insight || '');
    }).catch(() => {});
  }, []);

  const cur = STEPS[step];

  const run = async () => {
    if (cur.id === 'repeat') {
      setStep(0); setCompleted(new Set()); setCtx({}); setRes({}); return;
    }
    setRunning(true);
    try {
      let out;
      if (cur.id === 'discover') {
        out = await base44.functions.invoke('nightlyPipelinePrep', { vision });
        const top = out.pipelines?.[0];
        setCtx((c) => ({ ...c, topIdea: top || null, pipelines: out.pipelines, simulation: out.simulation }));
        setPrompt((p) => p || (top ? `Analyze ${top.title} for viability, risks, and moat.` : 'Analyze the top opportunity.'));
        setFocus((f) => f || (top ? top.title : ''));
      } else if (cur.id === 'analyze') {
        out = await base44.functions.invoke('agentDebate', { prompt, agentIds, webSearch: true });
        setCtx((c) => ({ ...c, debate: out }));
      } else if (cur.id === 'decide') {
        out = await base44.functions.invoke('councilBlueprint', { focus });
        setCtx((c) => ({ ...c, blueprint: out.idea }));
        setQTitle(out.idea?.title || '');
        setProjName(slug(out.idea?.title));
      } else if (cur.id === 'queue') {
        out = await base44.entities.BuildQueue.create({ title: qTitle || ctx.blueprint?.title || 'Untitled build', idea_id: ctx.blueprint?.id || '', stage: 'queued', source: 'timeline', priority: 3 });
        setCtx((c) => ({ ...c, queueItem: out }));
      } else if (cur.id === 'build') {
        out = await base44.functions.invoke('pipelineOrchestrator', {});
        setCtx((c) => ({ ...c, build: out }));
      } else if (cur.id === 'provision') {
        out = await base44.functions.invoke('provisionVercel', { mode: 'create', name: projName || slug(ctx.blueprint?.title) });
        setCtx((c) => ({ ...c, vercel: out.project }));
      } else if (cur.id === 'launch') {
        out = await base44.functions.invoke('launchPipelineBuild', { id: ctx.queueItem?.id });
        setCtx((c) => ({ ...c, launch: out }));
      } else if (cur.id === 'validate') {
        out = await base44.functions.invoke('pipelineOrchestrator', {});
        setCtx((c) => ({ ...c, validation: out }));
      } else if (cur.id === 'compound') {
        out = await base44.functions.invoke('councilCompound', {});
        setCtx((c) => ({ ...c, doctrine: out }));
      }
      setRes((r) => ({ ...r, [cur.id]: out }));
      setCompleted((s) => new Set(s).add(step));
    } catch (e) {
      setRes((r) => ({ ...r, [cur.id]: { error: e.message || String(e) } }));
    }
    setRunning(false);
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const jump = (i) => setStep(i);

  const canRun = (() => {
    if (cur.id === 'analyze') return !!(prompt && agentIds.length);
    if (cur.id === 'decide') return !!focus;
    if (cur.id === 'queue') return !!ctx.blueprint;
    if (cur.id === 'launch') return !!ctx.queueItem;
    return true;
  })();

  const r = res[cur.id];
  const err = r?.error;

  return (
    <div className="-mx-5 -my-10 px-5 py-10 min-h-[calc(100vh-4rem)] bg-zinc-950 text-white space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-white">Build Studio</h1>
        <p className="text-sm text-white/50">Operate the full autonomous pipeline step by step — each step runs the real backend scrapers, Council, and generators.</p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10">
        <Timeline steps={STEPS} current={step} completed={completed} onJump={jump} />
      </div>

      <StepPanel step={cur} running={running} canRun={canRun} canNext={completed.has(step)} isLast={step === STEPS.length - 1} onRun={run} onNext={next}>
        {cur.id === 'discover' && (
          <>
            <Textarea value={vision} onChange={(e) => setVision(e.target.value)} placeholder="Your vision / ideas — what do you want the system to build?" rows={4} className={`resize-none ${inputCls}`} />
            {r && !err && (
              <div className="space-y-1">
                <p className="text-xs text-lime-400">Highest: {r.simulation?.highest_return?.title || '—'} · Fastest: {r.simulation?.fastest_return?.title || '—'} · Best: {r.simulation?.best_balance || '—'}</p>
                {(r.pipelines || []).map((p, i) => (<div key={p.id} className="text-sm py-1 border-b border-white/10 last:border-0"><span className="text-white/40">{i + 1}.</span> {p.title}</div>))}
              </div>
            )}
          </>
        )}

        {cur.id === 'analyze' && (
          <>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Debate prompt" className={inputCls} />
            {agentIds.length === 0 && <p className="text-xs text-white/40">No active agents — add agents on the Agents page first.</p>}
            {r && !err && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {(r.transcript || []).map((t, i) => (<div key={i} className="text-sm leading-snug"><span className="font-medium text-white">{t.author}: </span><span className="text-white/60">{t.content}</span></div>))}
              </div>
            )}
          </>
        )}

        {cur.id === 'decide' && (
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

        {cur.id === 'queue' && (
          <>
            <Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="Build title" className={inputCls} />
            {r?.id && <p className="text-sm text-lime-400">Queued — stage: {r.stage}</p>}
          </>
        )}

        {cur.id === 'build' && r && !err && (
          <div className="space-y-1 text-sm">
            <p><span className="text-white/50">Resolution: </span>{r.resolution}</p>
            <p><span className="text-white/50">Ready to launch: </span>{r.ready_to_launch ? 'Yes' : 'Not yet'}</p>
            {r.queued && <p className="text-white/50">Queued new opportunity: {r.queued}</p>}
          </div>
        )}

        {cur.id === 'provision' && (
          <>
            <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Vercel project name" className={inputCls} />
            {r?.project && <p className="text-sm text-lime-400">Provisioned: {r.project.name} ({r.project.id})</p>}
          </>
        )}

        {cur.id === 'launch' && r && !err && (
          r.launched
            ? <p className="text-sm text-lime-400">Launched → {r.vercel_project?.name} ({r.vercel_project?.id})</p>
            : <p className="text-sm text-white/50">{r.reason || 'Nothing launch-ready — run Build + Validate first.'}</p>
        )}

        {cur.id === 'validate' && r && !err && (
          <div className="text-sm space-y-1">
            <p><span className="text-white/50">Ready to launch: </span>{r.ready_to_launch ? 'Yes' : 'Not yet'}</p>
            <p className="text-white/50">{r.resolution}</p>
          </div>
        )}

        {cur.id === 'compound' && r && !err && (
          <p className="text-sm text-lime-400">Brain compounded. {r.resolution || ''}</p>
        )}

        {cur.id === 'repeat' && (
          <p className="text-sm text-white/50">Press “Reset & loop” to clear the timeline and run the next opportunity from Discover.</p>
        )}

        {err && <div className="flex items-center gap-2 text-sm text-rose-400"><AlertTriangle className="w-4 h-4" /> {err}</div>}
      </StepPanel>
    </div>
  );
}