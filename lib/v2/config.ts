import type { FleetSite } from "@/lib/types";

/**
 * Config model for the v2 surface.
 *
 * The "global template" is the read-only baseline an OT operator inherits:
 * base-site defaults (context/scale-kit-real-yaml/reference-base-site.yaml)
 * merged with the site's ancestry templates. The "site override" is the
 * effective config after the leaf site's own values and any staged UI edits.
 *
 * We surface a curated set of operational knobs rather than every networking
 * GUID, so the diff reads clearly in a demo.
 */

export interface SiteConfigPair {
  /** Global template — read-only for OT. */
  base: Record<string, unknown>;
  /** Effective site config — editable, produces pending changes. */
  override: Record<string, unknown>;
}

/** Mirrors reference-base-site.yaml defaults (curated subset). */
const BASE_DEFAULTS = (): Record<string, unknown> => ({
  aioRelease: "2605",
  brokerConfig: { memoryProfile: "Medium", replicas: 2 },
  defaultDataflowInstanceCount: 1,
  deployOptions: { enableSecretSync: false, enableCertManager: true },
});

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Deep-merge source into a clone of target (source wins). */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out = clone(target);
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Get a value at a dotted path. */
export function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Return a clone of obj with the dotted path set to value. */
export function setAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const out = clone(obj);
  const keys = path.split(".");
  let cursor: Record<string, unknown> = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!isPlainObject(cursor[k])) cursor[k] = {};
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return out;
}

/** Curated event-hub namespace pulled from the site's ancestry templates. */
function ancestryParams(fs: FleetSite): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const t of fs.ancestry) {
    const p = (t.parameters ?? {}) as Record<string, unknown>;
    if (typeof p.eventHubNamespace === "string") out.eventHubNamespace = p.eventHubNamespace;
  }
  return out;
}

/**
 * Build the (base, override) config pair for a site. `staged` is an optional
 * map of dotted-path edits from the store, applied last so the UI reflects
 * pending changes immediately.
 */
export function buildConfigPair(
  fs: FleetSite,
  staged?: Record<string, unknown>,
): SiteConfigPair {
  const base = deepMerge(BASE_DEFAULTS(), ancestryParams(fs));

  const siteLayer: Record<string, unknown> = {};
  const params = (fs.site.parameters ?? {}) as Record<string, unknown>;
  if (typeof params.aioInstanceName === "string") siteLayer.aioInstanceName = params.aioInstanceName;
  siteLayer.envPrefix = typeof params.envPrefix === "string" ? params.envPrefix : "";

  const declaredRelease = fs.site.properties?.aioRelease;
  if (declaredRelease) siteLayer.aioRelease = declaredRelease;

  // Prod sites realistically enable secret sync.
  if (fs.runtime.environment === "prod") {
    siteLayer.deployOptions = { enableSecretSync: true };
  }

  let override = deepMerge(base, siteLayer);

  if (staged) {
    for (const [path, value] of Object.entries(staged)) {
      override = setAtPath(override, path, value);
    }
  }

  return { base, override };
}

/** Editable operational fields exposed in the Configurations editor. */
export interface EditableField {
  path: string;
  label: string;
  kind: "number" | "boolean" | "enum";
  options?: string[];
}

export const EDITABLE_FIELDS: EditableField[] = [
  { path: "aioRelease", label: "AIO release", kind: "enum", options: ["2512", "2602", "2603", "2604", "2605", "2606"] },
  { path: "brokerConfig.replicas", label: "Broker replicas", kind: "number" },
  { path: "brokerConfig.memoryProfile", label: "Broker memory profile", kind: "enum", options: ["Low", "Medium", "High"] },
  { path: "defaultDataflowInstanceCount", label: "Dataflow instance count", kind: "number" },
  { path: "deployOptions.enableSecretSync", label: "Secret sync", kind: "boolean" },
];

/** Repo-relative file path for a site's config, used in pending changes. */
export function siteConfigPath(siteName: string): string {
  return `sites/cont-${siteName}.yaml`;
}
