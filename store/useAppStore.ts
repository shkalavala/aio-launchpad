"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AioReleaseId, FleetSite, SecretEntry } from "@/lib/types";
import {
  type Ring,
  type RolloutStatus,
  type SiteStatus,
  UPGRADE_TIMING,
} from "@/lib/upgrade";
import { SAMPLE_APPS } from "@/lib/fixtures/sampleApps";
import { ARM_MODULES } from "@/lib/fixtures/armModules";
import type { RolloutRecord } from "@/lib/fixtures/rollouts";
import { RING_STRATEGIES } from "@/lib/fixtures/strategies";

export const PERSIST_KEY = "aio-launchpad-store";

// ── Internal tick driver ─────────────────────────────────────────────────────
// Module-scoped so it survives re-renders but not a hard reload. We don't
// persist rollout state across reloads on purpose — demo-safe reset.
let tickHandle: ReturnType<typeof setInterval> | null = null;
const TICK_MS = 100;

function stopTicker() {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

interface AppState {
  /** Site names currently selected in the fleet view. */
  selectedSiteNames: string[];
  setSelectedSiteNames: (names: string[]) => void;
  toggleSiteSelected: (name: string) => void;
  clearSelection: () => void;

  /** Scale Kit-style selector text, e.g. "env=prod,country=SE". */
  selectorText: string;
  setSelectorText: (text: string) => void;

  /** Filters for the fleet table. */
  filterEnv: "all" | "dev" | "prod";
  setFilterEnv: (v: "all" | "dev" | "prod") => void;
  filterRelease: "all" | string;
  setFilterRelease: (v: "all" | string) => void;

  // ── Screen 3: Rollout (in-place AIO upgrade / app deploy / ARM module apply)
  /**
   * The kind of change being rolled. Different kinds reuse the same ring/gate
   * machinery but carry different payload identifiers and skip release-specific
   * UI (BlastRadius, version diff).
   */
  rolloutKind: "release" | "app" | "arm" | "install";
  setRolloutKind: (k: "release" | "app" | "arm" | "install") => void;

  /** Payload id when kind === "app" (lib/fixtures/sampleApps.ts). */
  rolloutAppId: string | null;
  setRolloutAppId: (id: string | null) => void;

  /** Payload id when kind === "arm" (lib/fixtures/armModules.ts). */
  rolloutArmId: string | null;
  setRolloutArmId: (id: string | null) => void;

  targetReleaseId: AioReleaseId | null;
  setTargetRelease: (id: AioReleaseId | null) => void;

  rings: Ring[];
  setRings: (rings: Ring[]) => void;

  /** Selected ring strategy id (lib/fixtures/strategies.ts). Drives planRollout. */
  ringStrategyId: string;
  setRingStrategyId: (id: string) => void;

  rolloutStatus: RolloutStatus;
  siteStatus: Record<string, SiteStatus>;
  currentRingIndex: number;

  /** UI-only overlay: a site's effective AIO release after a successful upgrade. */
  versionOverrides: Record<string, AioReleaseId>;

  /**
   * Snapshot of each rollout site's source release at the moment startRollout()
   * fires. Used so /rollout's per-row "from → to" and aggregate YAML diff
   * keep showing the operator's starting baseline while sites flip to target.
   * Cleared on cancel/reset.
   */
  releaseSnapshotAtStart: Record<string, AioReleaseId>;

  /**
   * Completed/cancelled rollouts from this session. Prepended to the fixture
   * history so the operator can see the rollout they just ran in Recent rollouts.
   */
  sessionRollouts: RolloutRecord[];

  /** Internal: elapsed ms of the current rollout (advances only while running). */
  _rolloutElapsedMs: number;
  /** Internal: per-site start time (in elapsed ms) for the upgrade phase. */
  _siteStartMs: Record<string, number>;
  /** Internal: ms at which the current ring entered verify dwell, or null. */
  _verifyStartMs: number | null;

  startRollout: (snapshot?: Record<string, AioReleaseId>) => void;
  pauseRollout: () => void;
  resumeRollout: () => void;
  advanceGate: () => void;
  cancelRollout: () => void;
  resetRollout: () => void;

  // ── Screen 2: Add a site ───────────────────────────────────────────
  /** Sites added via the Add-a-site flow this session. UI-only overlay. */
  pendingSites: FleetSite[];
  addPendingSite: (fs: FleetSite) => void;
  clearPendingSites: () => void;

  /**
   * Names of PENDING_INSTALL_FLEET sites that have been brought online via a
   * completed install-kind rollout this session. UI-only overlay: surfaces in
   * /fleet and hides them from the Rollout install picker so they can't be
   * targeted twice.
   */
  installedPendingSiteNames: string[];
  clearInstalledPendingSites: () => void;
  // ── Screen 4: Secrets management ────────────────────────────
  /**
   * Per-site overlay of edited secret-entry arrays. When a site name is
   * present in this map, the UI uses the overlay; otherwise it falls back
   * to the fixture. Cleared per session.
   */
  secretsOverlay: Record<string, SecretEntry[]>;
  setSiteSecrets: (siteName: string, entries: SecretEntry[]) => void;
  resetSiteSecrets: (siteName: string) => void;

  // ── Demo mode ───────────────────────────────────────────────────────
  /**
   * When true (default), Contoso fixture data renders across the fleet,
   * upgrade, secrets, and releases surfaces. When false, those surfaces
   * render as if this were a fresh tenant — empty fleet, empty selectors,
   * empty release usage — so the onboarding / empty-state flow is visible.
   * Pending sites added via /sites/new still show through.
   */
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  toggleDemoMode: () => void;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  selectedSiteNames: [],
  setSelectedSiteNames: (selectedSiteNames) => set({ selectedSiteNames }),
  toggleSiteSelected: (name) =>
    set((s) => ({
      selectedSiteNames: s.selectedSiteNames.includes(name)
        ? s.selectedSiteNames.filter((n) => n !== name)
        : [...s.selectedSiteNames, name],
    })),
  clearSelection: () => set({ selectedSiteNames: [] }),

  selectorText: "",
  setSelectorText: (selectorText) => set({ selectorText }),

  filterEnv: "all",
  setFilterEnv: (filterEnv) => set({ filterEnv }),
  filterRelease: "all",
  setFilterRelease: (filterRelease) => set({ filterRelease }),

  // ── Upgrade slice ─────────────────────────────────────────────────────────
  targetReleaseId: null,
  setTargetRelease: (id) => set({ targetReleaseId: id }),

  rolloutKind: "release",
  setRolloutKind: (k) => set({ rolloutKind: k }),

  rolloutAppId: null,
  setRolloutAppId: (id) => set({ rolloutAppId: id }),

  rolloutArmId: null,
  setRolloutArmId: (id) => set({ rolloutArmId: id }),

  rings: [],
  setRings: (rings) => set({ rings }),

  ringStrategyId: "standard",
  setRingStrategyId: (id) => set({ ringStrategyId: id }),

  rolloutStatus: "idle",
  siteStatus: {},
  currentRingIndex: 0,
  versionOverrides: {},
  releaseSnapshotAtStart: {},
  sessionRollouts: [],
  _rolloutElapsedMs: 0,
  _siteStartMs: {},
  _verifyStartMs: null,

  startRollout: (snapshot?: Record<string, AioReleaseId>) => {
    const { rings, rolloutKind, targetReleaseId, rolloutAppId, rolloutArmId } = get();
    // Each rollout kind needs its payload to be set; rings must be planned.
    const hasPayload =
      (rolloutKind === "release" && !!targetReleaseId) ||
      (rolloutKind === "install" && !!targetReleaseId) ||
      (rolloutKind === "app" && !!rolloutAppId) ||
      (rolloutKind === "arm" && !!rolloutArmId);
    if (!hasPayload || rings.length === 0) return;

    const siteStatus: Record<string, SiteStatus> = {};
    for (const r of rings) for (const n of r.siteNames) siteStatus[n] = "pending";
    const _siteStartMs: Record<string, number> = {};
    for (const n of rings[0].siteNames) {
      siteStatus[n] = "upgrading";
      _siteStartMs[n] = 0;
    }

    set({
      rolloutStatus: "running",
      currentRingIndex: 0,
      siteStatus,
      releaseSnapshotAtStart: snapshot ?? {},
      _rolloutElapsedMs: 0,
      _siteStartMs,
      _verifyStartMs: null,
    });
    runTicker();
  },

  pauseRollout: () => {
    if (get().rolloutStatus !== "running") return;
    stopTicker();
    set({ rolloutStatus: "paused" });
  },

  resumeRollout: () => {
    if (get().rolloutStatus !== "paused") return;
    set({ rolloutStatus: "running" });
    runTicker();
  },

  advanceGate: () => {
    const state = get();
    if (state.rolloutStatus !== "awaiting-gate") return;
    const nextIndex = state.currentRingIndex + 1;
    if (nextIndex >= state.rings.length) {
      const record = buildSessionRecord(state, "succeeded");
      set({
        rolloutStatus: "completed",
        sessionRollouts: [record, ...state.sessionRollouts],
      });
      return;
    }
    const ring = state.rings[nextIndex];
    const siteStatus = { ...state.siteStatus };
    const _siteStartMs = { ...state._siteStartMs };
    for (const n of ring.siteNames) {
      siteStatus[n] = "upgrading";
      _siteStartMs[n] = state._rolloutElapsedMs;
    }
    set({
      currentRingIndex: nextIndex,
      rolloutStatus: "running",
      siteStatus,
      _siteStartMs,
      _verifyStartMs: null,
    });
    runTicker();
  },

  cancelRollout: () => {
    const state = get();
    stopTicker();
    // Record cancellation in session history so the operator sees what they
    // just did in Recent rollouts.
    const record = state.rolloutStatus !== "idle"
      ? buildSessionRecord(state, "cancelled")
      : null;
    set({
      rolloutStatus: "idle",
      siteStatus: {},
      currentRingIndex: 0,
      releaseSnapshotAtStart: {},
      _rolloutElapsedMs: 0,
      _siteStartMs: {},
      _verifyStartMs: null,
      sessionRollouts: record ? [record, ...state.sessionRollouts] : state.sessionRollouts,
    });
  },

  resetRollout: () => {
    stopTicker();
    // Clear in-flight + simulated state (siteStatus, ticker counters, the
    // "fleet now thinks it's upgraded" overrides) but keep the operator's
    // plan intact (rings, target release, selection). The CTA stays armed
    // and re-clicking "Roll out" immediately replays the same rollout —
    // which is the actual demo / re-try use case.
    //
    // Wiping rings here would also brick the CTA: RingConfigurator only
    // rebuilds rings when selectedSites/strategy/lock changes, so a cleared
    // rings array stays empty until the operator touches the selection.
    set({
      rolloutStatus: "idle",
      siteStatus: {},
      currentRingIndex: 0,
      versionOverrides: {},
      releaseSnapshotAtStart: {},
      _rolloutElapsedMs: 0,
      _siteStartMs: {},
      _verifyStartMs: null,
    });
  },

  // ── New-site slice ────────────────────────────────────────────────────────────
  pendingSites: [],
  addPendingSite: (fs) =>
    set((s) => ({
      pendingSites: s.pendingSites.some((p) => p.site.name === fs.site.name)
        ? s.pendingSites
        : [...s.pendingSites, fs],
    })),
  clearPendingSites: () => set({ pendingSites: [] }),

  installedPendingSiteNames: [],
  clearInstalledPendingSites: () => set({ installedPendingSiteNames: [] }),

  secretsOverlay: {},
  setSiteSecrets: (siteName, entries) =>
    set((s) => ({ secretsOverlay: { ...s.secretsOverlay, [siteName]: entries } })),
  resetSiteSecrets: (siteName) =>
    set((s) => {
      const next = { ...s.secretsOverlay };
      delete next[siteName];
      return { secretsOverlay: next };
    }),

  // ── Demo-mode slice ───────────────────────────────────────────────
  demoMode: true,
  setDemoMode: (v) => set({ demoMode: v }),
  toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),
}), {
  name: PERSIST_KEY,
  storage: createJSONStorage(() => localStorage),
  // Persist only the visible-state overlays. Rollout in-flight state is
  // intentionally not persisted — the ticker won't resume cleanly across
  // reloads and the operator should always start a rollout fresh.
  partialize: (s) => ({
    versionOverrides: s.versionOverrides,
    pendingSites: s.pendingSites,
    installedPendingSiteNames: s.installedPendingSiteNames,
    secretsOverlay: s.secretsOverlay,
    sessionRollouts: s.sessionRollouts,
  }),
}));

