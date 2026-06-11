"use client";

import type { FleetSite } from "@/lib/types";
import { observedHealth, OBSERVED_SOURCES } from "@/lib/v2/observedState";
import { observedHealthMeta } from "@/lib/v2/format";
import { useObservedSource } from "@/store/useObservedSource";
import { cn } from "@/lib/utils";

/**
 * Health pip for a site, rendered through the active observed-state source so
 * it never implies live cluster knowledge we don't have. When the source can't
 * see the cluster it shows a hollow "Not connected" pip; when simulated it
 * shows the colored dot and a tooltip declaring the provenance.
 */
export function HealthDot({
  fs,
  withLabel = false,
  className,
}: {
  fs: FleetSite;
  withLabel?: boolean;
  className?: string;
}) {
  const sourceId = useObservedSource((s) => s.sourceId);
  const source = OBSERVED_SOURCES[sourceId];
  const meta = observedHealthMeta(observedHealth(fs, sourceId));

  const title = meta.unknown
    ? source.note
    : `${meta.label} · ${source.label} — ${source.note}`;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={title}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
      {withLabel && (
        <span className={cn(meta.unknown ? "text-fg-subtle" : "text-fg-muted")}>{meta.label}</span>
      )}
    </span>
  );
}
