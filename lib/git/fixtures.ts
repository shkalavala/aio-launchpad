// Seed data for the v2 git change-management layer. Fully mocked — no real
// GitHub reads or writes. Names stay generic Contoso per repo house rules.

import type { CommitRef, IncomingChange, RepoState, DriftRecord } from "./model";

export const V2_REPO: RepoState = {
  provider: "github",
  owner: "contoso-industries",
  repo: "aio-fleet",
  branch: "main",
  lastCommit: {
    sha: "a1b9f3c",
    message: "secret-sync: add opcua-trust to stockholm prod sites",
    author: "Priya N.",
    at: "2026-06-08T14:22:00Z",
  },
};

/**
 * Incoming changes already merged upstream that the operator has not yet
 * reconciled into their working view. Drives the Incoming Changes feed.
 */
export const INCOMING_CHANGES: IncomingChange[] = [
  {
    id: "inc-2605-dev",
    commit: {
      sha: "7d41e0b",
      message: "release: bump shared dev sites to 2605",
      author: "Magnus B.",
      at: "2026-06-09T08:05:00Z",
    },
    affectedSites: ["stockholm-dev", "hamburg-dev", "gothenburg-dev"],
    summary: "Pin shared dev environments to AIO release 2605.",
    perSite: [
      { siteName: "stockholm-dev", fields: [{ key: "properties.aioRelease", before: "2604", after: "2605" }] },
      { siteName: "hamburg-dev", fields: [{ key: "properties.aioRelease", before: "2604", after: "2605" }] },
      { siteName: "gothenburg-dev", fields: [{ key: "properties.aioRelease", before: "2604", after: "2605" }] },
    ],
  },
  {
    id: "inc-broker-prod",
    commit: {
      sha: "c92a7f1",
      message: "broker: raise replicas to 3 on stockholm assembly",
      author: "Priya N.",
      at: "2026-06-09T09:40:00Z",
    },
    affectedSites: ["stockholm-assembly-prod"],
    summary: "Increase MQTT broker replicas for assembly line resilience.",
    perSite: [
      {
        siteName: "stockholm-assembly-prod",
        fields: [{ key: "parameters.brokerConfig.replicas", before: 2, after: 3 }],
      },
    ],
  },
];

/**
 * Drift seed: portal/CLI edits that diverge from git, surfaced only after the
 * operator runs an on-demand drift check. Resolved through git, never applied
 * directly.
 */
export const DRIFT_RECORDS: DriftRecord[] = [
  {
    siteName: "hamburg-assembly-prod",
    direction: "portal-ahead",
    fields: [{ key: "parameters.dataflowProfile.instanceCount", before: 1, after: 2 }],
    detectedAt: "2026-06-09T07:55:00Z",
  },
  {
    siteName: "stockholm-assembly-prod",
    direction: "git-ahead",
    fields: [{ key: "deployOptions.enableSecretSync", before: false, after: true }],
    detectedAt: "2026-06-09T08:10:00Z",
  },
];

/** Convenience set of site names currently in a drift state. */
export const DRIFT_SITE_NAMES = new Set(DRIFT_RECORDS.map((d) => d.siteName));

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function emptyCommit(): CommitRef {
  return { sha: "", message: "", author: "", at: "" };
}
