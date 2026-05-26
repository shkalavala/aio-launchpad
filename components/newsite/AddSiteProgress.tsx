"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type DeployPhase =
  | "idle"
  | "validating"
  | "provisioning"
  | "installing"
  | "verifying"
  | "healthy"
  | "failed";

export const PHASES: { id: DeployPhase; label: string; durationMs: number }[] = [
  { id: "validating", label: "Validating manifest", durationMs: 1100 },
  { id: "provisioning", label: "Provisioning resource group + identities", durationMs: 1800 },
  { id: "installing", label: "Installing AIO + extensions on the cluster", durationMs: 3000 },
  { id: "verifying", label: "Verifying broker + dataflow health", durationMs: 1600 },
];

interface Props {
  /** Trigger to (re)run the sequence. Increment to restart. */
  runToken: number;
  onComplete: () => void;
}

/**
 * Mock deploy sequence for Screen 2. Local-only progress driver — does not
 * touch the upgrade slice, which is reserved for the multi-ring rollout flow.
 * On the last phase finishing, fires onComplete (which the page wires up to
 * addPendingSite). Reset by bumping runToken from the parent.
 */
export function AddSiteProgress({ runToken, onComplete }: Props) {
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (runToken === 0) return;
    setPhaseIndex(0);
    setDone(false);
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const step = () => {
      const t = setTimeout(() => {
        if (i + 1 < PHASES.length) {
          i += 1;
          setPhaseIndex(i);
          step();
        } else {
          setDone(true);
          onComplete();
        }
      }, PHASES[i].durationMs);
      timers.push(t);
    };
    step();
    return () => timers.forEach(clearTimeout);
    // onComplete intentionally excluded so a parent re-render doesn't restart the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  if (runToken === 0) return null;

  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">Deploying</h2>
        <Badge tone={done ? "success" : "accent"}>
          {done ? "Healthy" : "In progress"}
        </Badge>
      </header>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {PHASES.map((p, i) => {
          const state: "done" | "active" | "future" =
            i < phaseIndex || done ? "done" : i === phaseIndex ? "active" : "future";
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 border-b border-border-subtle px-3 py-2 last:border-b-0 text-[13px]",
                state === "future" && "opacity-50",
              )}
            >
              <PhaseIcon state={state} />
              <span className={cn("flex-1", state === "active" && "text-fg font-medium")}>
                {p.label}
              </span>
              {state === "done" && (
                <span className="font-mono text-[11px] text-success">ok</span>
              )}
              {state === "active" && (
                <span className="font-mono text-[11px] text-accent">running…</span>
              )}
            </div>
          );
        })}
        {done && (
          <div className="flex items-center gap-2 border-t border-border bg-success-subtle px-3 py-2 text-[13px] text-success-fg">
            <ShieldCheck className="h-4 w-4" />
            <span>Site reachable. Added to the fleet.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function PhaseIcon({ state }: { state: "done" | "active" | "future" }) {
  if (state === "done") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (state === "active") return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
  return <Circle className="h-4 w-4 text-fg-subtle" />;
}

export const TOTAL_DEPLOY_MS = PHASES.reduce((a, p) => a + p.durationMs, 0);

// Re-export icon so a parent can render an "always-on" activity dot without a separate import.
export { Activity as _ActivityIcon };
