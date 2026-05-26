// Screen 2 — Add a site. Helpers for building a new FleetSite from a small
// form input + walking the same template ancestry the real Scale Kit would.
// Mirrors lib/fixtures/sites.ts semantics so the resulting pending site looks
// indistinguishable from a real one in the Fleet table.

import type {
  AioReleaseId,
  FleetSite,
  Site,
  SiteRuntime,
  SiteTemplate,
} from "./types";
import { FLEET, TEMPLATES } from "./fixtures/sites";

const TEMPLATES_BY_NAME: Record<string, SiteTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.name, t]),
);

const FLEET_NAMES = new Set(FLEET.map((f) => f.site.name));

/** True if a SiteTemplate with this name ships in the fixture set. */
export function templateExists(name: string): boolean {
  return !!name && !!TEMPLATES_BY_NAME[name];
}

/** True if a Site with this exact name is already in the fleet (real or pending). */
export function siteExists(name: string, pending: string[] = []): boolean {
  return FLEET_NAMES.has(name) || pending.includes(name);
}

// Conventional values seeded into the picker. Operators can add new ones
// at site-add time — these are suggestions, not an enum.
export const KNOWN_FACTORY_SITES = ["stockholm", "hamburg", "gothenburg"] as const;
export const KNOWN_PLANTS = ["assembly", "bar", "cutting"] as const;
export const KNOWN_ENVIRONMENTS = ["dev", "prod"] as const;

/** Slug rule shared by factorySite / plant / environment custom values. */
export const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;

export interface NewSiteInput {
  /** Free-form geo / site slug. Suggested values in KNOWN_FACTORY_SITES. */
  factorySite: string;
  /** Free-form environment slug. Suggested values in KNOWN_ENVIRONMENTS. */
  environment: string;
  /** Optional plant slug. Suggested values in KNOWN_PLANTS. */
  plant?: string;
  /** Optional override; otherwise derived from above. */
  nameOverride?: string;
  /** Optional override; otherwise derived from name. */
  resourceGroupOverride?: string;
  /** Optional Azure subscription GUID override. Defaults to the inherited / placeholder subscription. */
  subscriptionOverride?: string;
  /** Optional Azure region override (e.g. swedencentral). Defaults to the inherited geo template location. */
  locationOverride?: string;
  /** Optional override for the AIO instance name. Defaults to `<site>-aio`. */
  aioInstanceNameOverride?: string;
  aioRelease: AioReleaseId;
}

const SUBSCRIPTION = "00000000-0000-0000-0000-000000000000";
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCATION_RE = /^[a-z][a-z0-9]{2,40}$/;
const AIO_INSTANCE_RE = /^[a-z][a-z0-9-]{2,60}$/;

export function deriveSubscription(input: NewSiteInput): string {
  return input.subscriptionOverride?.trim() || SUBSCRIPTION;
}

export function deriveLocation(input: NewSiteInput, ancestry: SiteTemplate[]): string {
  if (input.locationOverride?.trim()) return input.locationOverride.trim();
  return [...ancestry].reverse().find((t) => t.location)?.location ?? "";
}

export function deriveAioInstanceName(input: NewSiteInput): string {
  if (input.aioInstanceNameOverride?.trim()) return input.aioInstanceNameOverride.trim();
  return `${deriveSiteName(input) || "site"}-aio`;
}

export function deriveSiteName(input: NewSiteInput): string {
  if (input.nameOverride?.trim()) return input.nameOverride.trim();
  const parts = [input.factorySite, input.plant, input.environment].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  return parts.join("-");
}

/**
 * Candidate parent-template names ordered from most-specific to least-specific.
 * E.g. for { factorySite: stockholm, plant: cutting } => ["stockholm-cutting", "stockholm"].
 */
export function parentTemplateCandidates(input: NewSiteInput): string[] {
  const candidates: string[] = [];
  if (input.factorySite && input.plant) {
    candidates.push(`${input.factorySite}-${input.plant}`);
  }
  if (input.factorySite) {
    candidates.push(input.factorySite);
  }
  return candidates;
}

/**
 * Closest parent template name that actually exists. Falls back from the
 * most-specific candidate (`<fs>-<plant>`) to the geo-level template (`<fs>`),
 * so adding a brand-new plant still inherits the geo manifest rather than
 * going standalone. Returns the most-specific candidate when nothing matches,
 * so the YAML preview still shows what the site would point at.
 */
export function deriveParentTemplateName(input: NewSiteInput): string {
  const candidates = parentTemplateCandidates(input);
  const resolved = candidates.find((c) => TEMPLATES_BY_NAME[c]);
  return resolved ?? candidates[0] ?? "";
}

export function deriveResourceGroup(input: NewSiteInput): string {
  if (input.resourceGroupOverride?.trim()) return input.resourceGroupOverride.trim();
  return `rg-${deriveSiteName(input)}`;
}

export interface SiteValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /**
   * Set when the derived site name (or override) matches a site that already
   * exists in the live fleet or in the pending overlay. The UI uses this to
   * surface an "open existing site" affordance instead of a bare error, since
   * Launchpad is a helpful UX on top of a git-backed manifest repo —
   * existing-site collisions are usually "oh, I meant to edit that one".
   */
  collision?: { name: string; isPending: boolean };
}

