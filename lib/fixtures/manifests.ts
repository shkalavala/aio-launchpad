// Manifest repo fixture for the Developer screen. Mirrors the actual Scale Kit
// workspace layout (Azure/digital-ops-scale-kit) as inline string constants so
// the prototype has no FS / fetch dependency. Tree shape matches the real
// workspaces/iot-operations/ layout:
//
//   sites/                       — per-site Site manifests (kind: Site, leaf nodes)
//   sites/shared/                — SiteTemplate inheritance chain (kind: SiteTemplate)
//   parameters/aio-releases/     — pinned AIO release configs (one file per release)
//   parameters/inputs/           — fan-in inputs for Scale Kit steps (sync-secrets, etc.)
//
// Per docs/site-configuration.md, `aioRelease` lives at `properties.aioRelease`
// and capability gates live at `properties.deployOptions.*`. Per
// docs/aio-releases.md, the workspace default `aioRelease` is set on
// `sites/shared/base-site.yaml` and every other site inherits it.
//
// Edits in Launchpad are never source of truth — the manifest repo is. The
// Developer screen is read-only and points to GitHub for proposed edits.

export type ManifestNodeKind = "site" | "template" | "release" | "input";

export interface ManifestFile {
  path: string;            // e.g. "sites/stockholm-dev.yaml"
  name: string;            // e.g. "stockholm-dev.yaml"
  folder: string;          // e.g. "sites" or "sites/shared"
  kind: ManifestNodeKind;
  yaml: string;
  // Quick parsed fields for the sidebar. Avoid a real yaml parser dep.
  parsed: {
    apiVersion?: string;
    kind?: string;
    name?: string;
    inherits?: string;
    aioRelease?: string;   // resolved from properties.aioRelease (own or inherited)
    labels?: Array<[string, string]>;
  };
}

