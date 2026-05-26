"use client";

import { CheckCircle2, Loader2, XCircle, Activity, Circle } from "lucide-react";
import type { AioReleaseId } from "@/lib/types";
import type { SiteStatus } from "@/lib/upgrade";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Props {
  siteName: string;
  status: SiteStatus;
  /** Release-kind only. When null, the row renders a generic change label instead. */
  fromReleaseId: AioReleaseId | null;
  /** Release-kind only. When null, the row renders a generic change label instead. */
  toReleaseId: AioReleaseId | null;
  /** Generic change label rendered when from/to release are null (app/arm kinds). */
  changeLabel?: string;
  /** 0..1 — only meaningful while status === "upgrading". */
  progress: number;
}

/**
 * Primitives #3 (per-site state) + #4 (verifying sub-state) per ring row.
 * Five terminal/intermediate states match lib/upgrade.ts SiteStatus exactly.
 */
export function SiteRolloutRow({
  siteName,
  status,
  fromReleaseId,
  toReleaseId,
  changeLabel,
  progress,
}: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1.25rem,1fr,10rem,9rem] items-center gap-2 border-b border-border-subtle px-3 py-1.5 last:border-b-0",
        status === "pending" && "opacity-60",
      )}
    >
      <StatusIcon status={status} />
      <span className="truncate font-mono text-[12px] text-fg" title={siteName}>
        {siteName}
      </span>
      {fromReleaseId && toReleaseId ? (
        <span className="flex items-center gap-1 text-[11px] text-fg-muted">
          <Badge tone="neutral" className="font-mono">{fromReleaseId}</Badge>
          <span className="text-fg-subtle">→</span>
          <Badge tone={status === "healthy" ? "success" : "accent"} className="font-mono">
            {toReleaseId}
          </Badge>
        </span>
      ) : (
        <span
          className="truncate text-[11px] text-fg-muted"
          title={changeLabel}
        >
          {changeLabel ?? "—"}
        </span>
      )}
      <StatusCell status={status} progress={progress} />
    </div>
  );
}

function StatusIcon({ status }: { status: SiteStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="h-3.5 w-3.5 text-fg-subtle" />;
    case "upgrading":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />;
    case "verifying":
      return <Activity className="h-3.5 w-3.5 text-warning-fg" />;
    case "healthy":
      return <CheckCircle2 className="h-3.5 w-3.5 text-success-fg" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-danger-fg" />;
  }
}

function StatusCell({ status, progress }: { status: SiteStatus; progress: number }) {
  if (status === "upgrading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
          <div
            className="h-full bg-accent transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="w-16 shrink-0 text-right text-[11px] font-medium text-fg-muted">
          Upgrading…
        </span>
      </div>
    );
  }
  const label =
    status === "pending"
      ? "Pending"
      : status === "verifying"
        ? "Verifying…"
        : status === "healthy"
          ? "Healthy"
          : "Failed";
  const tone: React.ComponentProps<typeof Badge>["tone"] =
    status === "healthy"
      ? "success"
      : status === "failed"
        ? "danger"
        : status === "verifying"
          ? "warning"
          : "neutral";
  return (
    <div className="text-right">
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}
