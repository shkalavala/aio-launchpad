import type { Tone } from "@/lib/v2/format";
import type { PendingChange } from "@/lib/git/model";
import { fieldByPath } from "@/lib/v2/config";

export type DeployKind =
  | "release-upgrade"
  | "config-apply"
  | "rollback"
  | "solution-deploy"
  | "reconcile";
export type DeployStatus =
  | "waiting-approval"
  | "submitted"
  | "deploying"
  | "in-progress"
  | "queued"
  | "succeeded"
  | "failed";

/**
 * Approval is enforced OUT-OF-BAND: Launchpad only *requests* it and *observes*
 * the status read back from the Approvals service. The AIO operator on the
 * cluster validates the token presented on the change and applies (or rejects)
 * it. Launchpad never grants approval itself — there is no in-app Approve
 * action. This is the honest read-back lifecycle.
 */
export type ApprovalStatus =
  | "requested" // request sent to the Approvals service
  | "submitted" // submitted to ARM
  | "reached-cluster" // change reached the cluster
  | "operator-validated" // AIO operator validated the token on the cluster
  | "applied" // applied on the cluster
  | "rejected"; // operator rejected the change

export interface ApprovalState {
  /** Approver, group, or service the request was routed to. */
  routedTo: string;
  status: ApprovalStatus;
  requestedAt: string;
  updatedAt: string;
}

/** Ordered OOB approval read-back stages (terminal: applied | rejected). */
export const APPROVAL_STAGES: ApprovalStatus[] = [
  "requested",
  "submitted",
  "reached-cluster",
  "operator-validated",
  "applied",
];

export function approvalMeta(s: ApprovalStatus): { label: string; tone: Tone } {
  switch (s) {
    case "requested":
      return { label: "Requested", tone: "warning" };
    case "submitted":
      return { label: "Submitted to ARM", tone: "accent" };
    case "reached-cluster":
      return { label: "Reached cluster", tone: "accent" };
    case "operator-validated":
      return { label: "Operator validated", tone: "accent" };
    case "applied":
      return { label: "Applied", tone: "success" };
    case "rejected":
      return { label: "Rejected", tone: "danger" };
  }
}

/** Whether an approval is still open (not yet applied or rejected). */
export function approvalPending(s: ApprovalStatus): boolean {
  return s !== "applied" && s !== "rejected";
}

export interface DeploymentSiteChange {
  siteName: string;
  before?: string;
  after?: string;
}

export interface Deployment {
  id: string;
  title: string;
  kind: DeployKind;
  status: DeployStatus;
  /** Commit the deployment applies (or, for rollback, reverts to). */
  commitSha: string;
  scopeLabel: string;
  changes: DeploymentSiteChange[];
  createdAt: string;
  requestedBy: string;
  /** Operator who validated a past run (audit fact, not an in-app action). */
  approvedBy?: string;
  /** Live OOB approval read-back, present only when routed to the Approvals service. */
  approval?: ApprovalState;
}

export const KIND_META: Record<DeployKind, { label: string }> = {
  "release-upgrade": { label: "Release upgrade" },
  "config-apply": { label: "Config apply" },
  rollback: { label: "Rollback" },
  "solution-deploy": { label: "Solution deploy" },
  reconcile: { label: "Reconcile" },
};

export function statusMeta(s: DeployStatus): { label: string; tone: Tone } {
  switch (s) {
    case "waiting-approval":
      return { label: "Waiting on approval", tone: "warning" };
    case "submitted":
      return { label: "Submitted to pipeline", tone: "accent" };
    case "deploying":
      return { label: "Deploying", tone: "accent" };
    case "succeeded":
      return { label: "Succeeded", tone: "success" };
    case "in-progress":
      return { label: "In progress", tone: "accent" };
    case "queued":
      return { label: "Queued", tone: "neutral" };
    case "failed":
      return { label: "Failed", tone: "danger" };
  }
}

/**
 * Ordered lifecycle a deployment moves through. When it is routed to the
 * Approvals service the run starts at `waiting-approval`; otherwise PR review +
 * CI already gated it, so it starts at `submitted`.
 */
export function deployLifecycle(requiresApproval: boolean): DeployStatus[] {
  const tail: DeployStatus[] = ["submitted", "deploying", "succeeded"];
  return requiresApproval ? ["waiting-approval", ...tail] : tail;
}

