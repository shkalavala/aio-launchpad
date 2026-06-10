import type { FleetSite, SecretEntry, SecretSyncStatus } from "@/lib/types";
import { SECRETS_BY_SITE, CENTRAL_KVS, kvForSite, type CentralKeyVault } from "@/lib/fixtures/secrets";
import type { Deployment } from "@/lib/v2/deployments";
import { shortId } from "@/lib/v2/deployments";

/**
 * Fleet-wide secret VISIBILITY + certificate rotation.
 *
 * Boundary: secret VALUES live only in the central Key Vault, never in git and
 * never here. Launchpad shows the sync status (KV -> cluster, via the AIO
 * SecretSync controller) and lets an operator roll a certificate rotation
 * across the fleet as a patch. Declaring which secrets a site needs is part of
 * the site config; rotating the material is an operational fleet action.
 */

export interface SiteSecretRow {
  siteName: string;
  environment: string;
  kvName: string;
  secrets: SecretEntry[];
}

export interface FleetSecretRollup {
  vaults: ReadonlyArray<CentralKeyVault>;
  rows: SiteSecretRow[];
  total: number;
  byStatus: Record<SecretSyncStatus, number>;
  /** Sites + secrets that need attention (drift / error / missing). */
  attention: { siteName: string; secret: SecretEntry }[];
}

const EMPTY_STATUS: Record<SecretSyncStatus, number> = {
  synced: 0,
  syncing: 0,
  drift: 0,
  "missing-in-kv": 0,
  error: 0,
  never: 0,
};

export function fleetSecretRollup(fleet: FleetSite[]): FleetSecretRollup {
  const rows: SiteSecretRow[] = [];
  const byStatus: Record<SecretSyncStatus, number> = { ...EMPTY_STATUS };
  const attention: { siteName: string; secret: SecretEntry }[] = [];
  let total = 0;

  for (const fs of fleet) {
    const secrets = SECRETS_BY_SITE[fs.site.name];
    if (!secrets?.length) continue;
    rows.push({
      siteName: fs.site.name,
      environment: fs.runtime.environment,
      kvName: kvForSite(fs.site.name).name,
      secrets,
    });
    for (const s of secrets) {
      total++;
      const status = s.syncStatus ?? "synced";
      byStatus[status]++;
      if (status === "drift" || status === "error" || status === "missing-in-kv") {
        attention.push({ siteName: fs.site.name, secret: s });
      }
    }
  }

  return { vaults: CENTRAL_KVS, rows, total, byStatus, attention };
}

/** A TLS certificate secret rolls fleet-wide; this finds where it lives. */
export interface CertRotationTarget {
  secretName: string;
  sites: string[];
}

const CERT_HINT = /tls-cert|tls\.crt|-cert$/i;

/** Group rotatable certificate secrets by the sites that use them. */
export function rotatableCerts(fleet: FleetSite[]): CertRotationTarget[] {
  const bySecret = new Map<string, Set<string>>();
  for (const fs of fleet) {
    const secrets = SECRETS_BY_SITE[fs.site.name];
    if (!secrets?.length) continue;
    for (const s of secrets) {
      if (!CERT_HINT.test(s.secretName)) continue;
      if (!bySecret.has(s.secretName)) bySecret.set(s.secretName, new Set());
      bySecret.get(s.secretName)!.add(fs.site.name);
    }
  }
  return [...bySecret.entries()]
    .map(([secretName, sites]) => ({ secretName, sites: [...sites].sort() }))
    .sort((a, b) => a.secretName.localeCompare(b.secretName));
}

/**
 * Build the fleet-patch deployment that rotates a certificate: a new version
 * lands in the central Key Vault and SecretSync re-pulls it to every site that
 * declares it.
 */
export function buildCertRotation(target: CertRotationTarget, commitSha: string): Deployment {
  const n = target.sites.length;
  return {
    id: `dep-${shortId()}`,
    title: `Rotate ${target.secretName} across ${n} site${n === 1 ? "" : "s"}`,
    kind: "config-apply",
    status: "submitted",
    commitSha,
    scopeLabel: `${n} site${n === 1 ? "" : "s"}`,
    changes: target.sites.map((siteName) => ({ siteName, after: "new cert version" })),
    createdAt: new Date().toISOString(),
    requestedBy: "You",
  };
}
