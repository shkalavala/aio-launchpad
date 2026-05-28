import type { AioRelease } from "../types";

/**
 * AIO release catalog.
 * Source: context/scale-kit-real-yaml/aio-release-*.yaml — values copied verbatim.
 */
export const RELEASES: AioRelease[] = [
  {
    id: "2512",
    aioVersion: "1.2.154",
    aioTrain: "stable",
    aioApiVersion: "2025-10-01",
    adrApiVersion: "2025-10-01",
    certManagerVersion: "0.7.0",
    certManagerTrain: "stable",
    secretStoreVersion: "1.1.5",
    secretStoreTrain: "stable",
  },
  {
    id: "2602",
    aioVersion: "1.2.189",
    aioTrain: "stable",
    aioApiVersion: "2025-10-01",
    adrApiVersion: "2025-10-01",
    certManagerVersion: "0.9.0",
    certManagerTrain: "stable",
    secretStoreVersion: "1.1.6",
    secretStoreTrain: "stable",
  },
  {
    id: "2603",
    aioVersion: "1.3.38",
    aioTrain: "stable",
    aioApiVersion: "2026-03-01",
    adrApiVersion: "2026-04-01",
    certManagerVersion: "0.10.2",
    certManagerTrain: "stable",
    secretStoreVersion: "1.3.0",
    secretStoreTrain: "stable",
  },
  {
    id: "2604",
    aioVersion: "1.3.70",
    aioTrain: "stable",
    aioApiVersion: "2026-03-01",
    adrApiVersion: "2026-04-01",
    certManagerVersion: "0.11.0",
    certManagerTrain: "stable",
    secretStoreVersion: "1.4.0",
    secretStoreTrain: "stable",
  },
  {
    id: "2605",
    aioVersion: "1.3.105",
    aioTrain: "stable",
    aioApiVersion: "2026-03-01",
    adrApiVersion: "2026-04-01",
    certManagerVersion: "0.12.0",
    certManagerTrain: "stable",
    secretStoreVersion: "1.4.1",
    secretStoreTrain: "stable",
    isDefault: true,
  },
  // 2606 is the first infra-scope-capable release: in addition to the AIO
  // bits it carries lockstep sub-pins for the cluster (AKS-EE), the
  // Arc-for-servers agent, and the workload helm charts that move with
  // the release (per the infra-scope research note §3.3 / §6 Q1). AIO-only
  // releases stay valid and unchanged; sub-pins are optional fields.
  {
    id: "2606",
    aioVersion: "1.3.118",
    aioTrain: "stable",
    aioApiVersion: "2026-03-01",
    adrApiVersion: "2026-04-01",
    certManagerVersion: "0.12.0",
    certManagerTrain: "stable",
    secretStoreVersion: "1.4.1",
    secretStoreTrain: "stable",
    clusterPin: "aksee-1.7.230",
    arcAgentPin: "1.45.01781",
    appPins: [
      { name: "edge-control", chart: "edge-control-3.2.0" },
      { name: "edge-telemetry", chart: "edge-telemetry-1.4.2" },
    ],
  },
];

export const RELEASES_BY_ID: Record<string, AioRelease> = Object.fromEntries(
  RELEASES.map((r) => [r.id, r]),
);

export const DEFAULT_RELEASE = RELEASES.find((r) => r.isDefault)!;
