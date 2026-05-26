"use client";

import { useMemo } from "react";
import { FLEET, PENDING_INSTALL_FLEET } from "@/lib/fixtures/sites";
import { useAppStore } from "@/store/useAppStore";
import type { FleetSite } from "@/lib/types";

/**
 * Fleet data source for UI surfaces.
 *
 * Returns the Contoso fixture when demo mode is on, an empty array
 * otherwise. Pending sites added via /sites/new are intentionally NOT
 * merged here — pages that need them combine `useFleet()` with the
 * `pendingSites` slice themselves (see app/fleet/page.tsx).
 *
 * Sites brought online via a completed install-kind rollout this session
 * (lib/fixtures/sites.ts → PENDING_INSTALL_FLEET, gated by the store's
 * `installedPendingSiteNames`) ARE merged here — once installed they're
 * indistinguishable from any other fleet site, with `aioInstalled` flipped
 * true so health/runtime surfaces treat them normally.
 */
export function useFleet(): FleetSite[] {
  const demoMode = useAppStore((s) => s.demoMode);
  const installedPendingSiteNames = useAppStore((s) => s.installedPendingSiteNames);
  return useMemo(() => {
    if (!demoMode) return [];
    if (installedPendingSiteNames.length === 0) return FLEET;
    const installedSet = new Set(installedPendingSiteNames);
    const promoted: FleetSite[] = PENDING_INSTALL_FLEET
      .filter((fs) => installedSet.has(fs.site.name))
      .map((fs) => ({
        ...fs,
        runtime: { ...fs.runtime, aioInstalled: true },
      }));
    return [...FLEET, ...promoted];
  }, [demoMode, installedPendingSiteNames]);
}
