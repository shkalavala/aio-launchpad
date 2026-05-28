import type { Site, SiteTemplate, FleetSite, SiteRuntime } from "../types";

/**
 * Site templates and sites mirroring context/scale-kit-real-yaml/cont-*.yaml.
 * Names, labels, locations, parameters, GUIDs — all copied verbatim from source.
 *
 * Contoso's domain language (used in the UI):
 *   - **Enterprise** = contoso-industries
 *   - **Site**       = geographic location (Stockholm / Hamburg / Gothenburg)
 *   - **Factory**    = a production line (assembly, bar lathes, cutting). 1:1 with an AIO instance.
 *   - **Shared dev** = one dev AIO instance per Site (geo), not per factory.
 *
 * Hierarchy:
 *   contoso-industries (enterprise)
 *     ├─ stockholm   (site, SE / swedencentral)
 *     │    ├─ stockholm-dev               (shared dev)
 *     │    ├─ stockholm-assembly-prod     (factory)
 *     │    └─ stockholm-bar-prod          (factory)
 *     ├─ hamburg         (site, DE / germanywestcentral)
 *     │    ├─ hamburg-dev                     (shared dev)
 *     │    └─ hamburg-assembly-prod           (factory)
 *     └─ gothenburg   (site, SE / swedencentral)
 *          ├─ gothenburg-dev               (shared dev)
 *          └─ gothenburg-cutting-prod      (factory)
 */

// ── Display-name lookups (UI-only; slugs stay verbatim for YAML credibility) ─
export const COUNTRY_NAMES: Record<string, string> = {
  SE: "Sweden",
  DE: "Germany",
};

/** factorySite slug → human label */
export const SITE_DISPLAY: Record<string, string> = {
  stockholm: "Stockholm",
  hamburg: "Hamburg",
  gothenburg: "Gothenburg",
};

/** plant slug → human label */
export const FACTORY_DISPLAY: Record<string, string> = {
  assembly: "Assembly line",
  bar: "Bar lathes",
  cutting: "Cutting equipment",
  packaging: "Packaging line",
  paintshop: "Paint shop",
};

/** "stockholm" + "SE" → "Stockholm, Sweden" */
export function siteDisplayName(factorySite: string | undefined, country: string | undefined) {
  const name = SITE_DISPLAY[factorySite ?? ""] ?? factorySite ?? "Unknown";
  const c = COUNTRY_NAMES[country ?? ""] ?? country;
  return c ? `${name}, ${c}` : name;
}

// ── Enterprise template ──────────────────────────────────────────────────────
// Enterprise-wide policy: every Contoso site participates in the cross-plant
// dataflow fabric and the global-site aggregation surface by default.
// Individual plants may opt out (see stockholm-bar, which sets
// includeDataflows: false because the bar lathes don't emit MQTT today).
const tplContosoAb: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "contoso-industries",
  labels: { enterprise: "contoso-industries" },
  properties: {
    deployOptions: {
      includeDataflows: true,
      enableGlobalSite: true,
    },
  },
};

// ── Geographic templates ─────────────────────────────────────────────────────
const tplStockholm: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "stockholm",
  inherits: "contoso-industries.yaml",
  location: "swedencentral",
  labels: { factorySite: "stockholm", country: "SE" },
};

const tplUlm: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "hamburg",
  inherits: "contoso-industries.yaml",
  location: "germanywestcentral",
  labels: { factorySite: "hamburg", country: "DE" },
};

const tplGothenburg: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "gothenburg",
  inherits: "contoso-industries.yaml",
  location: "swedencentral",
  labels: { factorySite: "gothenburg", country: "SE" },
};

