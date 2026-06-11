"use client";

import type { FleetSite, HealthStatus } from "@/lib/types";

/**
 * Observed state = facts about what is ACTUALLY running on a site's cluster
 * (health, last-applied, drift vs the cluster). Launchpad reads only the git
 * repo (DESIRED state); it has no cluster connection. So every "observed"
 * datum has to declare where it came from.
 *
 * Two sources exist today:
 *
 * - "simulated" — deterministic, repo-derived health for demos. It is NOT read
 *   from any cluster. Surfaces that show it must mark it as simulated so nobody
 *   mistakes it for live telemetry.
 * - "azure"     — live Arc/ARM observed state. The reader isn't wired yet, so
 *   this source returns nothing ("Not connected"). When someone implements the
 *   Azure Resource Graph + Arc reader, every observed surface lights up at once
 *   because they all flow through this one abstraction.
 */
export type ObservedSourceId = "simulated" | "azure";

export interface ObservedSourceMeta {
  id: ObservedSourceId;
  /** Full label, e.g. "Simulated telemetry". */
  label: string;
  /** Compact label for pills/badges, e.g. "Simulated". */
  short: string;
  /** Whether this source can currently return observed facts. */
  connected: boolean;
  /** One-line provenance explanation surfaced in tooltips/notes. */
  note: string;
}

export const OBSERVED_SOURCES: Record<ObservedSourceId, ObservedSourceMeta> = {
  simulated: {
    id: "simulated",
    label: "Simulated telemetry",
    short: "Simulated",
    connected: true,
    note: "Health is deterministically simulated from the repo — not read from your clusters. Connect Azure Arc for live observed state.",
  },
  azure: {
    id: "azure",
    label: "Azure Arc (live)",
    short: "Azure",
    connected: false,
    note: "Live cluster health and drift require an Azure Arc connection, which isn't wired up yet. No observed state is available.",
  },
};

export interface ObservedHealth {
  /** "value" when the source returned health; "unknown" when not connected. */
  kind: "value" | "unknown";
  health?: HealthStatus;
}

/** Resolve a site's observed health under the active source. */
export function observedHealth(fs: FleetSite, source: ObservedSourceId): ObservedHealth {
  if (!OBSERVED_SOURCES[source].connected) return { kind: "unknown" };
  return { kind: "value", health: fs.runtime.health };
}

/** Whether observed health/drift is available at all under the active source. */
export function observedAvailable(source: ObservedSourceId): boolean {
  return OBSERVED_SOURCES[source].connected;
}