const FILES: ManifestFile[] = [
  // ── Concrete Sites ─────────────────────────────────────────────────────────
  {
    path: "sites/stockholm-dev.yaml",
    name: "stockholm-dev.yaml",
    folder: "sites",
    kind: "site",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "Site",
      name: "stockholm-dev",
      inherits: "shared/stockholm.yaml",
      aioRelease: "2605",
      labels: [["environment", "dev"]],
    },
    yaml: `# Stockholm shared dev instance. One AIO instance covers both the assembly
# and bar lines in dev — plant-level isolation only kicks in for prod.
# Inherits aioRelease (2605) and deployOptions from base-site.yaml via the chain.
apiVersion: siteops/v1
kind: Site
name: stockholm-dev
inherits: shared/stockholm.yaml

subscription: "00000000-0000-0000-0000-000000000000"
resourceGroup: rg-stockholm-dev

labels:
  environment: dev

# No properties.aioRelease override — picks up "2605" from base-site.yaml.
`,
  },
  {
    path: "sites/stockholm-assembly-prod.yaml",
    name: "stockholm-assembly-prod.yaml",
    folder: "sites",
    kind: "site",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "Site",
      name: "stockholm-assembly-prod",
      inherits: "shared/stockholm-assembly.yaml",
      aioRelease: "2604",
      labels: [["environment", "prod"]],
    },
    yaml: `apiVersion: siteops/v1
kind: Site
name: stockholm-assembly-prod
inherits: shared/stockholm-assembly.yaml

subscription: "00000000-0000-0000-0000-000000000000"
resourceGroup: rg-stockholm-assembly-prod

labels:
  environment: prod

properties:
  # Pin one release behind the workspace default by policy.
  aioRelease: "2604"
`,
  },
  {
    path: "sites/hamburg-assembly-prod.yaml",
    name: "hamburg-assembly-prod.yaml",
    folder: "sites",
    kind: "site",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "Site",
      name: "hamburg-assembly-prod",
      inherits: "shared/hamburg-assembly.yaml",
      aioRelease: "2603",
      labels: [["environment", "prod"]],
    },
    yaml: `apiVersion: siteops/v1
kind: Site
name: hamburg-assembly-prod
inherits: shared/hamburg-assembly.yaml

subscription: "00000000-0000-0000-0000-000000000001"
resourceGroup: rg-hamburg-assembly-prod

labels:
  environment: prod

properties:
  # Furthest behind — needs a controlled upgrade to 2604 next.
  aioRelease: "2603"
`,
  },

  // ── Shared SiteTemplates ───────────────────────────────────────────────────
  {
    path: "sites/shared/base-site.yaml",
    name: "base-site.yaml",
    folder: "sites/shared",
    kind: "template",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "SiteTemplate",
      name: "base-site",
      aioRelease: "2605",
      labels: [["managedBy", "siteops"]],
    },
    yaml: `# Workspace root template. Every site inherits from this transitively.
# Sets the workspace default aioRelease and capability gates per
# docs/aio-releases.md and docs/site-configuration.md.
apiVersion: siteops/v1
kind: SiteTemplate
name: base-site

properties:
  # Default AIO release for the whole workspace. Selects which
  # parameters/aio-releases/<release>.yaml gets loaded.
  aioRelease: "2605"

  # Capability gates evaluated by manifest \`when:\` conditions.
  deployOptions:
    enableCertManager: true
    enableSecretSync: true
    enableGlobalSite: false
    enableEdgeSite: false

  tags:
    project: iot-operations
    managedBy: siteops
`,
  },
  {
    path: "sites/shared/contoso-industries.yaml",
    name: "contoso-industries.yaml",
    folder: "sites/shared",
    kind: "template",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "SiteTemplate",
      name: "contoso-industries",
      inherits: "base-site.yaml",
      labels: [["enterprise", "contoso-industries"]],
    },
    yaml: `# Enterprise-level defaults shared across all Contoso Industries sites.
# Policy: every plant participates in the cross-plant dataflow fabric and
# the global-site aggregation surface unless it explicitly opts out
# (see stockholm-bar.yaml — bar lathes don't emit MQTT today).
apiVersion: siteops/v1
kind: SiteTemplate
name: contoso-industries
inherits: base-site.yaml

labels:
  enterprise: contoso-industries

properties:
  deployOptions:
    includeDataflows: true
    enableGlobalSite: true
`,
  },
  {
    path: "sites/shared/stockholm.yaml",
    name: "stockholm.yaml",
    folder: "sites/shared",
    kind: "template",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "SiteTemplate",
      name: "stockholm",
      inherits: "contoso-industries.yaml",
      labels: [
        ["factorySite", "stockholm"],
        ["country", "SE"],
      ],
    },
    yaml: `# Stockholm geographic site. All Stockholm factories inherit from this.
apiVersion: siteops/v1
kind: SiteTemplate
name: stockholm
inherits: contoso-industries.yaml

location: swedencentral

labels:
  factorySite: stockholm
  country: SE
`,
  },
  {
    path: "sites/shared/stockholm-assembly.yaml",
    name: "stockholm-assembly.yaml",
    folder: "sites/shared",
    kind: "template",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "SiteTemplate",
      name: "stockholm-assembly",
      inherits: "stockholm.yaml",
      labels: [["plant", "assembly"]],
    },
    yaml: `# Stockholm Assembly — assembly line stations and EOL testing.
apiVersion: siteops/v1
kind: SiteTemplate
name: stockholm-assembly
inherits: stockholm.yaml

labels:
  plant: assembly

# enableSecretSync is already on via base-site.yaml; this template is the
# right hook to bump capability gates per-plant if and when needed.
properties:
  deployOptions:
    enableCertManager: true
    enableSecretSync: true
`,
  },
  {
    path: "sites/shared/hamburg.yaml",
    name: "hamburg.yaml",
    folder: "sites/shared",
    kind: "template",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "SiteTemplate",
      name: "hamburg",
      inherits: "contoso-industries.yaml",
      labels: [
        ["factorySite", "hamburg"],
        ["country", "DE"],
      ],
    },
    yaml: `# Hamburg geographic site. All Hamburg factories inherit from this.
apiVersion: siteops/v1
kind: SiteTemplate
name: hamburg
inherits: contoso-industries.yaml

location: germanywestcentral

labels:
  factorySite: hamburg
  country: DE
`,
  },
  {
    path: "sites/shared/hamburg-assembly.yaml",
    name: "hamburg-assembly.yaml",
    folder: "sites/shared",
    kind: "template",
    parsed: {
      apiVersion: "siteops/v1",
      kind: "SiteTemplate",
      name: "hamburg-assembly",
      inherits: "hamburg.yaml",
      labels: [["plant", "assembly"]],
    },
    yaml: `# Hamburg Assembly — plant-level template for the Hamburg assembly line.
apiVersion: siteops/v1
kind: SiteTemplate
name: hamburg-assembly
inherits: hamburg.yaml

labels:
  plant: assembly

properties:
  deployOptions:
    enableCertManager: true
    enableSecretSync: true
`,
  },

  // ── Release configs ────────────────────────────────────────────────────────
  {
    path: "parameters/aio-releases/2605.yaml",
    name: "2605.yaml",
    folder: "parameters/aio-releases",
    kind: "release",
    parsed: {
      name: "2605",
      labels: [
        ["aioVersion", "1.3.105"],
        ["train", "stable"],
      ],
    },
    yaml: `# AIO release 2605. Selected by site.properties.aioRelease: "2605".
# Source: https://github.com/Azure/azure-iot-ops-cli-extension/wiki/IoT-Operations-versions#2605
# Siteops auto-forwards matching params to the Bicep dispatchers per
# docs/aio-releases.md.

aioVersion: "1.3.105"           # AIO extension version pinned in Arc
aioTrain: stable                # Extension release train
aioApiVersion: "2026-03-01"     # Microsoft.IoTOperations/instances API version
adrApiVersion: "2026-04-01"     # Microsoft.DeviceRegistry/namespaces API version
certManagerVersion: "0.12.0"
certManagerTrain: stable
secretStoreVersion: "1.4.1"
secretStoreTrain: stable
`,
  },

  // ── Step inputs ────────────────────────────────────────────────────────────
  {
    path: "parameters/inputs/sync-secrets.yaml",
    name: "sync-secrets.yaml",
    folder: "parameters/inputs",
    kind: "input",
    parsed: {
      name: "sync-secrets",
      labels: [["consumedBy", "sync-secrets step"]],
    },
    yaml: `# Inputs to the sync-secrets step (templates/secretsync/sync-secrets.bicep).
# Values are NEVER committed to this repo — secretValues is decorated with
# @secure() in the Bicep template. Per docs/secret-sync.md, values come from:
#   - sites.local/ overlays (gitignored, for local development), or
#   - CI/CD secrets (GitHub Actions secrets / Azure DevOps variable groups), or
#   - CLI --parameters at deploy time.
#
# This example matches stockholm-assembly-prod; each site supplies its own
# input via the same shape.

# Resolved infrastructure (output-chained from upstream steps).
keyVaultName: "{{ steps.enable-secretsync.outputs.keyVaultName }}"
spcName: "{{ steps.enable-secretsync.outputs.spcResourceName }}"
managedIdentityClientId: "{{ steps.enable-secretsync.outputs.managedIdentityClientId }}"
customLocationName: "{{ steps.resolve-aio.outputs.customLocationName }}"
instanceLocation: "{{ steps.resolve-aio.outputs.instanceLocation }}"

# Per-site secret inventory. Each entry is metadata only; values live in KV.
secrets:
  - secretName: opcua-plc-line-a-username
  - secretName: opcua-plc-line-a-password
  - secretName: opcua-plc-line-b-username
  - secretName: opcua-plc-line-b-password
  - secretName: dataflow-eventhub-conn
    kubernetesSecretName: aio-dataflow-eh
    kubernetesSecretKey: connectionString
  - secretName: mqtt-broker-tls-cert
    kubernetesSecretName: aio-mqtt-tls
    kubernetesSecretKey: tls.crt
  - secretName: mqtt-broker-tls-key
    kubernetesSecretName: aio-mqtt-tls
    kubernetesSecretKey: tls.key
`,
  },
];

