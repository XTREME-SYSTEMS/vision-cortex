import React from 'react';
import { Cpu, Zap, Shield, Database, Network, Layers, GitBranch, Brain, Lock, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRINCIPLES = [
  {
    icon: Cpu,
    title: 'Thin Agent / Fat Platform',
    color: 'text-violet-500',
    bg: 'bg-violet-500/8',
    border: 'border-violet-500/30',
    principle: 'Agents are stateless, ephemeral workers under 150 lines. The platform holds the knowledge, hooks, and orchestration. ~2,700 tokens per spawn, not 24,000.',
    source: 'Praetorian',
  },
  {
    icon: Layers,
    title: 'Artifact-Driven Determinism',
    color: 'text-blue-500',
    bg: 'bg-blue-500/8',
    border: 'border-blue-500/30',
    principle: 'Human validates success, system captures path, converts to deterministic artifacts (code + docs + rules), stores in skill store. Next time: retrieve + execute, no replanning.',
    source: 'Kong',
  },
  {
    icon: GitBranch,
    title: 'State Machines, Not Agent Loops',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/30',
    principle: 'O(log n) bounded traversal. Bit-exact replay via checkpoints. Governance thresholds. LLM produces inputs to transition function, not improvises actions.',
    source: 'Q-MDP Framework',
  },
  {
    icon: Brain,
    title: 'Context Engineering',
    color: 'text-purple-500',
    bg: 'bg-purple-500/8',
    border: 'border-purple-500/30',
    principle: 'Minimal prompt first. Few-shot with canonical examples. Progressive disclosure. Compaction gates at over 85% context = hard block. Token usage explains 80% of performance variance.',
    source: 'Anthropic',
  },
  {
    icon: Database,
    title: '7-Type Memory Architecture',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/8',
    border: 'border-cyan-500/30',
    principle: 'In-context, semantic, episodic, procedural, external, parametric, prospective. 5th enterprise type: organizational context memory = governed definitions + lineage + policy enforcement.',
    source: 'CoALA (Princeton)',
  },
  {
    icon: Lock,
    title: 'Zero-Trust Agent Security',
    color: 'text-rose-500',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/30',
    principle: 'Never trust, always verify. One agent = one identity = one credential. No blanket admin access. Continuous auth at every gate. Runtime authority enforces at execution time.',
    source: 'Anthropic Zero Trust',
  },
  {
    icon: Network,
    title: 'MCP + A2A Protocols',
    color: 'text-amber-500',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/30',
    principle: 'MCP standardizes tool/context access. A2A governs peer coordination, negotiation, delegation. 5 patterns: Sequential, Concurrent, Group Chat, Handoff, Magentic.',
    source: 'Multi-Agent Orchestration',
  },
  {
    icon: Gauge,
    title: 'Billion-Scale Vector Fabric',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/8',
    border: 'border-yellow-500/30',
    principle: 'Swappable vector backend (pgvector to Milvus/Qdrant). Real-time event streaming for embeddings. GraphRAG for relationships. The system we don\'t outgrow = swap DB without changing DEEP specs.',
    source: 'Enterprise RAG',
  },
];

const STACK_LAYERS = [
  { layer: '5. Application', desc: 'Thousands of AI agents, Council, War Room, Universal Chat', icon: Brain },
  { layer: '4. Orchestration (DEEP)', desc: 'State machines, gates, LLM slots, skill store — the layer we own', icon: Cpu, highlight: true },
  { layer: '3. Data Intelligence', desc: 'Supabase + pgvector/Milvus, 7-type memory, GraphRAG, real-time RAG', icon: Database },
  { layer: '2. Foundation Models', desc: 'Groq (zero-credit), Gemini (web research), Claude (complex) — swappable', icon: Zap },
  { layer: '1. Hardware / Compute', desc: 'GPU (H100/B200), Vercel serverless, Railway — commodity', icon: Layers },
];

export default function BootstrapArchitecture() {
  return (
    <div className="space-y-4">
      {/* The 8 Proven Principles */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-500" />
          8 Proven Architecture Principles — Researched & Validated
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className={cn('rounded-lg border p-3', p.border, p.bg)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={cn('w-4 h-4', p.color)} />
                  <span className="text-[13px] font-medium">{p.title}</span>
                  <span className="text-[9px] text-muted-foreground/60 ml-auto font-mono">{p.source}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.principle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* The 5-Layer Stack */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          The 5-Layer Enterprise Stack — Built for the Future
        </h3>
        <div className="space-y-1.5">
          {STACK_LAYERS.map((l, i) => {
            const Icon = l.icon;
            return (
              <div
                key={l.layer}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-all',
                  l.highlight ? 'border-violet-500/50 bg-violet-500/10 shadow-sm' : 'border-border/40 bg-card'
                )}
              >
                <span className="text-[10px] font-mono text-muted-foreground/50 w-5">{i + 1}</span>
                <Icon className={cn('w-4 h-4 shrink-0', l.highlight ? 'text-violet-500' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium flex items-center gap-2">
                    {l.layer}
                    {l.highlight && (
                      <span className="text-[9px] font-mono text-violet-500 bg-violet-500/15 px-1.5 py-0.5 rounded">WE OWN THIS</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{l.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The Bootstrap Promise */}
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold">The System We Don't Outgrow</span>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Every layer except orchestration is a swappable commodity. Models, databases, hardware, and deployment platforms will change —
          but the DEEP orchestration layer (state machines, gates, skill store, governance) is the permanent intellectual property.
          When Groq is replaced by a better model, when pgvector becomes Milvus, when Vercel becomes something else — the DEEP specs don't change.
          That's how you build for the future: own the governance, rent everything else.
        </p>
      </div>
    </div>
  );
}