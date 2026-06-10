"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ChangeState,
  DriftRecord,
  IncomingChange,
  PendingChange,
  PendingField,
  PullRequest,
  RepoState,
} from "@/lib/git/model";
import { V2_REPO, INCOMING_CHANGES, DRIFT_RECORDS } from "@/lib/git/fixtures";

export const V2_PERSIST_KEY = "aio-launchpad-v2-store";

/** Basic hides infra (cluster/Arc) + advanced actions; Advanced reveals them. */
export type V2Mode = "basic" | "advanced";

let prCounter = 41;

function genSha(): string {
  return Math.random().toString(16).slice(2, 9);
}

interface StageEditArgs {
  siteName: string;
  /** Repo-relative file path the edit lands in. */
  path: string;
  /** Dotted field key, e.g. "parameters.brokerConfig.replicas". */
  key: string;
  before: unknown;
  after: unknown;
  /** Full before/after config snapshots for the diff view. */
  beforeConfig: Record<string, unknown>;
  afterConfig: Record<string, unknown>;
}

interface V2State {
  // ── Lens ────────────────────────────────────────────────────────────────
  mode: V2Mode;
  setMode: (m: V2Mode) => void;
  toggleMode: () => void;

  // ── Repo / git working state (in-memory; reseeds on reload) ─────────────
  repo: RepoState;
  pendingChanges: PendingChange[];
  pullRequest: PullRequest | null;
  incomingChanges: IncomingChange[];
  driftRecords: DriftRecord[];
  /** Drift is computed on demand — nothing shows until a check has been run. */
  driftChecked: boolean;
  /** Per-site staged field overrides, keyed by site then dotted path. */
  configOverrides: Record<string, Record<string, unknown>>;

  // ── Editing → pending change ────────────────────────────────────────────
  stageConfigEdit: (args: StageEditArgs) => void;
  discardPending: (id: string) => void;
  discardAllPending: () => void;

  // ── Resolve through git (commit / PR) ───────────────────────────────────
  commitPending: (message?: string) => void;
  createPullRequest: (title?: string) => void;
  mergePullRequest: () => void;
  closePullRequest: () => void;

  // ── Incoming changes ────────────────────────────────────────────────────
  applyIncoming: (id: string) => void;
  dismissIncoming: (id: string) => void;

  // ── Drift (on-demand) ───────────────────────────────────────────────────
  runDriftCheck: () => void;
  resolveDrift: (siteName: string) => void;

  // ── Demo reset ──────────────────────────────────────────────────────────
  resetGitState: () => void;
}

function freshGitState() {
  return {
    repo: { ...V2_REPO, lastCommit: { ...V2_REPO.lastCommit } },
    pendingChanges: [] as PendingChange[],
    pullRequest: null as PullRequest | null,
    incomingChanges: INCOMING_CHANGES.map((c) => ({ ...c })),
    driftRecords: DRIFT_RECORDS.map((d) => ({ ...d })),
    driftChecked: false,
    configOverrides: {} as Record<string, Record<string, unknown>>,
  };
}

