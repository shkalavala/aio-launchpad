"use client";

import { Activity, CloudOff } from "lucide-react";
import { OBSERVED_SOURCES, type ObservedSourceId } from "@/lib/v2/observedState";
import { useObservedSource } from "@/store/useObservedSource";
import { cn } from "@/lib/utils";

const ORDER: ObservedSourceId[] = ["simulated", "azure"];

/**
 * Compact toggle for the observed-state source (Simulated ↔ Azure). Makes the
 * provenance of health/drift explicit and switchable so synthesized telemetry
 * is never mistaken for live cluster truth.
 */
export function TelemetrySourceToggle({ className }: { className?: string }) {
  const sourceId = useObservedSource((s) => s.sourceId);
  const setSourceId = useObservedSource((s) => s.setSourceId);
  const active = OBSERVED_SOURCES[sourceId];

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      title={active.note}
    >
      <span className="text-[11px] text-fg-subtle">Telemetry</span>
      <div className="inline-flex items-center rounded-full border border-border bg-surface p-0.5">
        {ORDER.map((id) => {
          const s = OBSERVED_SOURCES[id];
          const selected = id === sourceId;
          const Icon = id === "simulated" ? Activity : CloudOff;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSourceId(id)}
              aria-pressed={selected}
              title={s.note}
              className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] transition-colors",
                selected
                  ? id === "azure"
                    ? "bg-bg-subtle text-fg-muted"
                    : "bg-accent text-accent-fg"
                  : "text-fg-subtle hover:text-fg",
              )}
            >
              <Icon className="h-3 w-3" />
              {s.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