export function validateNewSite(input: NewSiteInput, pendingNames: string[]): SiteValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = deriveSiteName(input);

  for (const [label, value] of [
    ["Factory site", input.factorySite],
    ["Environment", input.environment],
  ] as const) {
    if (!value || !value.trim()) {
      errors.push(`${label} is required.`);
    } else if (!SLUG_RE.test(value)) {
      errors.push(`${label} "${value}" must be 2–31 chars, lowercase letters/digits/hyphens, starting with a letter.`);
    }
  }
  if (input.plant && !SLUG_RE.test(input.plant)) {
    errors.push(`Plant "${input.plant}" must be 2–31 chars, lowercase letters/digits/hyphens, starting with a letter.`);
  }

  if (!/^[a-z][a-z0-9-]{2,40}$/.test(name)) {
    errors.push(
      "Derived site name must be 3–41 chars, lowercase letters/digits/hyphens, starting with a letter.",
    );
  }

  const existing = new Set([...FLEET.map((f) => f.site.name), ...pendingNames]);
  let collision: SiteValidation["collision"];
  if (existing.has(name)) {
    errors.push(`A site named "${name}" already exists.`);
    collision = { name, isPending: pendingNames.includes(name) };
  }

  const candidates = parentTemplateCandidates(input);
  const resolved = candidates.find((c) => TEMPLATES_BY_NAME[c]);
  if (candidates.length > 0 && !resolved) {
    const list = candidates.map((c) => `"shared/${c}.yaml"`).join(" then ");
    warnings.push(
      `No matching parent template found (looked for ${list}). The site will be standalone — no inherited labels or capabilities — until you add one of those under shared/.`,
    );
  } else if (candidates.length > 0 && resolved !== candidates[0]) {
    warnings.push(
      `Inheriting from "shared/${resolved}.yaml" because "shared/${candidates[0]}.yaml" doesn't exist yet. Add it later to give this plant its own defaults.`,
    );
  }

  if (input.subscriptionOverride?.trim() && !GUID_RE.test(input.subscriptionOverride.trim())) {
    errors.push(`Subscription override must be a GUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).`);
  }
  if (input.locationOverride?.trim() && !LOCATION_RE.test(input.locationOverride.trim())) {
    errors.push(`Location override must be an Azure region slug (lowercase letters/digits, e.g. swedencentral).`);
  }
  if (input.aioInstanceNameOverride?.trim() && !AIO_INSTANCE_RE.test(input.aioInstanceNameOverride.trim())) {
    errors.push(`AIO instance name override must be 3–61 chars, lowercase letters/digits/hyphens, starting with a letter.`);
  }

  return { ok: errors.length === 0, errors, warnings, collision };
}

function walkAncestry(parentName: string): SiteTemplate[] {
  const chain: SiteTemplate[] = [];
  let cursor: SiteTemplate | undefined = TEMPLATES_BY_NAME[parentName];
  while (cursor) {
    chain.unshift(cursor);
    const tail: string | undefined = cursor.inherits?.split("/").pop()?.replace(/\.yaml$/, "");
    cursor = tail ? TEMPLATES_BY_NAME[tail] : undefined;
  }
  return chain;
}

/** Build the synthetic Site + ancestry walk + runtime overlay for a pending entry. */
export function buildPendingFleetSite(input: NewSiteInput, runtimeOverride?: Partial<SiteRuntime>): FleetSite {
  const name = deriveSiteName(input);
  const parentTemplateName = deriveParentTemplateName(input);
  const ancestry = walkAncestry(parentTemplateName);
  const labels: Record<string, string> = {};
  for (const t of ancestry) Object.assign(labels, t.labels ?? {});
  labels.environment = input.environment;

  const location =
    [...ancestry].reverse().find((t) => t.location)?.location ?? "unknown";

  const effectiveLocation = input.locationOverride?.trim() || location;

  const site: Site = {
    apiVersion: "siteops/v1",
    kind: "Site",
    name,
    inherits: parentTemplateName ? `shared/${parentTemplateName}.yaml` : undefined,
    subscription: deriveSubscription(input),
    resourceGroup: deriveResourceGroup(input),
    labels: { environment: input.environment },
    parameters: {
      aioInstanceName: deriveAioInstanceName(input),
      envPrefix: input.environment === "prod" ? "" : input.environment,
      excludeEndpoints: [] as string[],
    },
    properties: { aioRelease: input.aioRelease },
  };

  const runtime: SiteRuntime = {
    siteName: name,
    resolvedRelease: input.aioRelease,
    health: "healthy",
    lastDeployAt: new Date().toISOString(),
    environment: input.environment,
    ...runtimeOverride,
  };

  return {
    site,
    ancestry,
    runtime,
    resolvedLabels: labels,
    resolvedLocation: effectiveLocation,
  };
}

/** Effective deployOptions after walking ancestry (last-write-wins). */
export function resolveDeployOptions(ancestry: SiteTemplate[]): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  for (const t of ancestry) {
    const o = t.properties?.deployOptions;
    if (o) Object.assign(opts, o);
  }
  return opts;
}

/** Pretty-print the new site YAML in a way that mirrors cont-*.yaml shape. */
export function renderNewSiteYaml(input: NewSiteInput): string {
  const name = deriveSiteName(input);
  const rg = deriveResourceGroup(input);
  const parent = deriveParentTemplateName(input);
  const subscription = deriveSubscription(input);
  const aioInstance = deriveAioInstanceName(input);
  const lines: string[] = [
    "apiVersion: siteops/v1",
    "kind: Site",
    `name: ${name}`,
  ];
  if (parent) lines.push(`inherits: shared/${parent}.yaml`);
  lines.push(
    `subscription: ${subscription}`,
    `resourceGroup: ${rg}`,
  );
  if (input.locationOverride?.trim()) {
    lines.push(`location: ${input.locationOverride.trim()}`);
  }
  lines.push(
    "labels:",
    `  environment: ${input.environment}`,
    "parameters:",
    `  aioInstanceName: ${aioInstance}`,
    `  envPrefix: ${input.environment === "prod" ? '""' : input.environment}`,
    "  excludeEndpoints: []",
    "properties:",
    `  aioRelease: "${input.aioRelease}"`,
    "",
  );
  return lines.join("\n");
}
