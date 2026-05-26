// Per-site activity feed. Anchors the "what's happened on this site
// recently?" question that today forces an operator to jump between
// Source (pipeline runs), Secrets (sync history), and Rollout (recent
// strip). Pure fixture for the demo — values are plausible-shape only.
//
// Note: the drawer also enriches this list with live events derived from
// the session store (e.g. a completed rollout this session emits a
// release-upgraded event). That mixing lives in the drawer, not here.

export type SiteEventKind =
  | "release-upgraded"
  | "secret-synced"
  | "secret-error"
  | "manifest-applied"
  | "dataflow-restarted"
  | "health-changed"
  | "asset-discovered";

export interface SiteEvent {
  kind: SiteEventKind;
  // Minutes ago, relative to render time. Keeps the demo from drifting
  // out of "recently" as the prototype ages.
  minutesAgo: number;
  message: string;
  actor?: string; // github handle or "controller"
  // Optional pointers for deep-linking.
  pipelineRunId?: string;
  commitSha?: string;
}

export const EVENTS_BY_SITE: Record<string, SiteEvent[]> = {
  "stockholm-dev": [
    {
      kind: "release-upgraded",
      minutesAgo: 12,
      message: "Release pin moved 2604 -> 2605",
      actor: "akira.tanaka",
      pipelineRunId: "#284",
      commitSha: "a7f2b91",
    },
    {
      kind: "secret-synced",
      minutesAgo: 95,
      message: "Rotated opcua-credentials (3 keys)",
      actor: "mark.olsen",
      pipelineRunId: "#282",
      commitSha: "c91f08a",
    },
    {
      kind: "manifest-applied",
      minutesAgo: 1440,
      message: "shared/stockholm.yaml: tighten dataflow MI scope",
      actor: "central-it-bot",
      pipelineRunId: "#280",
      commitSha: "9d6a1b7",
    },
    {
      kind: "asset-discovered",
      minutesAgo: 2880,
      message: "Akri discovered 4 new OPC UA endpoints on line-2",
      actor: "controller",
    },
  ],
  "stockholm-assembly-prod": [
    {
      kind: "manifest-applied",
      minutesAgo: 1440,
      message: "shared/stockholm.yaml: tighten dataflow MI scope",
      actor: "central-it-bot",
      pipelineRunId: "#280",
      commitSha: "9d6a1b7",
    },
    {
      kind: "health-changed",
      minutesAgo: 38,
      message: "Health flipped to degraded — secret-sync controller behind",
      actor: "controller",
    },
    {
      kind: "secret-error",
      minutesAgo: 41,
      message: "opcua-broker-tls failed to sync — KV access policy missing",
      actor: "controller",
    },
  ],
  "stockholm-bar-prod": [
    {
      kind: "manifest-applied",
      minutesAgo: 1440,
      message: "shared/stockholm.yaml: tighten dataflow MI scope",
      actor: "central-it-bot",
      pipelineRunId: "#280",
      commitSha: "9d6a1b7",
    },
    {
      kind: "secret-synced",
      minutesAgo: 720,
      message: "rotated 2 of 7 secrets cleanly",
      actor: "controller",
    },
    {
      kind: "health-changed",
      minutesAgo: 4320,
      message: "Component drift: dataflow stuck on 0.6.3 (expected 0.6.8)",
      actor: "controller",
    },
  ],
  "hamburg-dev": [
    {
      kind: "manifest-applied",
      minutesAgo: 600,
      message: "hamburg-dev: enable dataflow profiler",
      actor: "lisa.bergstrom",
      pipelineRunId: "#278",
      commitSha: "31f9aa2",
    },
    {
      kind: "secret-synced",
      minutesAgo: 660,
      message: "All 6 secrets synced from central KV",
      actor: "controller",
    },
  ],
  "hamburg-assembly-prod": [
    {
      kind: "release-upgraded",
      minutesAgo: 180,
      message: "Release pin 2603 -> 2605 FAILED at aio-upgrade step",
      actor: "akira.tanaka",
      pipelineRunId: "#281",
      commitSha: "13b4e2f",
    },
    {
      kind: "secret-error",
      minutesAgo: 190,
      message: "2 secrets missing in central KV (opcua-broker-tls, dataflow-sas)",
      actor: "controller",
    },
  ],
  "gothenburg-dev": [
    {
      kind: "manifest-applied",
      minutesAgo: 2400,
      message: "gothenburg-dev: bootstrap aio instance",
      actor: "central-it-bot",
      pipelineRunId: "#272",
      commitSha: "84c1de9",
    },
  ],
  "gothenburg-cutting-prod": [
    {
      kind: "release-upgraded",
      minutesAgo: 47,
      message: "Release pin 2604 -> 2605",
      actor: "lisa.bergstrom",
      pipelineRunId: "#283",
      commitSha: "5e3d7c4",
    },
    {
      kind: "secret-synced",
      minutesAgo: 60,
      message: "1 secret syncing (rotation in progress)",
      actor: "controller",
    },
  ],
};
