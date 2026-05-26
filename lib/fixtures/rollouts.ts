// Mocked rollout history. Today the store does not retain past rollouts —
// it's a single-current-rollout state machine. Until the Changes model
// (see repo memory) lands, this fixture stands in as "what did we ship?"
// so /rollout can answer that question at all.
//
// Entries are intentionally varied across kind / outcome to make the strip
// meaningful in the demo: a recent successful release rollout, a paused
// install, a failed app deploy, an applied ARM module.

import type { AioReleaseId } from "@/lib/types";

export type RolloutKind = "release" | "install" | "app" | "arm";
export type RolloutOutcome = "succeeded" | "failed" | "cancelled";

export interface RolloutRecord {
  id: string;
  kind: RolloutKind;
  /** Set when kind === "release" or "install". */
  releaseId?: AioReleaseId;
  /** Set when kind === "app". */
  appName?: string;
  /** Set when kind === "arm". */
  armName?: string;
  siteCount: number;
  /** Human label for the ring strategy used (matches lib/rings.ts labels). */
  ringStrategy?: string;
  /** ISO timestamp the rollout started. */
  startedAt: string;
  /** ISO timestamp the rollout reached a terminal state. */
  finishedAt: string;
  outcome: RolloutOutcome;
  /** Free-text reason when outcome !== "succeeded". */
  note?: string;
  /** Who kicked it off. */
  triggeredBy?: string;
}

export const ROLLOUT_HISTORY: RolloutRecord[] = [
  {
    id: "ro-2026-05-25-01",
    kind: "release",
    releaseId: "2605",
    siteCount: 4,
    ringStrategy: "Canary → Wave 1 → Wave 2",
    startedAt: "2026-05-25T08:12:00Z",
    finishedAt: "2026-05-25T11:48:00Z",
    outcome: "succeeded",
    triggeredBy: "you",
  },
  {
    id: "ro-2026-05-22-02",
    kind: "arm",
    armName: "Dataflow MI scope tighten",
    siteCount: 3,
    ringStrategy: "Canary → Wave 1",
    startedAt: "2026-05-22T13:40:00Z",
    finishedAt: "2026-05-22T14:05:00Z",
    outcome: "succeeded",
    triggeredBy: "you",
  },
  {
    id: "ro-2026-05-19-01",
    kind: "app",
    appName: "OPC UA Connector",
    siteCount: 2,
    ringStrategy: "Single ring",
    startedAt: "2026-05-19T09:02:00Z",
    finishedAt: "2026-05-19T09:18:00Z",
    outcome: "failed",
    note: "Helm install failed on stockholm-bar-prod (image pull timeout)",
    triggeredBy: "you",
  },
  {
    id: "ro-2026-05-15-03",
    kind: "install",
    releaseId: "2604",
    siteCount: 1,
    ringStrategy: "Single ring",
    startedAt: "2026-05-15T15:30:00Z",
    finishedAt: "2026-05-15T16:22:00Z",
    outcome: "succeeded",
    note: "Greenfield install on gothenburg-cutting-prod",
    triggeredBy: "ops-bot",
  },
  {
    id: "ro-2026-05-12-01",
    kind: "release",
    releaseId: "2604",
    siteCount: 7,
    ringStrategy: "Canary → Wave 1 → Wave 2",
    startedAt: "2026-05-12T07:00:00Z",
    finishedAt: "2026-05-12T08:14:00Z",
    outcome: "cancelled",
    note: "Cancelled after Canary ring — pre-prod schema drift detected",
    triggeredBy: "you",
  },
];
