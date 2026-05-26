// Shared TS types mirroring Scale Kit YAML shapes from context/scale-kit-real-yaml/.
// Field names are copied verbatim. Do not invent fields.

export type AioReleaseId = "2512" | "2602" | "2603" | "2604" | "2605";

export type ReleaseTrain = "stable" | "preview";

/** Mirrors context/scale-kit-real-yaml/aio-release-*.yaml */
export interface AioRelease {
  id: AioReleaseId;
  aioVersion: string;
  aioTrain: ReleaseTrain;
  aioApiVersion: string;
  adrApiVersion: string;
  certManagerVersion: string;
  certManagerTrain: ReleaseTrain;
  secretStoreVersion: string;
  secretStoreTrain: ReleaseTrain;
  isDefault?: boolean;
}

export type SiteKind = "SiteTemplate" | "Site";

/** Loose-typed shape because real YAML stuffs site-specific values here. */
export type SiteParameters = Record<string, unknown>;

export interface DeployOptions {
  enableGlobalSite?: boolean;
  enableEdgeSite?: boolean;
  enableSecretSync?: boolean;
  enableCertManager?: boolean;
  includeDataflows?: boolean;
}

export interface SiteProperties {
  aioRelease?: AioReleaseId;
  deployOptions?: DeployOptions;
}

export interface SiteBase {
  apiVersion: "siteops/v1";
  kind: SiteKind;
  /** Verbatim YAML name, e.g. "stockholm-assembly-dev". */
  name: string;
  /** Relative YAML path, e.g. "shared/stockholm-assembly.yaml". */
  inherits?: string;
  /** Azure region, e.g. "swedencentral". */
  location?: string;
  labels?: Record<string, string>;
  parameters?: SiteParameters;
  properties?: SiteProperties;
}

/** kind: SiteTemplate — used for inheritance (enterprise/geo/plant). */
export interface SiteTemplate extends SiteBase {
  kind: "SiteTemplate";
}

/** kind: Site — leaf site, deployable. Adds Azure binding fields. */
export interface Site extends SiteBase {
  kind: "Site";
  subscription: string;
  resourceGroup: string;
}

/** UI-only runtime overlay. NOT part of the YAML. */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";
/**
 * Environment slug. `dev` and `prod` are the conventional values used by the
 * shipping fixtures, but operators can introduce new ones (e.g. `qa`, `edge`,
 * `staging`) at site-add time. Treat this as a free-form label, not an enum.
 */
export type Environment = string;

export interface SiteRuntime {
  siteName: string;
  resolvedRelease: AioReleaseId;
  health: HealthStatus;
  lastDeployAt: string; // ISO timestamp
  environment: Environment;
  /**
   * Whether AIO has been installed on the underlying Arc cluster. Defaults
   * to true when omitted. Set false for sites that have been declared in
   * the manifest (or synced from the IaC repo) but never had a successful
   * AIO install — those are the candidates for the Rollout “install” kind.
   */
  aioInstalled?: boolean;
}

/**
 * Sync status for a single secret on a single site.
 *
 * - `synced`         — SecretSync controller pulled the latest KV version into the cluster.
 * - `syncing`        — reconcile in progress (controller saw a change, not finished).
 * - `drift`          — KV has a newer version than what's projected into the cluster Secret.
 * - `missing-in-kv`  — declared in manifest but no matching secret in central KV.
 * - `error`          — controller failed (KV access policy, network, etc); see `syncError`.
 * - `never`          — never synced (new site or fresh declaration).
 */
export type SecretSyncStatus =
  | "synced"
  | "syncing"
  | "drift"
  | "missing-in-kv"
  | "error"
  | "never";

/** Mirrors context/scale-kit-real-yaml/input-sync-secrets.yaml */
export interface SecretEntry {
  secretName: string;
  kubernetesSecretName?: string;
  kubernetesSecretKey?: string;
  createInKv?: boolean;
  /** Per-site runtime status. Omitted in fixtures means "synced". */
  syncStatus?: SecretSyncStatus;
  /** ISO timestamp of last successful sync. */
  lastSyncAt?: string;
  /** Free-text error from the SecretSync controller when status is "error". */
  syncError?: string;
}

/** Resolved view of a site for the UI: site + walked inheritance + runtime. */
export interface FleetSite {
  site: Site;
  /** Templates in inheritance order, parent-most first. */
  ancestry: SiteTemplate[];
  runtime: SiteRuntime;
  /** Convenience: collapsed labels from ancestry + self (self wins). */
  resolvedLabels: Record<string, string>;
  /** Convenience: resolved Azure location from ancestry. */
  resolvedLocation: string;
}
