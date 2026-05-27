// AIO ARM-resource fixture.
//
// Source: context/clone_aio-165220922_aio.json — an `az iot ops clone`
// (Bicep-style) export of a live AIO instance. The export wraps each child
// resource family in a nested deployment; this module flattens those nested
// resources into a single typed list the Resources screen can render.
//
// Synthetic columns (resourceGroup, location, state) are derived from the
// clone metadata (clonedInstanceId) or fixed to plausible defaults. They
// only exist to mirror the DoEGit-style table layout — no live ARM query.

import clone from "@/context/clone_aio-165220922_aio.json";

export type AioResourceCategory =
  | "Instance"
  | "Asset"
  | "Asset Endpoint"
  | "Dataflow"
  | "Dataflow Endpoint"
  | "Dataflow Profile"
  | "Schema / Registry"
  | "Broker"
  | "Secret Sync"
  | "Connector"
  | "Other";

export interface AioResource {
  /** Stable id for selection/keying. */
  id: string;
  /** Resource name (last segment, parameter expressions stripped where possible). */
  name: string;
  /** Full ARM type, e.g. "microsoft.iotoperations/instances/dataflowendpoints". */
  armType: string;
  /** Short, user-friendly type label for the table. */
  displayType: string;
  /** UI grouping for the filter chips. */
  category: AioResourceCategory;
  /** Original group key inside the clone JSON (e.g. "dataflows_1"). */
  group: string;
  resourceGroup: string;
  location: string;
  state: "Succeeded" | "Failed" | "Updating";
  /**
   * Synthetic drift status — live ARM resource vs the corresponding Bicep in
   * the connected fleet repo. Deterministic hash so the marked rows are
   * stable across reloads (and demo-screenshot-friendly).
   */
  syncStatus: "in-sync" | "drift";
  /** Raw ARM resource JSON from the clone — used to render a Bicep preview. */
  raw: Record<string, unknown>;
  /** apiVersion if known. */
  apiVersion?: string;
}

// ── Categorization ───────────────────────────────────────────────────────────

function categorize(armType: string): {
  category: AioResourceCategory;
  displayType: string;
} {
  const t = armType.toLowerCase();
  if (t === "microsoft.iotoperations/instances") {
    return { category: "Instance", displayType: "Instance" };
  }
  if (t.includes("/dataflowendpoints")) {
    return { category: "Dataflow Endpoint", displayType: "Dataflow Endpoint" };
  }
  if (t.endsWith("/dataflowprofiles")) {
    return { category: "Dataflow Profile", displayType: "Dataflow Profile" };
  }
  if (t.includes("/dataflowprofiles/dataflows")) {
    return { category: "Dataflow", displayType: "Dataflow" };
  }
  if (t.includes("/assetendpointprofiles")) {
    return { category: "Asset Endpoint", displayType: "Asset Endpoint Profile" };
  }
  if (
    t === "microsoft.deviceregistry/assets" ||
    t === "microsoft.deviceregistry/namespaces/assets"
  ) {
    return { category: "Asset", displayType: "Asset" };
  }
  if (t === "microsoft.deviceregistry/namespaces/devices") {
    return { category: "Asset", displayType: "Device" };
  }
  if (t.includes("/registryendpoints")) {
    return { category: "Schema / Registry", displayType: "Registry Endpoint" };
  }
  if (t.includes("/akriconnectortemplates")) {
    return { category: "Connector", displayType: "Connector Template" };
  }
  if (t.endsWith("/brokers")) {
    return { category: "Broker", displayType: "Broker" };
  }
  if (t.includes("/brokers/listeners")) {
    return { category: "Broker", displayType: "Broker Listener" };
  }
  if (t.includes("/brokers/authentications")) {
    return { category: "Broker", displayType: "Broker Auth" };
  }
  if (t.includes("secretsync")) {
    return { category: "Secret Sync", displayType: "Secret Sync" };
  }
  if (t.includes("azurekeyvaultsecretproviderclass")) {
    return { category: "Secret Sync", displayType: "Secret Provider Class" };
  }
  return { category: "Other", displayType: armType.split("/").pop() ?? armType };
}

