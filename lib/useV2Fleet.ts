"use client";

import { useMemo } from "react";
import { FLEET } from "@/lib/fixtures/sites";
import type { FleetSite } from "@/lib/types";

/**
 * Fleet data source for the v2 experiment. Unlike the classic `useFleet`, this
 * always returns the Contoso demo fleet regardless of the classic demo toggle —
 * the experiment is self-contained and should always have data to show.
 */
export function useV2Fleet(): FleetSite[] {
  return useMemo(() => FLEET, []);
}

/** Look up a single resolved site by its leaf name. */
export function useV2Site(name: string): FleetSite | undefined {
  const fleet = useV2Fleet();
  return useMemo(() => fleet.find((fs) => fs.site.name === name), [fleet, name]);
}
