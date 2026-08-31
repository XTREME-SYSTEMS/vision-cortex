import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';

export default function StepPanel({ step, children, onRun, onNext, running, canRun, canNext, isLast }) {
  const Icon = step.icon;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <h2 className="font-display text-xl">{step.label}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{step.desc}</p>
      <div className="space-y-4">{children}</div>
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        <Button onClick={onRun} disabled={running || !canRun} size="sm">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {isLast ? 'Reset & loop' : 'Run step'}
        </Button>
        {!isLast && (
          <Button onClick={onNext} disabled={!canNext} variant="outline" size="sm">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}