// ── Tick driver ──────────────────────────────────────────────────────────────
function runTicker() {
  stopTicker();
  tickHandle = setInterval(() => {
    const s = useAppStore.getState();
    if (s.rolloutStatus !== "running") {
      stopTicker();
      return;
    }
    const elapsed = s._rolloutElapsedMs + TICK_MS;
    const ring = s.rings[s.currentRingIndex];
    if (!ring) {
      stopTicker();
      return;
    }

    const siteStatus = { ...s.siteStatus };

    // 1. Advance per-site upgrade → verifying.
    for (const name of ring.siteNames) {
      if (siteStatus[name] === "upgrading") {
        const start = s._siteStartMs[name] ?? 0;
        if (elapsed - start >= UPGRADE_TIMING.perSiteMs) {
          siteStatus[name] = "verifying";
        }
      }
    }

    // 2. Once all sites in the ring are verifying-or-better, start verify dwell.
    const allVerifying = ring.siteNames.every(
      (n) => siteStatus[n] === "verifying" || siteStatus[n] === "healthy",
    );
    let verifyStart = s._verifyStartMs;
    if (allVerifying && verifyStart === null) {
      verifyStart = elapsed;
    }

    // 3. After verify dwell, flip ring to healthy + write overrides.
    let nextStatus: RolloutStatus = "running";
    let versionOverrides = s.versionOverrides;

    if (verifyStart !== null && elapsed - verifyStart >= UPGRADE_TIMING.verifyMs) {
      versionOverrides = { ...versionOverrides };
      const newlyInstalled: string[] = [];
      for (const name of ring.siteNames) {
        siteStatus[name] = "healthy";
        // Release + install rollouts both pin sites to the target AIO release.
        // App and ARM-module rollouts complete on the same release pin.
        if ((s.rolloutKind === "release" || s.rolloutKind === "install") && s.targetReleaseId) {
          versionOverrides[name] = s.targetReleaseId;
        }
        if (s.rolloutKind === "install") newlyInstalled.push(name);
      }
      const isLastRing = s.currentRingIndex >= s.rings.length - 1;
      if (isLastRing) {
        nextStatus = "completed";
        stopTicker();
      } else {
        nextStatus = "awaiting-gate";
        verifyStart = null;
        stopTicker();
      }

      if (newlyInstalled.length > 0) {
        const merged = Array.from(
          new Set([...s.installedPendingSiteNames, ...newlyInstalled]),
        );
        useAppStore.setState({ installedPendingSiteNames: merged });
      }
    }

    const patch: Partial<AppState> = {
      _rolloutElapsedMs: elapsed,
      siteStatus,
      _verifyStartMs: verifyStart,
      versionOverrides,
      rolloutStatus: nextStatus,
    };
    if (nextStatus === "completed") {
      const record = buildSessionRecord({ ...s, versionOverrides }, "succeeded");
      patch.sessionRollouts = [record, ...s.sessionRollouts];
    }
    useAppStore.setState(patch);
  }, TICK_MS);
}

