// Helpers for the Screen 4 secrets-management surface. Pure transforms over
// SecretEntry — the store owns the per-session overlay.

import type { SecretEntry } from "@/lib/types";
import { kvForSite } from "@/lib/fixtures/secrets";

/** Derived per-row status displayed in the table. */
export type SecretStatus =
  | "synced"
  | "pending"
  | "error"
  | "drift"
  | "syncing"
  | "missing-in-kv";

export interface SecretRowView {
  entry: SecretEntry;
  /** Where the value comes from: central KV or per-site KV. */
  source: "central-kv" | "per-site";
  /** Synced if seeded in fixtures and not edited; pending if just added or edited this session; error if metadata invalid. */
  status: SecretStatus;
  effectiveK8sName: string;
  effectiveK8sKey: string;
}

const SECRET_NAME_RE = /^[a-z][a-z0-9-]{2,62}$/;

/** Default the k8s secret name + key to the secretName when not overridden. */
export function effectiveK8sName(entry: SecretEntry): string {
  return entry.kubernetesSecretName?.trim() || entry.secretName;
}
export function effectiveK8sKey(entry: SecretEntry): string {
  return entry.kubernetesSecretKey?.trim() || entry.secretName;
}

export function validateSecretName(name: string): string | undefined {
  if (!name.trim()) return "Secret name is required.";
  if (!SECRET_NAME_RE.test(name.trim())) {
    return "Secret name must be 3–63 chars, lowercase letters/digits/hyphens, starting with a letter.";
  }
  return undefined;
}

/**
 * Render the sync-secrets input YAML for a given site. Mirrors the shape in
 * context/scale-kit-real-yaml/input-sync-secrets.yaml. No secret values are
 * rendered inline — those live in a sites.local/ overlay or CI/CD secret store
 * (shown here as a commented-out stub for fidelity).
 *
 * `createInKv` polarity matches Scale Kit: default behavior is create-in-KV, so
 * we only emit `createInKv: false` when the entry explicitly references an
 * already-existing KV secret.
 */
export function renderSyncSecretsYaml(siteName: string, entries: SecretEntry[]): string {
  const kv = kvForSite(siteName);
  const lines: string[] = [
    `# input-sync-secrets.yaml — generated for ${siteName}`,
    `# Values are NOT in this file. Supply via sites.local/ overlay or CI/CD secret store.`,
    "",
    "# Resolved infrastructure (from upstream resolve-aio + secretsync steps)",
    `keyVaultName: "{{ steps.secretsync.outputs.keyVaultName }}"   # ${kv.name} (${kv.env})`,
    `spcName: "{{ steps.secretsync.outputs.spcResourceName }}"`,
    `managedIdentityClientId: "{{ steps.secretsync.outputs.managedIdentityClientId }}"`,
    `customLocationName: "{{ steps.resolve-aio.outputs.customLocationName }}"`,
    `instanceLocation: "{{ steps.resolve-aio.outputs.instanceLocation }}"`,
    "",
    "secrets:",
  ];
  if (entries.length === 0) {
    lines.push("  []");
  } else {
    for (const e of entries) {
      lines.push(`  - secretName: ${e.secretName}`);
      if (e.kubernetesSecretName?.trim()) {
        lines.push(`    kubernetesSecretName: ${e.kubernetesSecretName.trim()}`);
      }
      if (e.kubernetesSecretKey?.trim()) {
        lines.push(`    kubernetesSecretKey: ${e.kubernetesSecretKey.trim()}`);
      }
      if (e.createInKv === false) {
        lines.push(`    createInKv: false   # already exists in the Key Vault`);
      }
    }
  }
  lines.push("");
  lines.push("# secretValues: supplied out-of-band — sites.local/ overlay or CI/CD secret store.");
  lines.push("# secretValues:");
  for (const e of entries) {
    lines.push(`#   ${e.secretName}: <from-overlay>`);
  }
  lines.push("");
  return lines.join("\n");
}