export const useV2Store = create<V2State>()(
  persist(
    (set, get) => ({
      mode: "basic",
      setMode: (mode) => set({ mode }),
      toggleMode: () => set({ mode: get().mode === "basic" ? "advanced" : "basic" }),

      ...freshGitState(),

      stageConfigEdit: ({ siteName, path, key, before, after, beforeConfig, afterConfig }) => {
        const { pendingChanges, configOverrides } = get();
        const field: PendingField = { key, before, after };
        const existing = pendingChanges.find((c) => c.path === path);
        let next: PendingChange[];
        if (existing) {
          const fields = existing.fields.filter((f) => f.key !== key);
          // Re-baseline against the original before so reverting a value clears it.
          const merged = [...fields, field].filter((f) => JSON.stringify(f.before) !== JSON.stringify(f.after));
          next = merged.length
            ? pendingChanges.map((c) =>
                c.path === path ? { ...c, after: afterConfig, fields: merged } : c,
              )
            : pendingChanges.filter((c) => c.path !== path);
        } else if (JSON.stringify(before) !== JSON.stringify(after)) {
          next = [
            ...pendingChanges,
            {
              id: `pc-${genSha()}`,
              path,
              kind: "modified",
              siteName,
              before: beforeConfig,
              after: afterConfig,
              fields: [field],
            },
          ];
        } else {
          next = pendingChanges;
        }
        set({
          pendingChanges: next,
          configOverrides: {
            ...configOverrides,
            [siteName]: { ...(configOverrides[siteName] ?? {}), [key]: after },
          },
        });
      },

      discardPending: (id) => {
        const { pendingChanges } = get();
        const target = pendingChanges.find((c) => c.id === id);
        const next = pendingChanges.filter((c) => c.id !== id);
        // Drop staged overrides for the discarded file's site.
        const configOverrides = { ...get().configOverrides };
        if (target?.siteName) delete configOverrides[target.siteName];
        set({ pendingChanges: next, configOverrides, pullRequest: next.length ? get().pullRequest : null });
      },

      discardAllPending: () => set({ pendingChanges: [], configOverrides: {}, pullRequest: null }),

      commitPending: (message) => {
        const { pendingChanges, repo } = get();
        if (pendingChanges.length === 0) return;
        const summary =
          message ??
          (pendingChanges.length === 1
            ? `config: update ${pendingChanges[0].siteName ?? pendingChanges[0].path}`
            : `config: update ${pendingChanges.length} files`);
        set({
          pendingChanges: [],
          configOverrides: {},
          pullRequest: null,
          repo: {
            ...repo,
            lastCommit: {
              sha: genSha(),
              message: summary,
              author: "You",
              at: new Date().toISOString(),
            },
          },
        });
      },

      createPullRequest: (title) => {
        const { pendingChanges } = get();
        if (pendingChanges.length === 0) return;
        set({
          pullRequest: {
            number: prCounter++,
            title: title ?? `Update ${pendingChanges.length} site config file(s)`,
            branch: `config/update-${genSha().slice(0, 4)}`,
            createdAt: new Date().toISOString(),
            fileCount: pendingChanges.length,
          },
        });
      },

      mergePullRequest: () => {
        const { pullRequest, repo } = get();
        if (!pullRequest) return;
        set({
          pendingChanges: [],
          configOverrides: {},
          pullRequest: null,
          repo: {
            ...repo,
            lastCommit: {
              sha: genSha(),
              message: `Merge PR #${pullRequest.number}: ${pullRequest.title}`,
              author: "You",
              at: new Date().toISOString(),
            },
          },
        });
      },

      closePullRequest: () => set({ pullRequest: null }),

      applyIncoming: (id) => {
        const { incomingChanges, repo } = get();
        const change = incomingChanges.find((c) => c.id === id);
        set({
          incomingChanges: incomingChanges.filter((c) => c.id !== id),
          repo: change ? { ...repo, lastCommit: { ...change.commit } } : repo,
        });
      },

      dismissIncoming: (id) =>
        set({ incomingChanges: get().incomingChanges.filter((c) => c.id !== id) }),

      runDriftCheck: () => set({ driftChecked: true }),

      resolveDrift: (siteName) =>
        set({ driftRecords: get().driftRecords.filter((d) => d.siteName !== siteName) }),

      resetGitState: () => set(freshGitState()),
    }),
    {
      name: V2_PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only the lens preference. Git working state reseeds on reload
      // so the demo always starts from a known, clean position.
      partialize: (s) => ({ mode: s.mode }),
    },
  ),
);

/** Derived repo change-state pill. Order matters: PR > local edits > drift. */
export function selectChangeState(s: V2State): ChangeState {
  if (s.pullRequest) return "pending-pr";
  if (s.pendingChanges.length > 0) return "local-change";
  if (s.driftChecked && s.driftRecords.length > 0) return "drift";
  return "in-sync";
}
