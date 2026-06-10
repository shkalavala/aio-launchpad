"use client";

import { useMemo } from "react";
import { FLEET } from "@/lib/fixtures/sites";
import type { FleetSite } from "@/lib/types";
import { useRepoConnection } from "@/store/useRepoConnection";

/**
 * Fleet data source for the v2 experiment. Source-switches between two backings:
 *   - a connected real Scale Kit repo (bring-your-own-repo mode), or
 *   - the self-contained Contoso demo fleet when no repo is connected.
 * Either way the experiment always has data to show.
 */
export function useV2Fleet(): FleetSite[] {
  const liveFleet = useRepoConnection((s) => (s.status === "connected" ? s.fleet : null));
  return useMemo(() => liveFleet ?? FLEET, [liveFleet]);
}

/** Look up a single resolved site by its leaf name. */
export function useV2Site(name: string): FleetSite | undefined {
  const fleet = useV2Fleet();
  return useMemo(() => fleet.find((fs) => fs.site.name === name), [fleet, name]);
}
