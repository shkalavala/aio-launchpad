import type { Tone } from "@/lib/v2/format";

export type DeployKind = "release-upgrade" | "config-apply" | "rollback" | "solution-deploy";
export type DeployStatus =
  | "waiting-approval"
  | "submitted"
  | "deploying"
  | "in-progress"
  | "queued"
  | "succeeded"
  | "failed";

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
  approvedBy?: string;
}

export const KIND_META: Record<DeployKind, { label: string }> = {
  "release-upgrade": { label: "Release upgrade" },
  "config-apply": { label: "Config apply" },
  rollback: { label: "Rollback" },
  "solution-deploy": { label: "Solution deploy" },
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
 * Staged config changes available to push onto sites. A patch is a narrow
 * parameter change already authored (in the config editor or upstream, e.g.
 * DOE) and committed to the fleet repo — "apply patch" rolls it forward across
 * sites, as opposed to a solution-deploy which stands up new capability.
 */
export interface ConfigPatch {
  id: string;
  label: string;
  summary: string;
  before: string;
  after: string;
}

export const CONFIG_PATCHES: ConfigPatch[] = [
  {
    id: "patch-broker-mem",
    label: "Broker memory profile → Medium",
    summary: "Authored in the config editor, staged in git.",
    before: "Low",
    after: "Medium",
  },
  {
    id: "patch-dataflow-count",
    label: "Default dataflow instances → 2",
    summary: "Scale dataflow throughput on busier lines.",
    before: "1",
    after: "2",
  },
  {
    id: "patch-secret-sync",
    label: "Enable Key Vault secret sync",
    summary: "Turn on secret sync so sites pull from central KV.",
    before: "off",
    after: "on",
  },
];

/** Recent deployment history seed. */
export const RECENT_DEPLOYMENTS: Deployment[] = [
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