export const MANIFEST_FILES = FILES;

// Tree grouping by folder, in canonical display order. Matches the real
// workspaces/iot-operations/ layout in Azure/digital-ops-scale-kit.
const FOLDER_ORDER: string[] = [
  "sites",
  "sites/shared",
  "parameters/aio-releases",
  "parameters/inputs",
];


export const MANIFEST_TREE: Array<{ folder: string; files: ManifestFile[] }> =
  FOLDER_ORDER.map((folder) => ({
    folder,
    files: FILES.filter((f) => f.folder === folder).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  })).filter((g) => g.files.length > 0);

export function getManifestByPath(path: string): ManifestFile | undefined {
  return FILES.find((f) => f.path === path);
}

export const DEFAULT_MANIFEST_PATH = "sites/stockholm-dev.yaml";

// Repo metadata for the "Open in GitHub" deep link. Not a real repo —
// purely cosmetic for the prototype.
export const MANIFEST_REPO = {
  org: "contoso-iot",
  repo: "aio-manifests",
  defaultBranch: "main",
};

export function githubFileUrl(path: string): string {
  return `https://github.com/${MANIFEST_REPO.org}/${MANIFEST_REPO.repo}/blob/${MANIFEST_REPO.defaultBranch}/${path}`;
}

export function githubEditUrl(path: string): string {
  return `https://github.com/${MANIFEST_REPO.org}/${MANIFEST_REPO.repo}/edit/${MANIFEST_REPO.defaultBranch}/${path}`;
}
