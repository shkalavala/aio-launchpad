"use client";

import type { AioReleaseId, FleetSite } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { UPGRADE_TIMING } from "@/lib/upgrade";
import { SiteRolloutRow } from "./SiteRolloutRow";
import { RingGate } from "./RingGate";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

interface Props {
  selectedSites: FleetSite[];
  /** Release-kind only — used for from→to chips in each site row. */
  sourceReleaseBySite: Record<string, AioReleaseId>;
  /** Release-kind only. When null, rows fall back to {changeLabel}. */
  targetReleaseId: AioReleaseId | null;
  /** Shown in each row when targetReleaseId is null (app/arm kinds). */
  changeLabel?: string;
}

/**
 * Primitives #1 + #2 + #4 composed: rings as visible sections, per-site rows
 * inside each ring, and a gate after every completed-but-not-last ring.
 */
export function RolloutProgress({
  selectedSites,
  sourceReleaseBySite,
  targetReleaseId,
  changeLabel,
}: Props) {
  const rings = useAppStore((s) => s.rings);
  const rolloutStatus = useAppStore((s) => s.rolloutStatus);
  const siteStatus = useAppStore((s) => s.siteStatus);
  const currentRingIndex = useAppStore((s) => s.currentRingIndex);
  const elapsed = useAppStore((s) => s._rolloutElapsedMs);
  const siteStartMs = useAppStore((s) => s._siteStartMs);
  const advanceGate = useAppStore((s) => s.advanceGate);
  const rolloutKind = useAppStore((s) => s.rolloutKind);

  // The "script shape" replaces the single-progress-bar SiteRolloutRow with
  // a per-cmdlet status list. Used for script-style rollouts that run a
  // PowerShell sequence over Arc Run Command (see olympus-extension-model.md
  // §3 Tp1+Tp7). aksee-upgrade is the canonical example; raw `script` reuses
  // the same visual.
  const isScriptShape = rolloutKind === "script" || rolloutKind === "aksee-upgrade";

  const siteByName = new Map(selectedSites.map((s) => [s.site.name, s]));

  if (rolloutStatus === "idle" || rings.length === 0) return null;

  return (
    <section id="rollout-progress" className="space-y-3 scroll-mt-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">Rollout progress</h2>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          {rolloutStatus === "completed"
            ? "All rings healthy"
            : `Ring ${Math.min(currentRingIndex + 1, rings.length)} of ${rings.length}`}
        </span>
      </header>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {rings.map((ring, idx) => {
          const ringState = ringPhase(idx, currentRingIndex, rolloutStatus);
          const isActive = ringState === "active";
          const isDone = ringState === "done";

          return (
            <div key={ring.id}>
              <div
                className={cn(
                  "flex items-center gap-2 border-b border-border bg-bg-subtle px-3 py-1.5 text-[12px]",
                  ringState === "future" && "opacity-50",
                )}
              >
                <span className="font-semibold text-fg">
                  <span className="mr-1 text-fg-subtle">{idx + 1}.</span>
                  {ring.name}
                </span>
                <Badge tone="neutral">{ring.siteNames.length} sites</Badge>
                {isActive && rolloutStatus === "running" && (
                  <Badge tone="accent">In progress</Badge>
                )}
                {isActive && rolloutStatus === "paused" && (
                  <Badge tone="warning">Paused</Badge>
                )}
                {isDone && <Badge tone="success">Healthy</Badge>}
                {ringState === "future" && (
                  <span className="text-fg-subtle">Pending earlier rings</span>
                )}
              </div>

              <div>
                {ring.siteNames.map((name) => {
                  const fs = siteByName.get(name);
                  if (!fs) return null;
                  const status = siteStatus[name] ?? "pending";
                  const start = siteStartMs[name] ?? 0;
                  const progress =
                    status === "upgrading"
                      ? Math.min(1, Math.max(0, (elapsed - start) / UPGRADE_TIMING.perSiteMs))
                      : status === "pending"
                        ? 0
                        : 1;
                  if (isScriptShape) {
                    return (
                      <ScriptSiteRow
                        key={name}
                        siteName={name}
                        status={status}
                        progress={progress}
                      />
                    );
                  }
                  return (
                    <SiteRolloutRow
                      key={name}
                      siteName={name}
                      status={status}
                      fromReleaseId={
                        targetReleaseId
                          ? sourceReleaseBySite[name] ?? fs.runtime.resolvedRelease
                          : null
                      }
                      toReleaseId={targetReleaseId}
                      changeLabel={changeLabel}
                      progress={progress}
                    />
                  );
                })}
              </div>

              {isDone &&
                idx < rings.length - 1 &&
                rolloutStatus === "awaiting-gate" &&
                idx === currentRingIndex && (
                  <RingGate
                    justCompletedRingName={ring.name}
                    nextRingName={rings[idx + 1].name}
                    nextRingSiteCount={rings[idx + 1].siteNames.length}
                    onContinue={advanceGate}
                  />
                )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type RingPhase = "done" | "active" | "future";

function ringPhase(
  idx: number,
  currentRingIndex: number,
  status: ReturnType<typeof useAppStore.getState>["rolloutStatus"],
): RingPhase {
  if (status === "completed") return "done";
  if (idx < currentRingIndex) return "done";
  if (idx === currentRingIndex) {
    // After the verify dwell, the active ring flips to awaiting-gate; the ring
    // is visually "done" at that point, gate sits below it.
    if (status === "awaiting-gate") return "done";
    return "active";
  }
  return "future";
}

// ── Script-shape row ────────────────────────────────────────────────────────
//
// Per-site visual for script / aksee-upgrade rollouts. Replaces the single
// progress bar with a three-cmdlet sequence over Arc Run Command:
//   1. Start-AksEdgeUpdate                       (stage update payload)
//   2. Start-AksEdgeControlPlaneUpdate           (with -firstControlPlane $true)
//   3. Start-AksEdgeWorkerNodeUpdate             (workers, last)
// Each cmdlet flips through pending → running → done driven by the same
// site-elapsed clock the bar shape uses (UPGRADE_TIMING.perSiteMs).

const SCRIPT_STEPS = [
  { label: "Start-AksEdgeUpdate", detail: "stage update payload" },
  {
    label: "Start-AksEdgeControlPlaneUpdate",
    detail: "-firstControlPlane $true",
  },
  { label: "Start-AksEdgeWorkerNodeUpdate", detail: "worker nodes" },
];

type ScriptStepState = "pending" | "running" | "done";

function ScriptSiteRow({
  siteName,
  status,
  progress,
}: {
  siteName: string;
  status: ReturnType<typeof useAppStore.getState>["siteStatus"][string];
  progress: number;
}) {
  // Distribute the 0..1 site progress across the three sub-steps. Anything
  // upstream of `pending` keeps all sub-steps idle; once `healthy/failed`
  // they all show as done/failed.
  const stepStates: ScriptStepState[] = SCRIPT_STEPS.map((_, i) => {
    if (status === "pending") return "pending";
    if (status === "healthy" || status === "failed") return "done";
    // upgrading: split [0, 1] into thirds
    const lo = i / SCRIPT_STEPS.length;
    const hi = (i + 1) / SCRIPT_STEPS.length;
    if (progress >= hi) return "done";
    if (progress > lo) return "running";
    return "pending";
  });

  return (
    <div className="border-t border-border-subtle px-3 py-2 text-[12px]">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-fg">{siteName}</span>
        {status === "healthy" && <Badge tone="success">Completed</Badge>}
        {status === "failed" && <Badge tone="danger">Failed</Badge>}
        {status === "upgrading" && <Badge tone="accent">Running</Badge>}
        {status === "pending" && <Badge tone="neutral">Queued</Badge>}
      </div>
      <ol className="ml-2 space-y-0.5">
        {SCRIPT_STEPS.map((step, i) => {
          const s = stepStates[i];
          const Icon =
            s === "done" ? CheckCircle2 : s === "running" ? Loader2 : Circle;
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-2",
                s === "pending" ? "text-fg-subtle" : "text-fg",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  s === "done" && "text-success-fg",
                  s === "running" && "animate-spin text-accent",
                  s === "pending" && "text-fg-subtle",
                )}
              />
              <span className="font-mono text-[11px]">{step.label}</span>
              <span className="text-[11px] text-fg-subtle">— {step.detail}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
