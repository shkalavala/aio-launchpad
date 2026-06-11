"use client";

import { create } from "zustand";
import type { BindingEdit, FieldDelta, LeafBindings } from "@/lib/v2/bindings";

/**
 * Batch-staging area for Azure-binding edits across MULTIPLE sites. Edits
 * authored in the Edit-bindings drawer land here; the change-management flyout
 * shows the staged set and opens ONE pull request that patches every staged
 * site file in a single commit.
 *
 * In-memory only (not persisted) — consistent with the v2 demo-reset model and
 * because the staged edits reference content read at stage time. A page reload
 * clears the staging area, matching the rest of the v2 git working state.
 */
export interface StagedSiteEdit {
  siteName: string;
  /** Repo-relative path of the site's YAML, e.g. ".../sites/stockholm-dev.yaml". */
  filePath: string;
  /** Exact file bytes read when the edit was staged (patched at PR time). */
  originalText: string;
  /** Leaf-owned binding values before the edit. */
  before: LeafBindings;
  /** The edit to apply (string set, null reset-to-inherited, undefined skip). */
  edit: BindingEdit;
  /** Precomputed before -> after field changes for display. */
  deltas: FieldDelta[];
  /** Subscription this site inherits (for display when reset-to-inherited). */
  inheritedSubscription?: string;
}

interface BindingStageState {
  /** Staged edits keyed by site name (one entry per site; re-staging replaces). */
  staged: Record<string, StagedSiteEdit>;
  stage: (edit: StagedSiteEdit) => void;
  unstage: (siteName: string) => void;
  clearAll: () => void;
}

export const useBindingStage = create<BindingStageState>((set) => ({
  staged: {},
  stage: (edit) =>
    set((s) => ({ staged: { ...s.staged, [edit.siteName]: edit } })),
  unstage: (siteName) =>
    set((s) => {
      const next = { ...s.staged };
      delete next[siteName];
      return { staged: next };
    }),
  clearAll: () => set({ staged: {} }),
}));

/** Ordered list of staged edits (alphabetical by site name). */
export function useStagedEdits(): StagedSiteEdit[] {
  return useBindingStage((s) =>
    Object.values(s.staged).sort((a, b) => a.siteName.localeCompare(b.siteName)),
  );
}
