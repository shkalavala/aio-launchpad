import type { FleetSite } from "@/lib/types";

/**
 * Read-only fleet resource VISIBILITY model.
 *
 * Boundary (plan of record): Launchpad does NOT author dataflows, assets, or
 * destinations — that is DOE's job. This module only summarises what each site
 * already runs so an operator can answer "what is this site collecting and
 * where does it send?". Everything here is derived deterministically from the
 * site's resolved config + ancestry (Event Hub namespace); nothing is editable.
 */

export interface DataflowSummary {
  name: string;
  /** Where data comes from (OPC UA assets / MQTT topic). */
  source: string;
  /** Where data goes (an endpoint name). */
  destination: string;
}

export type EndpointKind = "Event Hub" | "Azure Data Explorer" | "Microsoft Fabric" | "Blob Storage";

export interface EndpointSummary {
  name: string;
  kind: EndpointKind;
  /** The concrete target (namespace / cluster / workspace). */
  target: string;
}

export interface AssetSummary {
  protocol: "OPC UA";
  count: number;
  samplingMs: number;
}

export interface SiteResources {
  dataflows: DataflowSummary[];
  profile: { name: string; instanceCount: number };
  endpoints: EndpointSummary[];
  assets: AssetSummary;
}

/** Stable small hash for deterministic per-site counts. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Event Hub namespace pulled from the site's ancestry templates. */
function eventHubNamespace(fs: FleetSite): string | undefined {
  for (const t of fs.ancestry) {
    const ns = (t.parameters as Record<string, unknown> | undefined)?.eventHubNamespace;
    if (typeof ns === "string") return ns;
  }
  return undefined;
}

/**
 * Build the read-only resource summary for a site. Deterministic: same site
 * always yields the same shape, scaled by environment (prod runs more).
 */
export function siteResources(fs: FleetSite): SiteResources {
  const name = fs.site.name;
  const h = hash(name);
  const isProd = fs.runtime.environment === "prod";

  const ehNs = eventHubNamespace(fs);
  const region = fs.resolvedLocation;

  // Endpoints: every site sends to its Event Hub namespace; prod sites also
  // fan out to a second analytical destination.
  const endpoints: EndpointSummary[] = [];
  if (ehNs) {
    endpoints.push({ name: "telemetry-eh", kind: "Event Hub", target: ehNs });
  }
  if (isProd) {
    const analytical: EndpointKind = h % 2 === 0 ? "Azure Data Explorer" : "Microsoft Fabric";
    endpoints.push({
      name: analytical === "Azure Data Explorer" ? "adx-cluster" : "fabric-eventstream",
      kind: analytical,
      target: analytical === "Azure Data Explorer" ? `adx-${region}` : "fabric-prod-ws",
    });
  }

  const primaryDest = endpoints[0]?.name ?? "telemetry-eh";

  // Dataflows: 1 baseline ingestion flow, plus an analytical flow on prod.
  const dataflows: DataflowSummary[] = [
    { name: "opcua-to-cloud", source: "OPC UA assets", destination: primaryDest },
  ];
  if (isProd && endpoints[1]) {
    dataflows.push({
      name: "anomaly-to-analytics",
      source: "MQTT: telemetry/#",
      destination: endpoints[1].name,
    });
  }

  const assets: AssetSummary = {
    protocol: "OPC UA",
    count: isProd ? 8 + (h % 12) : 2 + (h % 4),
    samplingMs: isProd ? 500 : 1000,
  };

  return {
    dataflows,
    profile: { name: "default", instanceCount: isProd ? 2 : 1 },
    endpoints,
    assets,
  };
}