/** Prior commits available as rollback targets (mocked history). */
export interface CommitOption {
  sha: string;
  message: string;
  author: string;
  at: string;
}

export const COMMIT_HISTORY: CommitOption[] = [
  { sha: "a1b9f3c", message: "secret-sync: add opcua-trust to stockholm prod sites", author: "Priya N.", at: "2026-06-08T14:22:00Z" },
  { sha: "f30c7a2", message: "broker: medium memory profile across prod", author: "Magnus B.", at: "2026-06-06T11:10:00Z" },
  { sha: "b71d904", message: "release: pin gothenburg cutting to 2605", author: "Priya N.", at: "2026-06-04T09:30:00Z" },
  { sha: "e22a5f8", message: "init: onboard hamburg paintshop", author: "Jonas W.", at: "2026-06-01T16:45:00Z" },
];

/**
 * A config patch available to roll across the fleet. A patch is NOT an invented
 * setting — it is a real git change: either a committed change in the repo or a
 * live pending change authored in Configurations this session. Applying a patch
 * rolls that already-authored change forward across sites.
 *
 * Scoped to AIO config that is live-tunable across a fleet (dataflow profile
 * throughput, OPC UA asset sampling, Key Vault secret sync). Deploy-time-only
 * settings (broker cardinality + memory profile) roll via a release, not a
 * patch.
 */
export interface ConfigPatch {
  id: string;
  label: string;
  summary: string;
  before: string;
  after: string;
  /** Repo-relative file the change lands in. */
  path: string;
  /** Dotted field key the change touches. */
  fieldKey: string;
  /** Committed change: the commit sha. Undefined for an uncommitted pending change. */
  commitSha?: string;
  /** True when sourced from a live, uncommitted pending change (committed on deploy). */
  pending?: boolean;
  /** Pending-change id, when sourced from the store. */
  pendingId?: string;
}

/**
 * Seeded committed config changes available to roll out — each is a real commit
 * in the repo (sha + message), authored earlier in Configurations.
 */
export const CONFIG_PATCHES: ConfigPatch[] = [
  {
    id: "patch-dataflow-scale",
    label: "Dataflow profile instances → 3",
    summary: "Scale the default dataflow profile to add throughput on busier lines.",
    before: "1",
    after: "3",
    path: "config/dataflow-profile.yaml",
    fieldKey: "defaultDataflowInstanceCount",
    commitSha: "d4f1a08",
  },
  {
    id: "patch-opcua-sampling",
    label: "OPC UA sampling interval → 500 ms",
    summary: "Tighten asset telemetry sampling on the OPC UA connector.",
    before: "1000 ms",
    after: "500 ms",
    path: "config/opcua-connector.yaml",
    fieldKey: "opcuaSamplingInterval",
    commitSha: "9c2b7e1",
  },
  {
    id: "patch-secret-sync",
    label: "Enable Key Vault secret sync",
    summary: "Turn on secret sync so sites pull endpoint credentials from central Key Vault.",
    before: "off",
    after: "on",
    path: "config/secret-sync.yaml",
    fieldKey: "deployOptions.enableSecretSync",
    commitSha: "5a8f0d3",
  },
];

function fmtPatchVal(v: unknown): string {
  if (typeof v === "boolean") return v ? "on" : "off";
  return String(v);
}

/**
 * Convert live pending changes (authored in Configurations this session) into
 * deployable patches. Only patch-eligible fields qualify — deploy-time fields
 * (broker cardinality/memory, AIO release) roll via a release, not a patch.
 * These patches are uncommitted; deploying one commits it first.
 */
export function pendingChangesToPatches(pending: PendingChange[]): ConfigPatch[] {
  const out: ConfigPatch[] = [];
  for (const pc of pending) {
    for (const f of pc.fields) {
      const meta = fieldByPath(f.key);
      if (!meta || meta.applyVia !== "patch") continue;
      out.push({
        id: `pending-${pc.id}-${f.key}`,
        label: `${meta.label} → ${fmtPatchVal(f.after)}`,
        summary: `Authored this session on ${pc.siteName ?? pc.path}. Committed on deploy.`,
        before: fmtPatchVal(f.before),
        after: fmtPatchVal(f.after),
        path: pc.path,
        fieldKey: f.key,
        pending: true,
        pendingId: pc.id,
      });
    }
  }
  return out;
}

