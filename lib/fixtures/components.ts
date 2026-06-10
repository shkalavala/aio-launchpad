// Per-component versions that an AIO release pin resolves to on the
// cluster. The release pin (2604, 2605, ...) is the unit operators reason
// about; this table is what's actually deployed underneath. Pure fixture,
// values are plausible-shape only.
//
// Source of truth in production would be `az iot ops show` against each
// cluster (or the Helm release history). For the demo, we model what an
// operator would see when drilling into a single site to answer "is what's
// on the cluster what the release pin promises?"

import type { AioReleaseId } from "../types";

export type ComponentKind =
  | "broker"
  | "dataflow"
  | "opcua-broker"
  | "adr"
  | "secret-sync"
  | "schema-registry"
  | "akri"
  | "cert-manager";

export interface ComponentVersion {
  kind: ComponentKind;
  name: string;
  version: string;
  // Optional per-site drift signal — when a component is pinned but the
  // cluster reports a different version than the release expects.
  drift?: boolean;
}

const BASE: Record<AioReleaseId, ComponentVersion[]> = {
  "2512": [
    { kind: "broker", name: "MQTT broker", version: "0.5.12" },
    { kind: "dataflow", name: "Dataflow", version: "0.5.4" },
    { kind: "opcua-broker", name: "OPC UA broker", version: "0.5.8" },
    { kind: "adr", name: "Asset Device Registry", version: "0.4.1" },
    { kind: "secret-sync", name: "Secret sync controller", version: "1.1.5" },
    { kind: "schema-registry", name: "Schema registry", version: "0.3.0" },
    { kind: "akri", name: "Akri", version: "0.13.4" },
    { kind: "cert-manager", name: "cert-manager", version: "0.7.0" },
  ],
  "2602": [
    { kind: "broker", name: "MQTT broker", version: "0.6.4" },
    { kind: "dataflow", name: "Dataflow", version: "0.5.9" },
    { kind: "opcua-broker", name: "OPC UA broker", version: "0.6.0" },
    { kind: "adr", name: "Asset Device Registry", version: "0.4.7" },
    { kind: "secret-sync", name: "Secret sync controller", version: "1.1.6" },
    { kind: "schema-registry", name: "Schema registry", version: "0.3.2" },
    { kind: "akri", name: "Akri", version: "0.13.7" },
    { kind: "cert-manager", name: "cert-manager", version: "0.9.0" },
  ],
  "2603": [
    { kind: "broker", name: "MQTT broker", version: "0.6.11" },
    { kind: "dataflow", name: "Dataflow", version: "0.6.3" },
    { kind: "opcua-broker", name: "OPC UA broker", version: "0.6.4" },
    { kind: "adr", name: "Asset Device Registry", version: "0.5.0" },
    { kind: "secret-sync", name: "Secret sync controller", version: "1.3.0" },
    { kind: "schema-registry", name: "Schema registry", version: "0.4.0" },
    { kind: "akri", name: "Akri", version: "0.14.1" },
    { kind: "cert-manager", name: "cert-manager", version: "0.10.2" },
  ],
  "2604": [
    { kind: "broker", name: "MQTT broker", version: "0.7.2" },
    { kind: "dataflow", name: "Dataflow", version: "0.6.8" },
    { kind: "opcua-broker", name: "OPC UA broker", version: "0.6.9" },
    { kind: "adr", name: "Asset Device Registry", version: "0.5.4" },
    { kind: "secret-sync", name: "Secret sync controller", version: "1.4.0" },
    { kind: "schema-registry", name: "Schema registry", version: "0.4.1" },
    { kind: "akri", name: "Akri", version: "0.14.3" },
    { kind: "cert-manager", name: "cert-manager", version: "0.11.0" },
  ],
  "2605": [
    { kind: "broker", name: "MQTT broker", version: "0.7.5" },
    { kind: "dataflow", name: "Dataflow", version: "0.7.0" },
    { kind: "opcua-broker", name: "OPC UA broker", version: "0.7.0" },
    { kind: "adr", name: "Asset Device Registry", version: "0.5.6" },
    { kind: "secret-sync", name: "Secret sync controller", version: "1.4.1" },
    { kind: "schema-registry", name: "Schema registry", version: "0.4.2" },
    { kind: "akri", name: "Akri", version: "0.14.4" },
    { kind: "cert-manager", name: "cert-manager", version: "0.12.0" },
  ],
  // 2606 is the first infra-scope-capable release; AIO components track the
  // 2605 baseline with a single dataflow point bump. The sub-pins
  // (clusterPin / arcAgentPin / appPins) live on the AioRelease itself.
  "2606": [
    { kind: "broker", name: "MQTT broker", version: "0.7.5" },
    { kind: "dataflow", name: "Dataflow", version: "0.7.1" },
    { kind: "opcua-broker", name: "OPC UA broker", version: "0.7.0" },
    { kind: "adr", name: "Asset Device Registry", version: "0.5.6" },
    { kind: "secret-sync", name: "Secret sync controller", version: "1.4.1" },
    { kind: "schema-registry", name: "Schema registry", version: "0.4.2" },
    { kind: "akri", name: "Akri", version: "0.14.4" },
    { kind: "cert-manager", name: "cert-manager", version: "0.12.0" },
  ],
};

export const COMPONENTS_BY_RELEASE: Record<AioReleaseId, ComponentVersion[]> = BASE;

// A small set of per-site overrides modelling realistic drift: one
// component running a different version than the release pin would imply.
// Used by the drawer to flag a site as "release pin says 2604 but
// dataflow is still on 0.6.3" — the kind of thing only a per-site
// drill-down can surface.
export const COMPONENT_DRIFT_BY_SITE: Record<string, Partial<Record<ComponentKind, string>>> = {
  "stockholm-bar-prod": {
    // Stuck on the previous release's dataflow despite the release pin.
    dataflow: "0.6.3",
  },
};

export function componentsForSite(
  siteName: string,
  release: AioReleaseId,
): ComponentVersion[] {
  const baseline = COMPONENTS_BY_RELEASE[release];
  const drift = COMPONENT_DRIFT_BY_SITE[siteName];
  if (!drift) return baseline;
  return baseline.map((c) =>
    drift[c.kind] && drift[c.kind] !== c.version
      ? { ...c, version: drift[c.kind]!, drift: true }
      : c,
  );
}
