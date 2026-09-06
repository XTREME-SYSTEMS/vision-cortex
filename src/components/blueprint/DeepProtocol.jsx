import React from 'react';
import { GitBranch, ArrowRight, FileText, CheckCircle2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'vision', label: 'Vision', icon: 'Eye', desc: 'The intent — machine-readable, not prose' },
  { id: 'strategy', label: 'Strategy', icon: 'GitBranch', desc: 'The state machine plan — states, slots, gates' },
  { id: 'document', label: 'Document', icon: 'FileText', desc: 'The compiled spec — this IS the SOP' },
  { id: 'implement', label: 'Implement', icon: 'Cpu', desc: 'The executor runs the spec deterministically' },
  { id: 'build', label: 'Build', icon: 'Wrench', desc: 'The compilation graph is generated & validated' },
  { id: 'validate', label: 'Validate', icon: 'CheckCircle2', desc: 'The ScoreRecord gate — must pass or cycle fails' },
];

const ICONS = { Eye: GitBranch, GitBranch, FileText, Cpu, Wrench: Cpu, CheckCircle2 };

export default function DeepProtocol() {
  return (
    <div className="space-y-4">
      {/* DEEP Definition */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-500" /> What DEEP Is
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          <strong className="text-foreground">Deterministic Engineering Engine Pipeline.</strong> Every system operation is a
          finite state machine defined as a versioned JSON spec — not prose. Each state has entry conditions,
          allowed transitions, validation gates, and exit conditions. There is no implied behavior.
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />LLMs run only inside declared slots with strict input/output schemas</li>
          <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />LLM output is never trusted raw — a deterministic validator rejects anything outside schema</li>
          <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />Every output is scored and persisted — a DeepRun record is the proof</li>
          <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />The pipeline is replayable — same input hash + same spec version = same result</li>
        </ul>
      </div>

      {/* The 6-Stage Lifecycle */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> The Evolving Document Lifecycle
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {STAGES.map((stage, i) => {
            const Icon = ICONS[stage.icon] || FileText;
            return (
              <div key={stage.id} className="relative">
                <div className="rounded-lg border border-border/60 bg-card p-2.5 h-full">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground/50">{String(i + 1).padStart(2, '0')}</span>
                    <Icon className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="text-[11px] font-medium">{stage.label}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{stage.desc}</p>
                </div>
                {i < STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/30 absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 hidden md:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SOP Principles */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-sm font-semibold mb-2.5">Standard Operating Procedure — The 7 Deterministic Principles</h3>
        <div className="space-y-1.5">
          {[
            ['Deterministic Core', 'The pipeline is the core. The LLM is a peripheral. The LLM never governs flow.'],
            ['Schema-Validated', 'Every LLM output passes through a deterministic validator. Out-of-schema = rejected.'],
            ['Score-Gated', 'Every run produces an aggregate score 0-1. is_approved is true ONLY at 1.00.'],
            ['Replayable', 'Same input hash + same spec version = same result. Every run is debuggable.'],
            ['Cost-Bounded', 'Each spec declares a credit budget. Runs that exceed it are flagged.'],
            ['Self-Healing', 'Failed gates trigger deterministic repair state machines — not free-form retries.'],
            ['Versioned Evolution', 'The system evolves by versioning state machines, not rewriting prose.'],
          ].map(([title, desc], i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <span className="text-[10px] font-mono font-semibold text-violet-500/60 mt-0.5 shrink-0 w-5">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <span className="font-medium">{title}</span>
                <span className="text-muted-foreground"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}