/** Recent deployment history seed. */
export const RECENT_DEPLOYMENTS: Deployment[] = [
  {
    id: "dep-1045",
    title: "Apply secret-sync to Gothenburg prod",
    kind: "config-apply",
    status: "waiting-approval",
    commitSha: "a1b9f3c",
    scopeLabel: "Gothenburg prod · 2",
    changes: [
      { siteName: "gothenburg-cutting-prod", before: "off", after: "on" },
      { siteName: "gothenburg-assembly-prod", before: "off", after: "on" },
    ],
    createdAt: "2026-06-10T07:55:00Z",
    requestedBy: "Magnus B.",
    approval: {
      routedTo: "ot-prod-approvers",
      status: "reached-cluster",
      requestedAt: "2026-06-10T07:55:00Z",
      updatedAt: "2026-06-10T08:06:00Z",
    },
  },
  {
    id: "dep-1044",
    title: "Upgrade Stockholm prod to 2606",
    kind: "release-upgrade",
    status: "deploying",
    commitSha: "f30c7a2",
    scopeLabel: "Stockholm prod · 2",
    changes: [
      { siteName: "stockholm-assembly-prod", before: "2605", after: "2606" },
      { siteName: "stockholm-bar-prod", before: "2605", after: "2606" },
    ],
    createdAt: "2026-06-10T08:02:00Z",
    requestedBy: "Priya N.",
    approvedBy: "Jonas W.",
  },
  {
    id: "dep-1043",
    title: "Deploy OPC UA connector to dev sites",
    kind: "solution-deploy",
    status: "succeeded",
    commitSha: "c5a1e90",
    scopeLabel: "Dev sites · 3",
    changes: [
      { siteName: "stockholm-dev", after: "+ OPC UA connector" },
      { siteName: "hamburg-dev", after: "+ OPC UA connector" },
      { siteName: "gothenburg-dev", after: "+ OPC UA connector" },
    ],
    createdAt: "2026-06-09T13:40:00Z",
    requestedBy: "Magnus B.",
    approvedBy: "Priya N.",
  },
  {
    id: "dep-1042",
    title: "Upgrade dev sites to 2605",
    kind: "release-upgrade",
    status: "succeeded",
    commitSha: "7d41e0b",
    scopeLabel: "Dev sites · 3",
    changes: [
      { siteName: "stockholm-dev", before: "2604", after: "2605" },
      { siteName: "hamburg-dev", before: "2604", after: "2605" },
      { siteName: "gothenburg-dev", before: "2604", after: "2605" },
    ],
    createdAt: "2026-06-09T08:12:00Z",
    requestedBy: "Magnus B.",
    approvedBy: "Priya N.",
  },
  {
    id: "dep-1041",
    title: "Apply secret-sync to Stockholm prod",
    kind: "config-apply",
    status: "succeeded",
    commitSha: "a1b9f3c",
    scopeLabel: "Stockholm prod · 2",
    changes: [
      { siteName: "stockholm-assembly-prod" },
      { siteName: "stockholm-bar-prod" },
    ],
    createdAt: "2026-06-08T14:25:00Z",
    requestedBy: "Priya N.",
    approvedBy: "Jonas W.",
  },
  {
    id: "dep-1040",
    title: "Rollback hamburg paintshop to e22a5f8",
    kind: "rollback",
    status: "succeeded",
    commitSha: "e22a5f8",
    scopeLabel: "cont-hamburg-paintshop-01",
    changes: [{ siteName: "cont-hamburg-paintshop-01", before: "2606", after: "2605" }],
    createdAt: "2026-06-07T10:02:00Z",
    requestedBy: "Jonas W.",
  },
  {
    id: "dep-1039",
    title: "Upgrade Hamburg prod to 2606",
    kind: "release-upgrade",
    status: "failed",
    commitSha: "staged",
    scopeLabel: "Hamburg prod · 1",
    changes: [{ siteName: "hamburg-assembly-prod", before: "2603", after: "2606" }],
    createdAt: "2026-06-06T18:20:00Z",
    requestedBy: "Magnus B.",
    approvedBy: "Priya N.",
  },
];

export function shortId(): string {
  return Math.random().toString(16).slice(2, 9);
}