// ── Plant templates ──────────────────────────────────────────────────────────
const tplStockholmAssembly: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "stockholm-assembly",
  inherits: "stockholm.yaml",
  labels: { plant: "assembly" },
  parameters: {
    eventHubNamespace: "stockholm-assembly-eventhubs",
    dataflowManagedIdentity: {
      clientId: "11111111-1111-1111-1111-111111111111",
      tenantId: "22222222-2222-2222-2222-222222222222",
    },
    networking: {
      vnetResourceGroup: "rg-network-stockholm",
      vnetName: "vnet-stockholm-assembly",
      subnetName: "snet-iot",
      privateDnsZoneIds: [],
    },
  },
  properties: { deployOptions: { includeDataflows: true } },
};

const tplStockholmBar: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "stockholm-bar",
  inherits: "stockholm.yaml",
  labels: { plant: "bar" },
  parameters: {
    eventHubNamespace: "stockholm-bar-eventhubs",
    dataflowManagedIdentity: {
      clientId: "33333333-3333-3333-3333-333333333333",
      tenantId: "22222222-2222-2222-2222-222222222222",
    },
    networking: {
      vnetResourceGroup: "rg-network-stockholm",
      vnetName: "vnet-stockholm-bar",
      subnetName: "snet-iot",
      privateDnsZoneIds: [],
    },
  },
  properties: { deployOptions: { includeDataflows: false } },
};

const tplUlmAssembly: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "hamburg-assembly",
  inherits: "hamburg.yaml",
  labels: { plant: "assembly" },
  parameters: {
    eventHubNamespace: "hamburg-assembly-eventhubs",
    dataflowManagedIdentity: {
      clientId: "44444444-4444-4444-4444-444444444444",
      tenantId: "55555555-5555-5555-5555-555555555555",
    },
    networking: {
      vnetResourceGroup: "rg-network-hamburg",
      vnetName: "vnet-hamburg-assembly",
      subnetName: "snet-iot",
      privateDnsZoneIds: [],
    },
  },
  properties: { deployOptions: { includeDataflows: true } },
};

const tplGothenburgCutting: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "gothenburg-cutting",
  inherits: "gothenburg.yaml",
  labels: { plant: "cutting" },
  parameters: {
    eventHubNamespace: "gothenburg-cutting-eventhubs",
    dataflowManagedIdentity: {
      clientId: "66666666-6666-6666-6666-666666666666",
      tenantId: "77777777-7777-7777-7777-777777777777",
    },
    networking: {
      vnetResourceGroup: "rg-network-gothenburg",
      vnetName: "vnet-gothenburg-cutting",
      subnetName: "snet-iot",
      privateDnsZoneIds: [],
    },
  },
  properties: { deployOptions: { includeDataflows: true } },
};

// ── Edge-gateway plant templates ─────────────────────────────────────────────
// Plants whose AIO instance runs on a customer-owned Windows Server VM at the
// edge (gateway model, not embedded on device). Used by the infra-scope
// fixture sites so the vertical layer stack (cluster + Arc-server agent +
// workloads) has somewhere to attach. Distro is tenant-scoped (AKS-EE — see
// tenant.ts) and intentionally NOT carried on the plant label.
const tplStockholmPackaging: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "stockholm-packaging",
  inherits: "stockholm.yaml",
  labels: { plant: "packaging" },
  parameters: {
    eventHubNamespace: "stockholm-edge-eventhubs",
    dataflowManagedIdentity: {
      clientId: "88888888-8888-8888-8888-888888888888",
      tenantId: "22222222-2222-2222-2222-222222222222",
    },
    networking: {
      vnetResourceGroup: "rg-network-stockholm",
      vnetName: "vnet-stockholm-edge",
      subnetName: "snet-iot",
      privateDnsZoneIds: [],
    },
  },
  properties: { deployOptions: { includeDataflows: true } },
};

