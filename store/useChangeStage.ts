"use client";

import { create } from "zustand";
import type { FieldDelta } from "@/lib/v2/bindings";

/**
 * Batch-staging area for fleet-authoring edits across MULTIPLE files — both
 * existing-site Azure bindings and template/root defaults. Edits authored in
 * the Edit-bindings drawer or the Edit-defaults drawer land here; the
 * change-management flyout shows the staged set and opens ONE pull request
 * that patches every staged file in a single commit.
 *
 * Each entry carries its already-patched YAML text (computed surgically at
 * stage time so the file's comments and key order survive). In-memory only
 * (not persisted) — consistent with the v2 demo-reset model.
 */
export type StagedKind = "site-binding" | "template-default";

export interface StagedEdit {
  /** Unique key, e.g. "site:stockholm-dev" or "template:sweden". */
  key: string;
  kind: StagedKind;
  /** Display name (site or template name). */
  title: string;
  /** Context line, e.g. the tier label or relative path. */
  subtitle?: string;
  /** Repo-relative path of the YAML file. */
  filePath: string;
  /** Final YAML to commit (surgically patched, comments preserved). */
  patchedText: string;
  /** Before -> after field changes for display. */
  deltas: FieldDelta[];
  /** Sites that inherit this change (blast radius) — template edits only. */
  affectedSites?: string[];
}

interface ChangeStageState {
  /** Staged edits keyed by their unique key (re-staging replaces). */
  staged: Record<string, StagedEdit>;
  stage: (edit: StagedEdit) => void;
  unstage: (key: string) => void;
  clearAll: () => void;
}

export const useChangeStage = create<ChangeStageState>((set) => ({
  staged: {},
  stage: (edit) => set((s) => ({ staged: { ...s.staged, [edit.key]: edit } })),
  unstage: (key) =>
    set((s) => {
      const next = { ...s.staged };
      delete next[key];
      return { staged: next };
    }),
  clearAll: () => set({ staged: {} }),
}));

/** Ordered list of staged edits (template defaults first, then by title). */
export function useStagedEdits(): StagedEdit[] {
  return useChangeStage((s) =>
    Object.values(s.staged).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "template-default" ? -1 : 1;
      return a.title.localeCompare(b.title);
    }),
  );
}

/** Key helpers so producers and the "already staged" checks stay aligned. */
export const stagedSiteKey = (name: string) => `site:${name}`;
export const stagedTemplateKey = (name: string) => `template:${name}`;
