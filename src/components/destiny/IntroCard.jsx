import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Centered popup that opens when a step begins — explains the purpose
// and what's entailed, then dismisses to reveal the step content.
export default function IntroCard({ step, open, onBegin, running }) {
  const Icon = step?.icon;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onBegin()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
            )}
            <div>
              <DialogTitle className="font-display text-2xl tracking-tight">{step?.label}</DialogTitle>
              <DialogDescription className="text-[11px] uppercase tracking-[0.2em] mt-0.5">
                Step {step?.index + 1} of {step?.total}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-[15px] leading-relaxed">{step?.purpose}</p>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">What happens here</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{step?.summary}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onBegin} className="w-full rounded-full h-11" disabled={running}>
            Let's begin <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}