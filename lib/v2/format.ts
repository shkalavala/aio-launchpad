import type { FleetSite, HealthStatus } from "@/lib/types";
import { TENANT } from "@/lib/fixtures/tenant";
import { DRIFT_SITE_NAMES } from "@/lib/git/fixtures";
import type { ObservedHealth } from "@/lib/v2/observedState";

/** Friendly Azure-region labels for the regions present in the fixtures. */
export const REGION_LABELS: Record<string, string> = {
  swedencentral: "Sweden Central",
  germanywestcentral: "Germany West Central",
  westeurope: "West Europe",
  northeurope: "North Europe",
};

export function regionLabel(slug: string): string {
  return REGION_LABELS[slug] ?? slug;
}

/**
 * Classify a SiteTemplate by the role it plays in the inheritance chain, so the
 * UI can name the tiers instead of calling everything a "shared default".
 *
 * - "baseline"     — the org-wide root (no inherits, no Azure binding): AIO
 *                    release, broker, deploy options. e.g. base-site.yaml.
 * - "subscription" — an intermediate "Shared baseline" template that groups a
 *                    subset of sites and supplies their shared Azure binding
 *                    (subscription + location + country). e.g. shared/sweden.yaml.
 *                    (The internal id stays "subscription" — it marks the tier
 *                    that carries the Azure binding — but the label is generic.)
 * - "shared"       — any other intermediate template of shared defaults.
 */
export type TemplateTier = "baseline" | "subscription" | "shared";

export interface TemplateRoleInfo {
  tier: TemplateTier;
  /** Short badge label, e.g. "Fleet baseline" or "Shared baseline". */
  label: string;
  /** A region-qualified label where it applies, e.g. "Shared baseline · Sweden Central". */
  qualifiedLabel: string;
  /** One line on what this tier contributes. */
  supplies: string;
}

export function templateRole(t: {
  inherits?: string;
  subscription?: string;
  location?: string;
}): TemplateRoleInfo {
  if (t.subscription || t.location) {
    const region = t.location ? regionLabel(t.location) : undefined;
    return {
      tier: "subscription",
      label: "Shared baseline",
      qualifiedLabel: region ? `Shared baseline · ${region}` : "Shared baseline",
      supplies: "Azure subscription + region",
    };
  }
  if (!t.inherits) {
    return {
      tier: "baseline",
      label: "Fleet baseline",
      qualifiedLabel: "Fleet baseline",
      supplies: "org-wide AIO defaults (release, broker, deploy options)",
    };
  }
  return {
    tier: "shared",
    label: "Shared defaults",
    qualifiedLabel: "Shared defaults",
    supplies: "shared configuration defaults",
  };
}

export function enterpriseLabel(fs: FleetSite): string {
  const slug = fs.resolvedLabels.enterprise ?? "contoso-industries";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export function healthMeta(h: HealthStatus): { label: string; tone: Tone; dot: string } {
  switch (h) {
    case "healthy":
      return { label: "Healthy", tone: "success", dot: "bg-success" };
    case "degraded":
      return { label: "Degraded", tone: "warning", dot: "bg-warning" };
    case "unhealthy":
      return { label: "Unhealthy", tone: "danger", dot: "bg-danger" };
  }
}

/**
 * Health treatment for an *observed* datum, honoring its provenance. When the
 * active source can't see the cluster (e.g. Azure not connected) we render an
 * honest "Not connected" pip instead of a colored health dot.
 */
export function observedHealthMeta(o: ObservedHealth): {
  label: string;
  tone: Tone;
  dot: string;
  unknown: boolean;
} {
  if (o.kind === "unknown" || !o.health) {
    return {
      label: "Not connected",
      tone: "neutral",
      dot: "bg-transparent ring-1 ring-inset ring-border-strong",
      unknown: true,
    };
  }
  return { ...healthMeta(o.health), unknown: false };
}

export function envTone(env: string): Tone {
  if (env === "prod") return "accent";
  if (env === "dev") return "neutral";
  return "neutral";
}

/** Cluster distro + version for a site, falling back to the tenant distro. */
export function clusterInfo(fs: FleetSite): { distro: string; version?: string } {
  const cluster = fs.site.layers?.cluster;
  if (cluster) return { distro: cluster.distro, version: cluster.currentVersion };
  return { distro: TENANT.distroLabel };
}

/**
 * Whether a site is in drift. Combines git-vs-portal drift (from the git layer)
 * with any layer-level version drift. On-demand only — the caller decides
 * whether drift has been checked.
 */
export function siteHasDrift(fs: FleetSite): boolean {
  if (DRIFT_SITE_NAMES.has(fs.site.name)) return true;
  const layers = fs.site.layers;
  if (!layers) return false;
  return [layers.cluster, layers.arcK8sAgent, layers.arcServerAgent].some(
    (l) => l && l.drift !== "none" && l.drift !== "unknown",
  );
}

export interface RegionGroup {
  region: string;
  label: string;
  sites: FleetSite[];
}

export interface EnterpriseGroup {
  enterprise: string;
  regions: RegionGroup[];
}

/**
 * Group a fleet into the visible 3-tier hierarchy: Enterprise -> Region -> Site.
 * Environment and cluster are attributes on the site, not tiers.
 */
export function groupHierarchy(fleet: FleetSite[]): EnterpriseGroup[] {
  const byEnterprise = new Map<string, FleetSite[]>();
  for (const fs of fleet) {
    const ent = enterpriseLabel(fs);
    const list = byEnterprise.get(ent) ?? [];
    list.push(fs);
    byEnterprise.set(ent, list);
  }
  return Array.from(byEnterprise.entries()).map(([enterprise, sites]) => {
    const byRegion = new Map<string, FleetSite[]>();
    for (const fs of sites) {
      const list = byRegion.get(fs.resolvedLocation) ?? [];
      list.push(fs);
      byRegion.set(fs.resolvedLocation, list);
    }
    const regions: RegionGroup[] = Array.from(byRegion.entries())
      .map(([region, regionSites]) => ({
        region,
        label: regionLabel(region),
        sites: regionSites.sort((a, b) => a.site.name.localeCompare(b.site.name)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { enterprise, regions };
  });
}