// Build a RolloutRecord from a snapshot of store state, for the Recent
// rollouts strip. Called when a rollout completes (succeeded) or is cancelled.
function buildSessionRecord(
  s: AppState,
  outcome: "succeeded" | "cancelled",
): RolloutRecord {
  const now = new Date();
  const finishedAt = now.toISOString();
  const startedAt = new Date(now.getTime() - s._rolloutElapsedMs).toISOString();
  const siteCount = s.rings.reduce((n, r) => n + r.siteNames.length, 0);
  const ringStrategy = describeRings(s.rings, s.ringStrategyId);
  const base = {
    id: `ro-session-${now.getTime()}`,
    siteCount,
    ringStrategy,
    startedAt,
    finishedAt,
    outcome,
    triggeredBy: "you",
  } as const;
  if (s.rolloutKind === "app") {
    const app = SAMPLE_APPS.find((a) => a.id === s.rolloutAppId);
    return { ...base, kind: "app", appName: app?.name ?? "App deploy" };
  }
  if (s.rolloutKind === "arm") {
    const mod = ARM_MODULES.find((m) => m.id === s.rolloutArmId);
    return { ...base, kind: "arm", armName: mod?.name ?? "ARM module" };
  }
  if (s.rolloutKind === "install") {
    return { ...base, kind: "install", releaseId: s.targetReleaseId ?? undefined };
  }
  return { ...base, kind: "release", releaseId: s.targetReleaseId ?? undefined };
}

function describeRings(rings: Ring[], strategyId: string): string {
  if (rings.length === 0) return "";
  if (rings.length === 1) return "Single ring";
  // Match the canonical labels used in fixtures: "Canary → Wave 1 → Wave 2".
  const labels = rings.map((r, i) => r.name || (i === 0 ? "Canary" : `Wave ${i}`));
  const joined = labels.join(" → ");
  const strategy = RING_STRATEGIES.find((s) => s.id === strategyId);
  return strategy ? `${strategy.name} · ${joined}` : joined;
}
