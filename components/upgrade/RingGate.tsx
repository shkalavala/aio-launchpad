"use client";

import { ArrowRightCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  justCompletedRingName: string;
  nextRingName: string;
  nextRingSiteCount: number;
  onContinue: () => void;
}

/**
 * Primitive #2 — Gate. Explicit pause-point between rings. The whole point of
 * a gate is that nothing advances automatically: a human has to look at the
 * just-completed ring's health and decide to continue.
 */
export function RingGate({
  justCompletedRingName,
  nextRingName,
  nextRingSiteCount,
  onContinue,
}: Props) {
  return (
    <div className="flex items-center gap-3 border-y-2 border-dashed border-accent/40 bg-accent-subtle/40 px-3 py-2">
      <ShieldCheck className="h-4 w-4 shrink-0 text-success-fg" />
      <div className="flex min-w-0 flex-col text-[12px]">
        <span className="font-semibold text-fg">
          Gate — {justCompletedRingName} verified healthy
        </span>
        <span className="text-fg-muted">
          Next: {nextRingName} ({nextRingSiteCount} site{nextRingSiteCount === 1 ? "" : "s"}).
          Review before continuing.
        </span>
      </div>
      <Button variant="primary" size="sm" onClick={onContinue} className="ml-auto">
        <ArrowRightCircle className="h-3.5 w-3.5" />
        Continue to {nextRingName}
      </Button>
    </div>
  );
}
