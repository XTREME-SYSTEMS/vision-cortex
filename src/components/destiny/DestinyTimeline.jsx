import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Clean, token-based horizontal step timeline pinned to the top.
export default function DestinyTimeline({ steps, current, completed, onJump }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-idx="${current}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [current]);

  return (
    <div className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-16 z-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex items-center justify-between sm:hidden py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Step {Math.max(current + 1, 1)} of {steps.length}
          </span>
          <span className="truncate pl-2 text-[11px] font-medium text-muted-foreground">{steps[current]?.label}</span>
        </div>
        <div ref={scrollRef} className="flex items-center gap-1 overflow-x-auto py-3 no-scrollbar sm:gap-1.5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isCurrent = i === current;
            const isDone = completed.has(i);
            return (
              <div key={step.id} className="flex items-center" data-idx={i}>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  className="group flex cursor-pointer flex-col items-center gap-1.5 shrink-0"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground scale-110"
                        : isDone
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span
                    className={cn(
                      "hidden whitespace-nowrap text-[11px] font-medium sm:block",
                      isCurrent ? "text-foreground" : isDone ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div className={cn("mx-1 h-0.5 w-4 shrink-0 rounded-full sm:w-6", i < current ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}