const tplHamburgPaintshop: SiteTemplate = {
  apiVersion: "siteops/v1",
  kind: "SiteTemplate",
  name: "hamburg-paintshop",
  inherits: "hamburg.yaml",
  labels: { plant: "paintshop" },
  parameters: {
    eventHubNamespace: "hamburg-edge-eventhubs",
    dataflowManagedIdentity: {
      clientId: "99999999-9999-9999-9999-999999999999",
      tenantId: "55555555-5555-5555-5555-555555555555",
    },
    networking: {
      vnetResourceGroup: "rg-network-hamburg",
      vnetName: "vnet-hamburg-edge",
      subnetName: "snet-iot",
      privateDnsZoneIds: [],
    },
  },
  properties: { deployOptions: { includeDataflows: true } },
};

export const TEMPLATES: SiteTemplate[] = [
  tplContosoAb,
  tplStockholm,
  tplUlm,
  tplGothenburg,
  tplStockholmAssembly,
  tplStockholmBar,
  tplUlmAssembly,
  tplGothenburgCutting,
  tplStockholmPackaging,
  tplHamburgPaintshop,
];

const TEMPLATES_BY_NAME: Record<string, SiteTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.name, t]),
);

// ── Leaf sites (kind: Site) ──────────────────────────────────────────────────
const SUBSCRIPTION = "00000000-0000-0000-0000-000000000000";

function leaf(
  name: string,
  parentTemplate: string,
  env: "dev" | "prod",
  rg: string,
  aioInstanceName: string,
  extraParams: Record<string, unknown> = {},
): Site {
  return {
    apiVersion: "siteops/v1",
    kind: "Site",
    name,
    inherits: `shared/${parentTemplate}.yaml`,
    subscription: SUBSCRIPTION,
    resourceGroup: rg,
    labels: { environment: env },
    parameters: {
      aioInstanceName,
      envPrefix: env === "dev" ? "dev" : "",
      excludeEndpoints: [] as string[],
      ...extraParams,
    },
  };
}

/**
 * Contoso's real-world structure:
 *   - One **shared dev** AIO instance per site (geographic location), not per factory.
 *     Dev inherits from the geo template (e.g. stockholm.yaml) directly.
 *   - One **prod** AIO instance per factory (plant). A factory == one AIO instance.
 */
