import type { RingStrategy } from "./strategies";

/**
 * Sample app catalog — represents the Scale Kit `samples/` folder as
 * something an operator can browse and deploy to a ring of sites.
 *
 * The point of /apps is that "deploy a thing to a fleet" is a thing
 * Launchpad does, not just upgrading the platform itself. Each app maps
 * to a default ring strategy so a small demo can roll fast (dev-only)
 * while a connector deployment respects the standard canary→waves shape.
 */

export type SampleAppKind = "demo" | "connector" | "secrets" | "workload";

export interface SampleApp {
  id: string;
  name: string;
  /** One-line summary for cards. */
  tagline: string;
  /** Longer prose for the detail panel. */
  description: string;
  kind: SampleAppKind;
  /** Repo path (Scale Kit `samples/<slug>`). Stub fixture — folder may not exist. */
  repoPath: string;
  /** Suggested ring strategy id (lib/fixtures/strategies.ts) when first deployed. */
  defaultRingStrategyId: RingStrategy["id"];
  /** Environment guidance — dev = "do not put on prod sites". */
  recommendedEnv: "dev" | "prod" | "any";
  /** What this app installs on the cluster, in operator language. */
  creates: string[];
}

export const SAMPLE_APPS: SampleApp[] = [
  {
    id: "aio-simulator",
    name: "AIO Simulator",
    tagline: "Quickstart OPC UA data generator for empty clusters",
    description:
      "A throwaway workload that mimics an OPC UA server with a handful of tags. Useful for proving the dataflow pipeline end-to-end before any real OT equipment is wired up. Not a production artifact — uninstall once a real connector is in place.",
    kind: "demo",
    repoPath: "samples/aio-simulator",
    defaultRingStrategyId: "dev-only",
    recommendedEnv: "dev",
    creates: [
      "Simulator deployment (single pod)",
      "Internal OPC UA endpoint",
      "Sample asset definitions",
    ],
  },
  {
    id: "opc-ua-solution",
    name: "OPC UA Solution",
    tagline: "Connector + dataflow profile + asset endpoint wiring",
    description:
      "The reference end-to-end OPC UA setup: a connector template, a default dataflow profile, and the asset-endpoint CRs that point at a real PLC. Designed for production use; expects the operator to fill in endpoint URL and credentials per site.",
    kind: "connector",
    repoPath: "samples/opc-ua-solution",
    defaultRingStrategyId: "standard",
    recommendedEnv: "any",
    creates: [
      "OPC UA connector template",
      "Default dataflow profile",
      "Asset endpoint CRs (placeholder)",
    ],
  },
  {
    id: "secret-sync-sample",
    name: "Secret Sync Sample",
    tagline: "Reference Key Vault → cluster secret reconciliation",
    description:
      "A minimal example that shows how a site's declared secret list gets reconciled from the central Key Vault via the SecretSync controller. Useful as a smoke test after Day-0 pre-flight, or as a copy-paste base for new secret entries.",
    kind: "secrets",
    repoPath: "samples/secret-sync",
    defaultRingStrategyId: "cautious",
    recommendedEnv: "any",
    creates: [
      "SecretProviderClass (SPC)",
      "SecretSync CR for one sample secret",
      "Mounted-secret demo pod",
    ],
  },
];

export function getSampleApp(id: string): SampleApp | undefined {
  return SAMPLE_APPS.find((a) => a.id === id);
}