// Cleanup ARM expression syntax like "[concat(parameters('foo'), '_x')]"
// or "[parameters('instanceName')]" into a human-readable display name.
function cleanName(raw: string): string {
  if (!raw) return "(unnamed)";
  // concat(parameters('x'), '_suffix') → "(prefix)-suffix"
  const concatMatch = raw.match(/concat\(\s*parameters\('([^']+)'\)\s*,\s*'([^']+)'/);
  if (concatMatch) {
    const suffix = concatMatch[2].replace(/^[_/]+/, "");
    return suffix ? `${humanize(concatMatch[1])} · ${suffix}` : humanize(concatMatch[1]);
  }
  // [parameters('foo')] → "foo" (humanized)
  const paramMatch = raw.match(/parameters\('([^']+)'\)/);
  if (paramMatch && !raw.includes(",")) {
    return humanize(paramMatch[1]);
  }
  // guid(...) expressions → role-assignment style
  if (raw.startsWith("[guid(")) {
    return "roleAssignment";
  }
  // Strip leading slot like "instanceName/foo" → "foo".
  const lastSlash = raw.lastIndexOf("/");
  if (lastSlash >= 0 && lastSlash < raw.length - 1) {
    return raw.slice(lastSlash + 1);
  }
  return raw;
}

function humanize(paramName: string): string {
  // opsExtensionName → ops-extension, customLocationName → custom-location
  return paramName
    .replace(/Name$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

// ── Flatten the clone JSON ───────────────────────────────────────────────────

interface InnerResource {
  type?: string;
  name?: string;
  apiVersion?: string;
  location?: string;
  properties?: unknown;
  dependsOn?: unknown;
  [k: string]: unknown;
}

interface OuterResource {
  type?: string;
  name?: string;
  properties?: {
    template?: { resources?: InnerResource[] };
  };
}

function parseResourceGroupFromInstanceId(id: string | undefined): string {
  if (!id) return "rg-aio";
  const m = id.match(/\/resourceGroups\/([^/]+)/i);
  return m ? m[1] : "rg-aio";
}

const META = (clone as unknown as { metadata?: { clonedInstanceId?: string } })
  .metadata;
const RESOURCE_GROUP = parseResourceGroupFromInstanceId(META?.clonedInstanceId);
const DEFAULT_LOCATION = "westeurope";

// Bootstrap / identity infra that isn't portable across instances and is
// typically owned by platform / cluster setup, not the AIO workflow. Hidden
// from the Resources screen since they can't be cleanly Bicep-emitted and
// pushed to another instance.
const NON_PORTABLE_TYPES = new Set([
  "microsoft.kubernetesconfiguration/extensions",
  "microsoft.extendedlocation/customlocations",
  "microsoft.authorization/roleassignments",
]);

function isPortable(armType: string): boolean {
  return !NON_PORTABLE_TYPES.has(armType.toLowerCase());
}

// Deterministic ~18% drift rate from a cheap string hash on the id.
function syntheticDrift(id: string): "in-sync" | "drift" {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h % 100 < 18 ? "drift" : "in-sync";
}

function flatten(): AioResource[] {
  const out: AioResource[] = [];
  const resources = (clone as unknown as { resources?: Record<string, OuterResource> })
    .resources ?? {};
  let counter = 0;
  for (const [groupKey, outer] of Object.entries(resources)) {
    const inners = outer?.properties?.template?.resources;
    if (inners && inners.length > 0) {
      for (const r of inners) {
        if (!r.type) continue;
        if (!isPortable(r.type)) continue;
        const { category, displayType } = categorize(r.type);
        const id = `${groupKey}-${counter++}`;
        out.push({
          id,
          name: cleanName(r.name ?? ""),
          armType: r.type,
          displayType,
          category,
          group: groupKey,
          resourceGroup: RESOURCE_GROUP,
          location: r.location?.includes("parameters") ? DEFAULT_LOCATION : r.location ?? DEFAULT_LOCATION,
          state: "Succeeded",
          syncStatus: syntheticDrift(id),
          raw: r as Record<string, unknown>,
          apiVersion: r.apiVersion,
        });
      }
    } else if (outer?.type) {
      if (!isPortable(outer.type)) continue;
      const { category, displayType } = categorize(outer.type);
      // Skip pure deployment wrappers — they're scaffolding, not resources.
      if (outer.type.toLowerCase() === "microsoft.resources/deployments") continue;
      const id = `${groupKey}-${counter++}`;
      out.push({
        id,
        name: cleanName(outer.name ?? groupKey),
        armType: outer.type,
        displayType,
        category,
        group: groupKey,
        resourceGroup: RESOURCE_GROUP,
        location: DEFAULT_LOCATION,
        state: "Succeeded",
        syncStatus: syntheticDrift(id),
        raw: outer as unknown as Record<string, unknown>,
      });
    }
  }
  return out;
}

export const AIO_RESOURCES: AioResource[] = flatten();

export const AIO_RESOURCE_RG = RESOURCE_GROUP;
export const AIO_RESOURCE_INSTANCE_ID = META?.clonedInstanceId ?? "";

/** Filter chips shown in the Resources page header, in display order. */
export const RESOURCE_CATEGORIES: AioResourceCategory[] = [
  "Instance",
  "Asset",
  "Asset Endpoint",
  "Dataflow",
  "Dataflow Endpoint",
  "Dataflow Profile",
  "Schema / Registry",
  "Broker",
  "Connector",
  "Secret Sync",
  "Other",
];

// ── Bicep emission ───────────────────────────────────────────────────────────
//
// The clone JSON is ARM-template-shaped (resources with `type`, `apiVersion`,
// `properties`, etc., including `[parameters('foo')]` expressions). We render
// each resource as a single `resource <symbol> '<type>@<api>' = { ... }` block.
// String-only `[parameters('x')]` values become unquoted Bicep param refs;
// everything else falls back to JSON so the preview stays faithful even when
// we don't recognize an ARM expression.

function bicepSymbol(name: string, type: string): string {
  // pull a clean leaf to use as the Bicep symbolic name
  const leaf = name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const typeLeaf = type.split("/").pop() ?? "resource";
  const base = leaf || typeLeaf.replace(/[^a-zA-Z0-9]+/g, "_");
  // Bicep symbols can't start with a digit
  return /^\d/.test(base) ? `_${base}` : base;
}

function isArmExpression(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("[") && v.endsWith("]");
}

function armToBicepValue(expr: string): string {
  // strip leading "[" + trailing "]" → write as Bicep expression directly
  return expr.slice(1, -1);
}

function bicepValue(v: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  const pad2 = "  ".repeat(indent + 1);
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") {
    return isArmExpression(v) ? armToBicepValue(v) : JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    const items = v.map((item) => `${pad2}${bicepValue(item, indent + 1)}`);
    return `[\n${items.join("\n")}\n${pad}]`;
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries.map(
      ([k, val]) => `${pad2}${bicepKey(k)}: ${bicepValue(val, indent + 1)}`,
    );
    return `{\n${lines.join("\n")}\n${pad}}`;
  }
  return JSON.stringify(v);
}

function bicepKey(k: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : `'${k}'`;
}

/**
 * Render a single AioResource as a Bicep snippet. Best-effort — ARM
 * expressions are preserved verbatim (without the `[...]` wrapper) so the
 * output stays close to what `bicep decompile` would produce.
 */
export function toBicep(r: AioResource): string {
  const sym = bicepSymbol(r.name, r.armType);
  const apiVersion = r.apiVersion ?? "2024-11-01";
  const props: Record<string, unknown> = { ...r.raw };
  // surface a few fields at the top, drop them from the bag
  const top: Array<[string, unknown]> = [];
  for (const key of ["name", "location", "scope", "parent", "identity", "sku", "kind"]) {
    if (key in props) {
      top.push([key, (props as Record<string, unknown>)[key]]);
      delete (props as Record<string, unknown>)[key];
    }
  }
  // strip ARM scaffolding we don't want to emit
  delete (props as Record<string, unknown>).type;
  delete (props as Record<string, unknown>).apiVersion;
  delete (props as Record<string, unknown>).dependsOn;

  const lines: string[] = [];
  lines.push(`resource ${sym} '${r.armType}@${apiVersion}' = {`);
  for (const [k, v] of top) {
    lines.push(`  ${bicepKey(k)}: ${bicepValue(v, 1)}`);
  }
  for (const [k, v] of Object.entries(props)) {
    lines.push(`  ${bicepKey(k)}: ${bicepValue(v, 1)}`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Suggested file path inside the fleet repo's bicep folder, e.g.
 * `infra/bicep/dataflows/mqtt-source-scale.bicep`.
 */
export function targetBicepPath(r: AioResource, bicepRoot: string): string {
  const root = (bicepRoot ?? "infra/bicep").replace(/\/+$/, "") || "infra/bicep";
  const folder = r.category
    .toLowerCase()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-");
  const file = r.name
    .replace(/\s·\s/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${root}/${folder}/${file || "resource"}.bicep`;
}