export const SITES: Site[] = [
  // Stockholm, Sweden — 1 shared dev + 2 prod factories
  leaf("stockholm-dev", "stockholm", "dev", "rg-stockholm-dev", "stockholm-dev-aio"),
  // Backfilled with cluster + arc-k8s layers (no host Arc-server agent) to
  // demonstrate the 'cluster IS Arc-connected, host is NOT' scenario — the
  // common case where the customer arc-onboarded their K8s cluster (required
  // for AIO) but did not arc-onboard the underlying VM/host.
  {
    ...leaf(
      "stockholm-assembly-prod",
      "stockholm-assembly",
      "prod",
      "rg-stockholm-assembly-prod",
      "stockholm-assembly-prod-aio",
    ),
    layers: {
      cluster: {
        distro: "AKS-EE",
        currentVersion: "1.7.230",
        targetVersion: "1.7.230",
        health: "healthy",
        lastApplied: "2026-05-04T07:12:00Z",
        drift: "none",
      },
      arcK8sAgent: {
        currentVersion: "1.21.6",
        targetVersion: "1.21.6",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-05-04T07:15:00Z",
        drift: "none",
      },
    },
  },
  leaf(
    "stockholm-bar-prod",
    "stockholm-bar",
    "prod",
    "rg-stockholm-bar-prod",
    "stockholm-bar-prod-aio",
  ),

  // Hamburg, Germany — 1 shared dev + 1 prod factory
  leaf("hamburg-dev", "hamburg", "dev", "rg-hamburg-dev", "hamburg-dev-aio"),
  {
    ...leaf(
      "hamburg-assembly-prod",
      "hamburg-assembly",
      "prod",
      "rg-hamburg-assembly-prod",
      "hamburg-assembly-prod-aio",
    ),
    layers: {
      cluster: {
        distro: "AKS-EE",
        currentVersion: "1.7.220",
        targetVersion: "1.7.230",
        health: "healthy",
        lastApplied: "2026-04-22T13:08:00Z",
        drift: "behind",
      },
      arcK8sAgent: {
        currentVersion: "1.21.6",
        targetVersion: "1.21.6",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-04-22T13:12:00Z",
        drift: "none",
      },
    },
  },

  // Gothenburg, Sweden — 1 shared dev + 1 prod factory
  leaf("gothenburg-dev", "gothenburg", "dev", "rg-gothenburg-dev", "gothenburg-dev-aio"),
  {
    ...leaf(
      "gothenburg-cutting-prod",
      "gothenburg-cutting",
      "prod",
      "rg-gothenburg-cutting-prod",
      "gothenburg-cutting-prod-aio",
    ),
    layers: {
      cluster: {
        distro: "AKS-EE",
        currentVersion: "1.7.230",
        targetVersion: "1.7.230",
        health: "healthy",
        lastApplied: "2026-05-19T09:30:00Z",
        drift: "none",
      },
      arcK8sAgent: {
        currentVersion: "1.20.9",
        targetVersion: "1.21.6",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-02-11T11:05:00Z",
        drift: "behind",
      },
    },
  },

  // ── Infra-scope fixture sites ──────────────────────────────────────────────────────
  // Two AKS-EE-on-Windows-Server edge gateway sites that demonstrate the
  // vertical layer stack (cluster + Arc-server agent + apps) when the
  // `manageInfra` toggle is on. Their leaf names carry the cont- prefix to
  // distinguish them as the post-infra-scope fixtures. They render exactly
  // like the other sites when the toggle is off — the layer surfaces are
  // gated.
  {
    ...leaf(
      "cont-stockholm-packaging-01",
      "stockholm-packaging",
      "prod",
      "rg-stockholm-edge-prod",
      "cont-stockholm-packaging-01-aio",
    ),
    properties: { aioRelease: "2606" },
    layers: {
      cluster: {
        distro: "AKS-EE",
        currentVersion: "1.7.220",
        targetVersion: "1.7.230",
        health: "healthy",
        lastApplied: "2026-04-30T08:14:00Z",
        drift: "behind",
      },
      // Host IS Arc-for-servers connected (so we know OS / kernel / patch state
      // and can drive Run Command into the OS).
      arcServerAgent: {
        currentVersion: "1.45.01781",
        targetVersion: "1.45.01781",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-05-12T03:22:00Z",
        drift: "none",
      },
      // Arc-K8s agent is a hard prereq for AIO — every layered site has this.
      arcK8sAgent: {
        currentVersion: "1.21.6",
        targetVersion: "1.21.6",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-05-12T03:25:00Z",
        drift: "none",
      },
      workloads: [
        {
          name: "edge-control",
          chart: "edge-control-3.2.0",
          currentVersion: "3.2.0",
          targetVersion: "3.2.0",
          health: "healthy",
          lastApplied: "2026-05-18T11:02:00Z",
          drift: "none",
        },
        {
          name: "edge-telemetry",
          chart: "edge-telemetry-1.4.2",
          currentVersion: "1.4.1",
          targetVersion: "1.4.2",
          health: "degraded",
          lastApplied: "2026-05-02T14:55:00Z",
          drift: "behind",
        },
      ],
    },
    nodeInfo: {
      os: "Windows Server 2022",
      kernel: "10.0.20348.2402",
      lastPatched: "2026-05-14T02:00:00Z",
    },
  },
  {
    ...leaf(
      "cont-hamburg-paintshop-01",
      "hamburg-paintshop",
      "prod",
      "rg-hamburg-edge-prod",
      "cont-hamburg-paintshop-01-aio",
    ),
    properties: { aioRelease: "2606" },
    layers: {
      cluster: {
        distro: "AKS-EE",
        currentVersion: "1.7.230",
        targetVersion: "1.7.230",
        health: "healthy",
        lastApplied: "2026-05-20T09:48:00Z",
        drift: "none",
      },
      // Host IS Arc-server connected; agent is one minor behind target.
      arcServerAgent: {
        currentVersion: "1.44.00992",
        targetVersion: "1.45.01781",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-03-28T07:12:00Z",
        drift: "behind",
      },
      arcK8sAgent: {
        currentVersion: "1.21.6",
        targetVersion: "1.21.6",
        channel: "stable",
        health: "healthy",
        lastApplied: "2026-05-20T09:52:00Z",
        drift: "none",
      },
      workloads: [
        {
          name: "edge-control",
          chart: "edge-control-3.2.0",
          currentVersion: "3.2.0",
          targetVersion: "3.2.0",
          health: "healthy",
          lastApplied: "2026-05-21T16:30:00Z",
          drift: "none",
        },
      ],
    },
    nodeInfo: {
      os: "Windows Server 2022",
      kernel: "10.0.20348.2402",
      lastPatched: "2026-05-10T02:00:00Z",
    },
  },
];

