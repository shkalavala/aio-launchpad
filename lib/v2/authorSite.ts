// Author a new kind:Site document and turn it into the artifacts needed to
// open a real pull request against a connected Scale Kit repo.
//
// Boundary reminder: Launchpad authors the FLEET (sites + how config rolls),
// NOT the application (dataflows/assets/templates — that is DOE's job). A new
// site is additive and bounded: it adds a leaf to the roster, inheriting a
// shared default for subscription/location.

import { stringify as stringifyYaml } from "yaml";
import type { FileChange } from "@/lib/github/writeClient";

/** Broker sizing presets mirroring the repo's site examples. */
export type BrokerProfile = "Low" | "Medium" | "High";

export interface NewSiteInput {
  /** Site slug, e.g. "berlin-dev". Becomes name + file name. */
  name: string;
  /** inherits path relative to sites/, e.g. "shared/germany.yaml". */
  inherits: string;
  /** Environment label, e.g. "dev" | "prod" | "staging". */
  environment: string;
  /** Optional city label. */
  city?: string;
  /**
   * Optional Azure subscription override. Empty = inherit from the shared
   * default; a value here overrides the inherited subscription for this site
   * only (and is serialized onto the leaf).
   */
  subscription?: string;
  /** Azure resource group for this site. */
  resourceGroup: string;
  /** Arc cluster name parameter. */
  clusterName: string;
  /** Broker sizing preset. */
  brokerProfile: BrokerProfile;
}

const BROKER_PRESETS: Record<BrokerProfile, Record<string, string | number>> = {
  Low: {
    frontendReplicas: 1,
    frontendWorkers: 1,
    backendRedundancyFactor: 2,
    backendWorkers: 1,
    backendPartitions: 1,
    memoryProfile: "Low",
  },
  Medium: {
    frontendReplicas: 2,
    frontendWorkers: 2,
    backendRedundancyFactor: 2,
    backendWorkers: 2,
    backendPartitions: 2,
    memoryProfile: "Medium",
  },
  High: {
    frontendReplicas: 4,
    frontendWorkers: 2,
    backendRedundancyFactor: 2,
    backendWorkers: 4,
    backendPartitions: 2,
    memoryProfile: "High",
  },
};

/** A valid Scale Kit site slug: lowercase letters, digits, hyphens. */
export function isValidSiteName(name: string): boolean {
  return /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/.test(name);
}

export function defaultResourceGroup(name: string): string {
  return name ? `rg-iot-${name}` : "";
}

export function defaultClusterName(name: string): string {
  return name ? `${name}-arc` : "";
}

/** Minimal template shape needed to resolve inherited Azure bindings. */
export interface TemplateNode {
  /** template name */
  name: string;
  /** raw inherits value from YAML (may be a relative path like "../base-site.yaml") */
  inherits?: string;
  /** subscription declared on this template, if any */
  subscription?: string;
  /** Azure region declared on this template, if any */
  location?: string;
}

/** Tail filename without extension: "../base-site.yaml" -> "base-site". */
function templateKey(inherits: string | undefined): string | undefined {
  if (!inherits) return undefined;
  const tail = inherits.split("/").pop() ?? inherits;
  return tail.replace(/\.ya?ml$/i, "") || undefined;
}

/**
 * Ordered inheritance chain (root-most first) for the template named
 * `startName`. Walked BY NAME — matching the fleet resolver — so it tolerates
 * relative `inherits` paths (e.g. a region template's "../base-site.yaml").
 */
export function resolveTemplateChain(
  startName: string,
  templatesByName: Map<string, TemplateNode>,
): TemplateNode[] {
  const chain: TemplateNode[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = startName;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = templatesByName.get(cursor);
    if (!node) break;
    chain.unshift(node);
    cursor = templateKey(node.inherits);
  }
  return chain;
}

/**
 * Resolve the subscription a new site WOULD inherit if it picks the template
 * named `startName`, by walking that template's inherits chain (most-specific
 * wins, matching the fleet resolver). Returns undefined when nothing in the
 * chain declares a subscription.
 */
export function resolveInheritedSubscription(
  startName: string,
  templatesByName: Map<string, TemplateNode>,
): string | undefined {
  let val: string | undefined;
  for (const node of resolveTemplateChain(startName, templatesByName)) {
    if (node.subscription) val = node.subscription;
  }
  return val;
}

/** Path of the new site file relative to the repo root. */
export function newSitePath(workspace: string, name: string): string {
  return `${workspace.replace(/\/$/, "")}/sites/${name}.yaml`;
}

/** Branch name for the authoring PR. */
export function newSiteBranch(name: string): string {
  return `launchpad/add-site-${name}`;
}

/**
 * Serialize a NewSiteInput to YAML matching the repo's leaf-site style:
 * apiVersion/kind/name/inherits, resourceGroup, labels, parameters.brokerConfig.
 * location/country are intentionally omitted — they come from the inherited
 * shared default. subscription is omitted too UNLESS the operator entered an
 * override, in which case it is serialized onto the leaf (self wins).
 */
export function buildSiteYaml(input: NewSiteInput): string {
  const labels: Record<string, string> = { environment: input.environment };
  if (input.city?.trim()) labels.city = input.city.trim();

  const subOverride = input.subscription?.trim();

  const doc: Record<string, unknown> = {
    apiVersion: "siteops/v1",
    kind: "Site",
    name: input.name,
    inherits: input.inherits,
  };
  if (subOverride) doc.subscription = subOverride;
  doc.resourceGroup = input.resourceGroup;
  doc.labels = labels;
  doc.parameters = {
    clusterName: input.clusterName,
    brokerConfig: BROKER_PRESETS[input.brokerProfile],
  };

  const inherited = subOverride
    ? "location, country inherited"
    : "subscription, location, country inherited";
  const header =
    `# ${input.name} site\n` +
    `# Authored via AIO Launchpad. ${inherited} from ${input.inherits}\n\n`;
  return header + stringifyYaml(doc, { indent: 2 });
}

/** Build the file change(s) for the commit. */
export function buildSiteFileChange(workspace: string, input: NewSiteInput): FileChange {
  return { path: newSitePath(workspace, input.name), content: buildSiteYaml(input) };
}

/** Branch name for a site-removal PR. */
export function removeSiteBranch(name: string): string {
  return `launchpad/remove-site-${name}`;
}

/**
 * Build the file change that removes a site's YAML from the repo. The path
 * mirrors newSitePath so the leaf the fleet rendered is exactly the file we
 * delete. Templates under shared/ are intentionally out of scope — this only
 * removes a leaf kind:Site, never a shared default other sites inherit.
 */
export function buildSiteRemoval(workspace: string, name: string): FileChange {
  return { path: newSitePath(workspace, name), delete: true };
}
