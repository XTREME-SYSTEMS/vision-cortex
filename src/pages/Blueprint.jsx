import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BookOpen, Radar, Layers, Shield, Brain, Zap, Target, Activity, Eye, Cpu, RefreshCw } from 'lucide-react';
import DeepProtocol from '@/components/blueprint/DeepProtocol';
import Governance from '@/components/blueprint/Governance';
import DeepSpecRegistry from '@/components/blueprint/DeepSpecRegistry';
import DeepRunMonitor from '@/components/blueprint/DeepRunMonitor';
import SystemCodex from '@/components/blueprint/SystemCodex';
import BootstrapArchitecture from '@/components/blueprint/BootstrapArchitecture';

const MANDATORY_GUIDELINES = [
  { icon: Target, title: '100% Perfection', desc: 'Every cycle must reach aggregate_score 1.00. is_approved is true ONLY at parity. No exceptions.', color: 'text-violet-500' },
  { icon: Zap, title: 'Cost Efficiency', desc: 'Every spec declares a credit budget. Runs that exceed it are flagged. Free-tier compute prioritized (Groq, Vercel cron, Railway).', color: 'text-amber-500' },
  { icon: Activity, title: 'Mandatory Growth', desc: 'The system must grow every cycle — intelligence compounds, data compounds, capabilities expand.', color: 'text-emerald-500' },
  { icon: Brain, title: 'Self-Learning', desc: 'Every decision is recorded, scored, and fed back. The system learns from every run — deterministically, not from LLM context windows.', color: 'text-blue-500' },
  { icon: RefreshCw, title: 'Self-Healing', desc: 'Failed gates trigger deterministic repair state machines. Problems never become problems — warning signs are identified before failure.', color: 'text-rose-500' },
  { icon: Eye, title: 'Self-Reflecting', desc: 'A reflection state machine audits the audit. The system constantly audits itself and other systems to adjust, learn, and improve.', color: 'text-cyan-500' },
];

const ARCHITECTURE_LAYERS = [
  { id: 'Discover', desc: 'Persistently monitor the world — trends, economics, politics, elite, AI corporations, social media, strategic seed lists', icon: Eye },
  { id: 'Understand', desc: 'Council deliberation, simulation of hundreds of scenarios, strategic analysis on the most sound principles', icon: Brain },
  { id: 'Predict', desc: 'Pre-calculated outcomes choosing the highest probable best outcome — "best" defined by strategic measures, not emotion', icon: Target },
  { id: 'Act', desc: 'Deterministic execution via DEEP state machines — validated, scored, persisted, replayable', icon: Cpu },
];

const SECURITY_POINTS = [
  'Decoy layer — surface entity/secret names look conventional but route to sandbox data',
  'Real data map lives inside DEEP spec registry under non-obvious category IDs',
  'Multiple security points mitigate every attack vector — not a single perimeter',
  'What attackers get is the wrong thing — the real pipeline is gated behind authenticated execution context',
  'Stolen keys alone cannot invoke DEEP state machines — they require execution context',
];

const toBullets = (text) => {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
};

export default function Blueprint() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.MasterPlan.list('-created_date', 1)
      .then((r) => setPlan(r[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        <div>
          <h1 className="font-display text-2xl tracking-tight">The Blueprint</h1>
          <p className="text-xs text-muted-foreground">The Bible — Vision, Architecture, DEEP SOP & Governance. Always referable. Processed on memory for the entire system.</p>
        </div>
      </div>

      {/* Vision */}
      <section className="border border-violet-500/30 bg-violet-500/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radar className="w-4 h-4 text-violet-500" />
          <h2 className="font-display text-lg">The Vision</h2>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading vision...</p>
        ) : (
          <ul className="space-y-1.5">
            {(plan?.vision ? toBullets(plan.vision) : [
              'Vision Cortex is the Brain that persistently monitors the world — trends, economics, politics, the elite, AI corporations, AI systems, top industries, social media, and anything providing insight into history, present, and future.',
              'It operates 24/7 using Vercel, Supabase, Groq, Vercel Gateway, Railway, Drive, and Google Workspace — cost-efficient, cron-driven, parallel, swarm-driven, intelligence and wisdom-driven.',
              'It uses the Council to persistently envision, strategize, plan, document, log, formulate, simulate, and strategize in parallel — using the most strategic and intelligent AI agents.',
              'It uses the cloud browser system to scrape a strategic source and seed list of the most factual, statistically accurate data sources — data that compounds to increase system and agent intelligence.',
              'The ultimate goal: bring humans and AI together as partners. Put the highest, most powerful, user-friendly technology in the hands that need it — not just the elite.',
            ]).map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <span className="flex-1">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Architecture — 4-Layer */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4" />
          <h2 className="font-display text-lg">System Architecture — 4-Layer</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ARCHITECTURE_LAYERS.map((layer, i) => {
            const Icon = layer.icon;
            return (
              <div key={layer.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground/50">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium">{layer.id}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">{layer.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* DEEP Protocol */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-violet-500" />
          <h2 className="font-display text-lg">DEEP — Deterministic Engineering Engine Pipeline</h2>
        </div>
        <DeepProtocol />
      </section>

      {/* Mandatory Guidelines */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4" />
          <h2 className="font-display text-lg">Mandatory Guidelines</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MANDATORY_GUIDELINES.map((g, i) => {
            const Icon = g.icon;
            return (
              <div key={i} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={g.color} />
                  <span className="text-sm font-medium">{g.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">{g.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Governance */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-emerald-500" />
          <h2 className="font-display text-lg">Agent Governance & Etherverse</h2>
        </div>
        <Governance />
      </section>

      {/* Security */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-red-500" />
          <h2 className="font-display text-lg">Security Architecture — The Decoy Principle</h2>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <ul className="space-y-1.5">
            {SECURITY_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span className="flex-1">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bootstrap Architecture — researched enterprise principles */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-violet-500" />
          <h2 className="font-display text-lg">Bootstrap Architecture — Enterprise-Grade Foundation</h2>
        </div>
        <BootstrapArchitecture />
      </section>

      {/* System Codex — all operations as DEEP state machines */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-violet-500" />
          <h2 className="font-display text-lg">System Codex — The Entire System as DEEP State Machines</h2>
        </div>
        <SystemCodex />
      </section>

      {/* Live Monitoring */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" />
          <h2 className="font-display text-lg">Live DEEP Monitoring</h2>
          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <DeepSpecRegistry />
          <DeepRunMonitor />
        </div>
      </section>
    </div>
  );
}