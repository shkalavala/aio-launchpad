// Git change-management model for the v2 surface.
//
// Framing rule (see session plan): every state-changing action in the UI is
// real, but the underlying motion is ALWAYS git. The UI never writes to a
// cluster directly and nothing here implies a reconciler/daemon. Drift is a
// git-vs-portal divergence computed on demand, not a watched signal.

/**
 * Repo change state, surfaced as a single pill in the header widget.
 *  - in-sync       : working tree matches the branch; portal matches git.
 *  - local-change  : pending edits staged in the UI, not yet committed.
 *  - pending-pr    : a pull request is open and awaiting merge (the approval).
 *  - drift         : portal/deployed state diverges from git (resolve via git).
 */
export type ChangeState = "in-sync" | "local-change" | "pending-pr" | "drift";

export interface CommitRef {
  sha: string;
  message: string;
  author: string;
  /** ISO timestamp. */
  at: string;
}

export interface RepoState {
  provider: "github" | "ado";
  owner: string;
  repo: string;
  branch: string;
  lastCommit: CommitRef;
}

/** A field-level change inside a pending edit, kept for compact display. */
export interface PendingField {
  /** Dotted path, e.g. "brokerConfig.replicas". */
  key: string;
  before?: unknown;
  after?: unknown;
}

/**
 * A staged, uncommitted change produced by editing config in the UI. Holds the
 * full before/after objects so the diff view can render structured field diffs
 * and an optional raw-YAML expand. Resolves ONLY via commit or PR, never apply.
 */
export interface PendingChange {
  id: string;
  /** Repo-relative file path, e.g. "sites/cont-stockholm-assembly-prod.yaml". */
  path: string;
  /** Whether the file is modified, added, or removed. */
  kind: "modified" | "added" | "removed";
  /** Leaf site this change targets, when applicable. */
  siteName?: string;
  /** Snapshot of the file's config before the edit. */
  before: Record<string, unknown>;
  /** Snapshot after the edit. */
  after: Record<string, unknown>;
  /** Quick summary of changed fields (derived at edit time). */
  fields: PendingField[];
}

/**
 * An open pull request representing the approval gate. The PR merging IS the
 * approval (the honest default). An optional in-app approval gate may exist
 * elsewhere but is clearly flagged Advanced/preview.
 */
export interface PullRequest {
  number: number;
  title: string;
  branch: string;
  createdAt: string;
  fileCount: number;
}

/**
 * A change arriving from the repo (someone else merged upstream). Surfaced in
 * the Incoming Changes feed with author + message + affected sites. Actions:
 * preview impact, apply (pull into working state), or stage a rollout.
 */
export interface IncomingChange {
  id: string;
  commit: CommitRef;
  /** Leaf site names this commit touches. */
  affectedSites: string[];
  /** Short human summary of what changed. */
  summary: string;
  /** Per-site field deltas for the impact preview. */
  perSite: Array<{
    siteName: string;
    fields: PendingField[];
  }>;
}

/**
 * A drift record: portal/deployed state diverges from git. Computed on demand
 * (a manual "Check for drift" refresh), never watched. `direction` decides how
 * it is resolved through git:
 *  - portal-ahead : someone edited via portal/CLI; capture into git as a PR.
 *  - git-ahead    : git changed but the pipeline has not re-applied; re-run it.
 */
export interface DriftRecord {
  siteName: string;
  direction: "portal-ahead" | "git-ahead";
  fields: PendingField[];
  detectedAt: string;
}
