// Mocked pipeline-run history for the Developer screen. Represents the
// last N CI runs against the manifest repo. Each run lists which sites
// were touched and how the Scale Kit stage ended. Pure fixture — no live
// integration. Realistic enough to anchor the demo claim that the
// manifest repo is truth and the pipeline is how truth reaches the fleet.

export type PipelineStatus = "success" | "running" | "failed" | "cancelled";

export interface PipelineRun {
  id: string;              // short run id (e.g. "#284")
  commitSha: string;       // 7-char prefix
  commitMessage: string;
  author: string;          // github handle
  startedAtMinutesAgo: number;
  durationSeconds: number;
  status: PipelineStatus;
  sitesChanged: string[];  // site names touched in this run
  scaleKitStep: {
    name: string;          // e.g. "aio-instance", "sync-secrets"
    status: PipelineStatus;
  };
}

export const PIPELINE_RUNS: PipelineRun[] = [
  {
    id: "#284",
    commitSha: "a7f2b91",
    commitMessage: "stockholm-dev: pin to release 2605",
    author: "akira.tanaka",
    startedAtMinutesAgo: 12,
    durationSeconds: 184,
    status: "success",
    sitesChanged: ["stockholm-dev"],
    scaleKitStep: { name: "aio-upgrade", status: "success" },
  },
  {
    id: "#283",
    commitSha: "5e3d7c4",
    commitMessage: "gothenburg-cutting-prod: bump aioRelease to 2605",
    author: "lisa.bergstrom",
    startedAtMinutesAgo: 47,
    durationSeconds: 312,
    status: "success",
    sitesChanged: ["gothenburg-cutting-prod"],
    scaleKitStep: { name: "aio-upgrade", status: "success" },
  },
  {
    id: "#282",
    commitSha: "c91f08a",
    commitMessage: "rotate opcua creds for stockholm-dev",
    author: "mark.olsen",
    startedAtMinutesAgo: 95,
    durationSeconds: 41,
    status: "success",
    sitesChanged: ["stockholm-dev"],
    scaleKitStep: { name: "sync-secrets", status: "success" },
  },
  {
    id: "#281",
    commitSha: "13b4e2f",
    commitMessage: "WIP: hamburg-assembly-prod release 2605 bump",
    author: "akira.tanaka",
    startedAtMinutesAgo: 180,
    durationSeconds: 96,
    status: "failed",
    sitesChanged: ["hamburg-assembly-prod"],
    scaleKitStep: { name: "aio-upgrade", status: "failed" },
  },
  {
    id: "#280",
    commitSha: "9d6a1b7",
    commitMessage: "shared/stockholm.yaml: tighten dataflow MI scope",
    author: "central-it-bot",
    startedAtMinutesAgo: 1440,
    durationSeconds: 408,
    status: "success",
    sitesChanged: [
      "stockholm-dev",
      "stockholm-assembly-prod",
      "stockholm-bar-prod",
    ],
    scaleKitStep: { name: "aio-upgrade", status: "success" },
  },
];

export function pipelineRunUrl(run: PipelineRun): string {
  // Cosmetic. Mirrors the manifest repo from manifests.ts.
  return `https://github.com/contoso-iot/aio-manifests/actions/runs/${run.id.replace("#", "")}`;
}