// ── Runtime overlay (UI-only) ────────────────────────────────────────────────
// Curated so the fleet view tells the right story:
//   - All shared dev environments are on the current release (2605, green).
//   - Three prod factories are stragglers on 2603/2604 (amber) — sets up Screen 3.
const RUNTIME: Record<string, SiteRuntime> = {
  "stockholm-dev": {
    siteName: "stockholm-dev",
    resolvedRelease: "2605",
    health: "healthy",
    lastDeployAt: "2026-05-19T10:48:00Z",
    environment: "dev",
  },
  "stockholm-assembly-prod": {
    siteName: "stockholm-assembly-prod",
    resolvedRelease: "2604",
    health: "degraded",
    lastDeployAt: "2026-04-22T13:02:00Z",
    environment: "prod",
  },
  "stockholm-bar-prod": {
    siteName: "stockholm-bar-prod",
    resolvedRelease: "2604",
    health: "degraded",
    lastDeployAt: "2026-04-22T13:12:00Z",
    environment: "prod",
  },
  "hamburg-dev": {
    siteName: "hamburg-dev",
    resolvedRelease: "2605",
    health: "healthy",
    lastDeployAt: "2026-05-20T07:33:00Z",
    environment: "dev",
  },
  "hamburg-assembly-prod": {
    siteName: "hamburg-assembly-prod",
    resolvedRelease: "2603",
    health: "degraded",
    lastDeployAt: "2026-03-11T08:55:00Z",
    environment: "prod",
  },
  "gothenburg-dev": {
    siteName: "gothenburg-dev",
    resolvedRelease: "2605",
    health: "healthy",
    lastDeployAt: "2026-05-20T16:21:00Z",
    environment: "dev",
  },
  "gothenburg-cutting-prod": {
    siteName: "gothenburg-cutting-prod",
    resolvedRelease: "2605",
    health: "healthy",
    lastDeployAt: "2026-05-15T11:07:00Z",
    environment: "prod",
  },
  "cont-stockholm-packaging-01": {
    siteName: "cont-stockholm-packaging-01",
    resolvedRelease: "2606",
    health: "healthy",
    lastDeployAt: "2026-05-22T09:14:00Z",
    environment: "prod",
  },
  "cont-hamburg-paintshop-01": {
    siteName: "cont-hamburg-paintshop-01",
    resolvedRelease: "2606",
    health: "degraded",
    lastDeployAt: "2026-05-20T09:48:00Z",
    environment: "prod",
  },
};

// ── Inheritance resolution ───────────────────────────────────────────────────
function templateNameFromInherits(inherits: string | undefined): string | undefined {
  if (!inherits) return undefined;
  // "shared/stockholm-assembly.yaml" → "stockholm-assembly"
  // "stockholm.yaml" → "stockholm"
  const tail = inherits.split("/").pop() ?? inherits;
  return tail.replace(/\.yaml$/, "");
}

