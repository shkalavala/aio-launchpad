"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FleetSite, SiteTemplate } from "@/lib/types";
import { loadRepoFleet, type RepoConnection } from "@/lib/v2/repoFleet";

/**
 * Connection to a real Scale Kit repo for the "bring your own repo" mode.
 *
 * SECURITY: the optional PAT is held in sessionStorage only (cleared when the
 * tab closes), never localStorage, never committed, never logged. It is only
 * ever sent to api.github.com by the read/write clients. Non-secret coords
 * (owner/repo/branch/workspace) ride along in the same sessionStorage entry so
 * a same-tab reload keeps you connected.
 */

export type RepoStatus = "idle" | "loading" | "connected" | "error";

const DEFAULT_WORKSPACE = "workspaces/iot-operations";

interface RepoConnectionState {
  connection: RepoConnection | null;
  status: RepoStatus;
  error: string | null;
  /** Live fleet loaded from the repo; null until a successful connect. */
  fleet: FleetSite[] | null;
  templates: SiteTemplate[];
  /** template name -> inherits path relative to sites/ (e.g. "shared/germany.yaml"). */
  templatePaths: Record<string, string>;
  /** Repo-relative paths that failed to parse on the last load. */
  skipped: string[];

  /** Validate + load a repo. Resolves true on success. */
  connect: (conn: RepoConnection) => Promise<boolean>;
  /** Re-read the currently connected repo (e.g. after a PR merges). */
  refresh: () => Promise<void>;
  /** Drop the connection and fall back to mock data. */
  disconnect: () => void;
}

export const useRepoConnection = create<RepoConnectionState>()(
  persist(
    (set, get) => ({
      connection: null,
      status: "idle",
      error: null,
      fleet: null,
      templates: [],
      templatePaths: {},
      skipped: [],

      connect: async (conn) => {
        const normalized: RepoConnection = {
          ...conn,
          workspace: conn.workspace?.trim() || DEFAULT_WORKSPACE,
          branch: conn.branch?.trim() || "main",
        };
        set({ status: "loading", error: null, connection: normalized });
        try {
          const { fleet, templates, templatePaths, skipped } = await loadRepoFleet(normalized);
          if (fleet.length === 0) {
            set({
              status: "error",
              error: `No sites found under ${normalized.workspace}/sites. Check the workspace path and branch.`,
              fleet: null,
            });
            return false;
          }
          set({ status: "connected", fleet, templates, templatePaths, skipped, error: null });
          return true;
        } catch (e) {
          set({
            status: "error",
            error: e instanceof Error ? e.message : "Failed to load repository.",
            fleet: null,
          });
          return false;
        }
      },

      refresh: async () => {
        const conn = get().connection;
        if (!conn) return;
        await get().connect(conn);
      },

      disconnect: () =>
        set({
          connection: null,
          status: "idle",
          error: null,
          fleet: null,
          templates: [],
          templatePaths: {},
          skipped: [],
        }),
    }),
    {
      name: "aio-launchpad-v2-repo",
      // Per-tab, cleared on close — the right home for a demo PAT.
      storage: createJSONStorage(() => sessionStorage),
      // Persist only the connection coords (incl. token). Loaded fleet is
      // re-fetched on rehydrate so we never stale-cache derived data.
      partialize: (s) => ({ connection: s.connection }),
    },
  ),
);

/** True when a live repo is connected and its fleet is loaded. */
export function useIsRepoConnected(): boolean {
  return useRepoConnection((s) => s.status === "connected" && s.fleet !== null);
}
