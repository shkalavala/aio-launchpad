/**
 * ARM/Bicep module catalog — post-deployment changes the operator might want
 * to roll across a subset of sites. These represent the third rollout kind
 * (alongside AIO releases and Scale Kit sample apps): a single targeted
 * configuration change applied to an existing AIO install.
 *
 * In the real flow this would be a reference to a `samples/modules/<id>/`
 * folder in the connected Scale Kit fork. Fixture for now.
 */

export type ArmModuleCategory =
  | "dataflow"
  | "connector"
  | "secret"
  | "identity"
  | "role";

export interface ArmModule {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ArmModuleCategory;
  /** Repo path (Scale Kit `samples/modules/<slug>`). Stub fixture — folder may not exist. */
  repoPath: string;
  /** What this change creates or modifies on each target cluster. */
  changes: string[];
  /** Estimated per-site apply duration label, for the demo UI. */
  estimatedDuration: string;
}

export const ARM_MODULES: ArmModule[] = [
  {
    id: "add-dataflow-profile-low-latency",
    name: "Add low-latency dataflow profile",
    tagline: "Additional dataflow profile tuned for sub-second pipelines",
    description:
      "Adds a `low-latency` dataflow profile alongside the default one. Useful for sites where some assets need tighter end-to-end timing. Does not modify the default profile.",
    category: "dataflow",
    repoPath: "samples/modules/dataflow-low-latency",
    changes: [
      "New DataflowProfile CR named `low-latency`",
      "Companion ConfigMap with tuned buffer sizes",
    ],
    estimatedDuration: "~30s",
  },
  {
    id: "rotate-kv-cert",
    name: "Rotate Key Vault TLS cert",
    tagline: "Refresh the cert the SecretSync controller uses against KV",
    description:
      "Re-issues and binds a new TLS cert for the Key Vault client used by the SecretSync UAMI. Rolling this in canary first catches CA-trust issues before they hit prod sites.",
    category: "secret",
    repoPath: "samples/modules/rotate-kv-cert",
    changes: [
      "New cert in Key Vault (named with date suffix)",
      "SecretProviderClass updated to reference the new cert",
      "SecretSync controller restart on the target site",
    ],
    estimatedDuration: "~1m per site",
  },
  {
    id: "add-opcua-trust-chain",
    name: "Install OPC UA trust chain",
    tagline: "Add a customer CA cert to the OPC UA Trust List",
    description:
      "Appends a new root/intermediate CA to the AIO OPC UA Trust List. The `default` last-entry rule still applies (it cannot be deleted by this module). Required when a new PLC vendor's certificate authority comes online.",
    category: "connector",
    repoPath: "samples/modules/opcua-trust-chain",
    changes: [
      "New entry in `OpcUaTrustList` (idempotent — skipped if already present)",
      "No connector restart required",
    ],
    estimatedDuration: "~15s",
  },
];

export function getArmModule(id: string): ArmModule | undefined {
  return ARM_MODULES.find((m) => m.id === id);
}