function walkAncestry(site: Site): SiteTemplate[] {
  const chain: SiteTemplate[] = [];
  let cursor: SiteTemplate | undefined = TEMPLATES_BY_NAME[templateNameFromInherits(site.inherits) ?? ""];
  while (cursor) {
    chain.unshift(cursor); // parent-most first
    cursor = TEMPLATES_BY_NAME[templateNameFromInherits(cursor.inherits) ?? ""];
  }
  return chain;
}

export function resolveFleet(): FleetSite[] {
  return SITES.map((site) => {
    const ancestry = walkAncestry(site);
    const labels: Record<string, string> = {};
    for (const t of ancestry) Object.assign(labels, t.labels ?? {});
    Object.assign(labels, site.labels ?? {});
    const location =
      site.location ?? [...ancestry].reverse().find((t) => t.location)?.location ?? "unknown";
    return {
      site,
      ancestry,
      runtime: RUNTIME[site.name],
      resolvedLabels: labels,
      resolvedLocation: location,
    };
  });
}

export const FLEET: FleetSite[] = resolveFleet();

// ── Pending-install sites ────────────────────────────────────────────────────
// Sites that have been declared in the manifest (or, in production, synced
// from the IaC repo) but where AIO has not yet been installed on the
// underlying Arc cluster. These are the candidates surfaced by the Rollout
// “install” kind. They share template ancestry with the live fleet so the
// hierarchy story is intact — a new line at stockholm-assembly inherits the
// same defaults as the existing stockholm-assembly-prod site.
const PENDING_SITES: Site[] = [
  leaf(
    "stockholm-assembly-line3-prod",
    "stockholm-assembly",
    "prod",
    "rg-stockholm-assembly-prod",
    "stockholm-assembly-line3-prod-aio",
  ),
  leaf(
    "stockholm-bar-line2-prod",
    "stockholm-bar",
    "prod",
    "rg-stockholm-bar-prod",
    "stockholm-bar-line2-prod-aio",
  ),
  leaf(
    "hamburg-assembly-line2-dev",
    "hamburg-assembly",
    "dev",
    "rg-hamburg-assembly-dev",
    "hamburg-assembly-line2-dev-aio",
  ),
  leaf(
    "hamburg-assembly-line2-prod",
    "hamburg-assembly",
    "prod",
    "rg-hamburg-assembly-prod",
    "hamburg-assembly-line2-prod-aio",
  ),
  leaf(
    "gothenburg-cutting-line2-dev",
    "gothenburg-cutting",
    "dev",
    "rg-gothenburg-cutting-dev",
    "gothenburg-cutting-line2-dev-aio",
  ),
  leaf(
    "gothenburg-cutting-line2-prod",
    "gothenburg-cutting",
    "prod",
    "rg-gothenburg-cutting-prod",
    "gothenburg-cutting-line2-prod-aio",
  ),
];

function pendingRuntime(name: string, env: "dev" | "prod"): SiteRuntime {
  return {
    siteName: name,
    // Placeholder — install kind treats source = target for a fresh install.
    resolvedRelease: "2512",
    health: "healthy",
    lastDeployAt: new Date(0).toISOString(),
    environment: env,
    aioInstalled: false,
  };
}

export const PENDING_INSTALL_FLEET: FleetSite[] = PENDING_SITES.map((site) => {
  const ancestry = walkAncestry(site);
  const labels: Record<string, string> = {};
  for (const t of ancestry) Object.assign(labels, t.labels ?? {});
  Object.assign(labels, site.labels ?? {});
  const location =
    site.location ?? [...ancestry].reverse().find((t) => t.location)?.location ?? "unknown";
  const env = (site.labels?.environment as "dev" | "prod") ?? "prod";
  return {
    site,
    ancestry,
    runtime: pendingRuntime(site.name, env),
    resolvedLabels: labels,
    resolvedLocation: location,
  };
});
