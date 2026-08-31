import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

// Dark zinc step panel matching the AutoBuilder OS console.
export default function StepPanel({ step, children, onRun, onNext, running, canRun, canNext, isLast }) {
  const Icon = step.icon;
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-white">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-lime-400" />
        <h2 className="font-display text-xl text-white">{step.label}</h2>
      </div>
      <p className="text-sm text-white/50 mb-5">{step.desc}</p>
      <div className="space-y-4">{children}</div>
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
        <button onClick={onRun} disabled={running || !canRun}
          className="inline-flex items-center gap-2 rounded-md bg-lime-400 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-300 disabled:opacity-50">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {isLast ? 'Reset & loop' : 'Run step'}
        </button>
        {!isLast && (
          <button onClick={onNext} disabled={!canNext}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}