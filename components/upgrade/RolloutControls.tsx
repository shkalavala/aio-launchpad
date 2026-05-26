"use client";

import { Pause, Play, Square } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Primitive #3 (operator-level) — persistent Pause / Resume / Cancel.
 *
 * NOTE: No Rollback button, ever. Per screen-recommendation.md §2.3:
 * rollback-safe AIO upgrades don't exist today (M365 pain #3).
 * Launchpad's contribution is staged *safety*, not rollback.
 */
export function RolloutControls() {
  const status = useAppStore((s) => s.rolloutStatus);
  const pause = useAppStore((s) => s.pauseRollout);
  const resume = useAppStore((s) => s.resumeRollout);
  const cancel = useAppStore((s) => s.cancelRollout);

  if (status === "idle") return null;

  const jumpToProgress = () => {
    document.getElementById("rollout-progress")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
      <button
        type="button"
        onClick={jumpToProgress}
        title="Jump to Rollout progress"
        className="inline-flex items-center rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <StatusBadge status={status} />
      </button>
      <span className="ml-auto flex items-center gap-1.5">
        {status === "running" && (
          <Button variant="default" size="sm" onClick={pause}>
            <Pause className="h-3.5 w-3.5" />
            Pause rollout
          </Button>
        )}
        {status === "paused" && (
          <Button variant="primary" size="sm" onClick={resume}>
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}
        {(status === "running" || status === "paused" || status === "awaiting-gate") && (
          <Button variant="ghost" size="sm" onClick={cancel}>
            <Square className="h-3.5 w-3.5" />
            Cancel rollout
          </Button>
        )}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof useAppStore.getState>["rolloutStatus"] }) {
  switch (status) {
    case "running":
      return <Badge tone="accent">Rollout running</Badge>;
    case "paused":
      return <Badge tone="warning">Paused</Badge>;
    case "awaiting-gate":
      return <Badge tone="warning">Awaiting gate</Badge>;
    case "completed":
      return <Badge tone="success">Completed</Badge>;
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    default:
      return null;
  }
}
