// Shared TS types mirroring Scale Kit YAML shapes from context/scale-kit-real-yaml/.
// Field names are copied verbatim. Do not invent fields.

export type AioReleaseId = "2512" | "2602" | "2603" | "2604" | "2605" | "2606";

export type ReleaseTrain = "stable" | "preview";

/**
 * Optional pin for a helm-chart workload carried as part of a release.
 * Only present on releases authored when the `manageInfra` capability is
 * in scope. AIO-only releases omit it entirely.
 */
export interface AppPin {
  /** Logical chart name as it appears on the cluster. */
  name: string;
  /** Versioned chart reference, e.g. "edge-control-3.2.0". */
  chart: string;
}

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
  /**
   * Optional cluster-distro pin (e.g. "aksee-1.7.230"). Present only on
   * releases authored for the infra-scope capability; lockstep with the
   * AIO version per decision §6 Q1 of the research note. AIO-only
   * releases omit this and render unchanged.
   */
  clusterPin?: string;
  /**
   * Optional Arc-for-servers connectedmachine agent pin (e.g. "1.45").
   * Same opt-in semantics as clusterPin.
   */
  arcAgentPin?: string;
  /** Optional helm-chart pins shipped together with this release. */
  appPins?: AppPin[];
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
  /**
   * Optional vertical layer stack below AIO. Present only on sites where
   * the operator has opted in to the infra-scope capability (and the
   * `manageInfra` toggle is on). Backwards-compatible: sites without
   * `layers` render exactly as they do today.
   *
   * Node / OS / hardware live in `nodeInfo` as read-only metadata only —
   * never a rollout target.
   */
  layers?: SiteLayers;
  /** Read-only OS / node context. Surfaced in the drawer; never a rollout target. */
  nodeInfo?: NodeInfo;
}

/** Health roll-up for a single layer of a site. Same vocab as site health. */
export type LayerHealth = HealthStatus;

/**
 * Drift signal for a layer: whether its `currentVersion` matches what the
 * site's release pin says the layer should be running. `none` = matches.
 * `behind` = current is older than the pin. `ahead` = current is newer
 * (manual override, rare). `unknown` = no release pin defines this layer.
 */
export type LayerDrift = "none" | "behind" | "ahead" | "unknown";

/** Common fields every layer carries. */
export interface LayerBase {
  /** Version actually running on the site. */
  currentVersion: string;
  /** Version the site's release pin says it should be on. */
  targetVersion: string;
  /** Health roll-up for the layer. */
  health: LayerHealth;
  /** ISO timestamp of the last successful apply for this layer. */
  lastApplied?: string;
  /** Drift state of currentVersion vs targetVersion. */
  drift: LayerDrift;
}

/** Cluster layer (e.g. AKS-EE 1.7.x). */
export interface ClusterLayer extends LayerBase {
  /** Distribution name shown to operators: e.g. "AKS-EE", "K3s". */
  distro: string;
}

/**
 * Arc-for-servers agent (connectedmachine agent), running on the host
 * VM/OS. OPTIONAL — host Arc-connection is not a hard prereq for AIO.
 * When the host is not Arc-connected, this layer is omitted entirely
 * (and `NodeInfo` should be treated as unknown rather than rendered).
 */
export interface ArcServerAgentLayer extends LayerBase {
  /** Channel the agent receives updates on, e.g. "stable". */
  channel?: string;
}

/**
 * Arc-for-Kubernetes agent, running inside the cluster. MANDATORY —
 * Arc-connection of the cluster is a hard prereq for installing AIO,
 * so every Launchpad-visible site has a known arc-k8s agent version.
 */
export interface ArcK8sAgentLayer extends LayerBase {
  /** Optional release channel for the agent, e.g. "stable". */
  channel?: string;
}

/**
 * A single helm-deployed customer workload observed on the cluster.
 *
 * Customer-owned, NOT a Launchpad-managed surface. Surfaced read-only
 * in the drawer so operators see what is running; health roll-up and
 * drift are intentionally not authoritative here — see the
 * "Design decisions taken 2026-05-28" entry in repo memory.
 */
export interface WorkloadLayer extends LayerBase {
  /** Logical chart name on the cluster, e.g. "edge-control". */
  name: string;
  /** Versioned chart reference, e.g. "edge-control-3.2.0". */
  chart: string;
}

/**
 * Vertical layer stack underneath AIO on a single site. Mirrors the
 * physical reality:
 *   Host (optional Arc-server) → Cluster (Arc-K8s, always) → AIO → (workloads)
 */
export interface SiteLayers {
  /** Cluster running the Arc-K8s agent + AIO. Always present on a layered site. */
  cluster?: ClusterLayer;
  /** Arc-for-servers agent. Present only when the host is Arc-connected. */
  arcServerAgent?: ArcServerAgentLayer;
  /** Arc-for-Kubernetes agent. Always present on a layered site (AIO hard prereq). */
  arcK8sAgent?: ArcK8sAgentLayer;
  /** Customer-owned workloads observed on the cluster. Read-only. */
  workloads?: WorkloadLayer[];
}

/**
 * Read-only OS / node context for a host that IS Arc-for-servers connected.
 * Surfaced in the drawer to explain cluster drift, but never a rollout target
 * — the underlying VM is customer-owned. When the host is not Arc-connected,
 * the site simply omits `nodeInfo` and the drawer shows an explicit
 * "Host not Arc-connected — node info unavailable" note instead.
 */
export interface NodeInfo {
  /** OS family + version label, e.g. "Windows Server 2022". */
  os: string;
  /** Kernel / build identifier when available. */
  kernel?: string;
  /** ISO timestamp of the last OS-patch apply known to us. */
  lastPatched?: string;
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
