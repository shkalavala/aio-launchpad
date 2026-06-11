"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ObservedSourceId } from "@/lib/v2/observedState";

/**
 * Which observed-state source the UI reads from. Defaults to "simulated" so the
 * demo keeps its health dots, but the source is always visible and switchable
 * so the synthesized telemetry is never mistaken for live cluster truth.
 *
 * Persisted to localStorage (non-secret view preference).
 */
interface ObservedSourceState {
  sourceId: ObservedSourceId;
  setSourceId: (id: ObservedSourceId) => void;
}

export const useObservedSource = create<ObservedSourceState>()(
  persist(
    (set) => ({
      sourceId: "simulated",
      setSourceId: (sourceId) => set({ sourceId }),
    }),
    {
      name: "aio-launchpad.v2.observed-source",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
