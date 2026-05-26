// Fleet-level ring assignment. Promotes the per-rollout ring concept to a
// first-class fleet artifact: every installed site has a default ring
// (Canary / Wave 1 / Wave 2) derived from the active named strategy. The
// /rollout planner re-uses this same strategy against the selected sites.
//
// Vocabulary discipline (persona-map.md §5): canary, wave, ring, strategy.

import type { FleetSite } from "./types";
import { planRollout } from "./upgrade";
import type { RingStrategy } from "./fixtures/strategies";

export type RingLabel = "Canary" | "Wave 1" | "Wave 2";

/**
 * Apply a strategy to the entire (installed) fleet to label each site with
 * the ring it would land in if you were rolling out to everyone. Used by
 * /fleet (Ring column) and /rings (browse view).
 */
export function getFleetRingAssignment(
  fleet: FleetSite[],
  strategy: RingStrategy,
): Record<string, RingLabel> {
  const installed = fleet.filter((f) => f.runtime.aioInstalled !== false);
  const rings = planRollout(installed, {
    canarySize: strategy.canarySize,
    waveCount: strategy.waveCount,
  });
  const out: Record<string, RingLabel> = {};
  for (const r of rings) {
    const label = r.name as RingLabel;
    for (const n of r.siteNames) out[n] = label;
  }
  return out;
}

export function ringTone(label: RingLabel | undefined): "accent" | "warning" | "neutral" {
  if (label === "Canary") return "accent";
  if (label === "Wave 1") return "warning";
  return "neutral";
}
