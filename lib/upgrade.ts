// Screen 3 — In-place AIO upgrade state machine. Pure module, no React.
//
// Implements the five upgrade-safety primitives that day2-reality.md §3.3
// names as missing from both `az iot ops upgrade` and Scale Kit v1.0.0b4:
//   1. Rings        — staged rollout buckets (canary -> wave 1 -> wave 2)
//   2. Gates        — explicit "continue" pause between rings
//   3. Pause/Resume — operator halts an in-flight rollout
//   4. Health verify — transient per-site sub-state between rings
//   5. Blast-radius preview — computed pre-deploy summary (lives in BlastRadiusPanel)
//
// Vocabulary discipline (persona-map.md §5): manifest, release pin, ring,
// blast radius, AIO version, site, selector. Never: rollback, component-version,
// helm, kubectl, CR.

import type { AioReleaseId, FleetSite } from "./types";

export type SiteStatus =
  | "pending"
  | "upgrading"
  | "verifying"
  | "healthy"
  | "failed";

export type RolloutStatus =
  | "idle"
  | "running"
  | "paused"
  | "awaiting-gate"
  | "completed"
  | "failed";

export interface Ring {
  id: string;
  name: string;
  siteNames: string[];
}

export interface PlanRolloutOpts {
  canarySize?: number; // default 1
  waveCount?: 2 | 3; // default 3 (canary + wave 1 + wave 2)
}

/**
 * Plan a multi-ring rollout from a flat list of selected sites.
 *
 * Default shape: 1 canary -> ~1/3 wave 1 -> remainder wave 2.
 * Deterministic ordering: dev sites canary first (lower blast radius),
 * then prod sites sorted by name. Mirrors how customers actually stage.
 */
export function planRollout(
  selectedSites: FleetSite[],
  opts: PlanRolloutOpts = {},
): Ring[] {
  const canarySize = Math.max(1, opts.canarySize ?? 1);
  const waveCount = opts.waveCount ?? 3;

  if (selectedSites.length === 0) return [];

  // Sort: dev first, then by name. Dev = lower blast radius, natural canary.
  const ordered = [...selectedSites].sort((a, b) => {
    if (a.runtime.environment !== b.runtime.environment) {
      return a.runtime.environment === "dev" ? -1 : 1;
    }
    return a.site.name.localeCompare(b.site.name);
  });

  const names = ordered.map((s) => s.site.name);

  if (waveCount === 2 || names.length <= canarySize) {
    return [
      { id: "ring-canary", name: "Canary", siteNames: names.slice(0, canarySize) },
      ...(names.length > canarySize
        ? [{ id: "ring-wave-1", name: "Wave 1", siteNames: names.slice(canarySize) }]
        : []),
    ];
  }

  const canary = names.slice(0, canarySize);
  const remaining = names.slice(canarySize);
  const wave1Size = Math.max(1, Math.ceil(remaining.length / 2));
  const wave1 = remaining.slice(0, wave1Size);
  const wave2 = remaining.slice(wave1Size);

  const rings: Ring[] = [
    { id: "ring-canary", name: "Canary", siteNames: canary },
    { id: "ring-wave-1", name: "Wave 1", siteNames: wave1 },
  ];
  if (wave2.length > 0) {
    rings.push({ id: "ring-wave-2", name: "Wave 2", siteNames: wave2 });
  }
  return rings;
}

// Demo-tuned timings. Tight enough to feel snappy on a 5-minute clock, slow
// enough that ring boundaries and verify sub-states are perceivable.
export const UPGRADE_TIMING = {
  /** Per-site upgrade duration. Each site ticks through fake stages. */
  perSiteMs: 3500,
  /** Per-ring health-verification dwell after all sites in the ring report healthy. */
  verifyMs: 1800,
};
