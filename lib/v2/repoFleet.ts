// Load a real Scale Kit repo and map its site YAML into the FleetSite shape the
// v2 UI already consumes. This is the "bring your own repo" read path: the repo
// is the source of truth for WHICH sites exist; we render whatever is committed.
//
// What we read:  workspaces/<workspace>/sites/**/*.yaml
// What we emit:  FleetSite[] (site + walked inheritance + synthesized runtime)
//
// The repo carries DESIRED STATE only (no health, no last-deploy time). Those
// runtime facts come from the cluster/ARM in a real system; here we synthesize
// them deterministically from the site name so the UI has something stable to
// render. They are clearly demo-only and never written back to git.

import { parse as parseYaml } from "yaml";
import { listTree, fetchBlob, type RepoCoords } from "@/lib/github/client";
import type {
  AioReleaseId,
  FleetSite,
  HealthStatus,
  Site,
  SiteBase,
  SiteRuntime,
  SiteTemplate,
} from "@/lib/types";

export interface RepoConnection {
  owner: string;
  repo: string;
  branch: string;
  /** Workspace dir holding sites/, e.g. "workspaces/iot-operations". */
  workspace: string;
  /** Optional fine-grained PAT. Never persisted to disk by this module. */
  token?: string;
}

/** Coords for the github client, carrying the optional token. */
function coords(conn: RepoConnection): RepoCoords {
  return { owner: conn.owner, repo: conn.repo, branch: conn.branch, token: conn.token };
}

/** "shared/germany.yaml" -> "germany"; "base-site.yaml" -> "base-site". */
function templateNameFromInherits(inherits: string | undefined): string | undefined {
  if (!inherits) return undefined;
  const tail = inherits.split("/").pop() ?? inherits;
  return tail.replace(/\.ya?ml$/i, "");
}

/** Stable 32-bit hash of a string for deterministic synthetic runtime. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A parsed YAML doc that at least looks like a Scale Kit site/template. */
function isSiteDoc(doc: unknown): doc is SiteBase & { kind: string } {
  return (
    typeof doc === "object" &&
    doc !== null &&
    typeof (doc as { name?: unknown }).name === "string" &&
    typeof (doc as { kind?: unknown }).kind === "string"
  );
}

/** Walk the `inherits` chain to produce ancestry (parent-most first). */
function walkAncestry(
  start: SiteBase,
  templatesByName: Map<string, SiteTemplate>,
): SiteTemplate[] {
  const chain: SiteTemplate[] = [];
  const seen = new Set<string>();
  let cursor = templatesByName.get(templateNameFromInherits(start.inherits) ?? "");
  while (cursor && !seen.has(cursor.name)) {
    seen.add(cursor.name);
    chain.unshift(cursor);
    cursor = templatesByName.get(templateNameFromInherits(cursor.inherits) ?? "");
  }
  return chain;
}

/** Resolve a property through ancestry + self (self wins). */
function resolveAioRelease(site: SiteBase, ancestry: SiteTemplate[]): AioReleaseId {
  const chain = [...ancestry, site];
  let release: string | undefined;
  for (const node of chain) {
    const r = node.properties?.aioRelease;
    if (r) release = r;
  }
  return (release ?? "2605") as AioReleaseId;
}

/** Synthesize demo-only runtime (health, last deploy) deterministically. */
function synthRuntime(site: Site, ancestry: SiteTemplate[]): SiteRuntime {
  const labels: Record<string, string> = {};
  for (const t of ancestry) Object.assign(labels, t.labels ?? {});
  Object.assign(labels, site.labels ?? {});

  const environment = labels.environment ?? labels.scope ?? "prod";
  const h = hash(site.name);
  // Mostly healthy; a stable minority degraded. Never synthesize "unhealthy"
  // so the demo doesn't imply real outages on a customer's repo.
  const health: HealthStatus = h % 5 === 0 ? "degraded" : "healthy";
  // Deterministic "last deployed" within the trailing ~45 days.
  const daysAgo = 1 + (h % 45);
  const lastDeployAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

  return {
    siteName: site.name,
    resolvedRelease: resolveAioRelease(site, ancestry),
    health,
    lastDeployAt,
    environment,
    aioInstalled: true,
  };
}

/** Map one parsed Site doc + the template pool into a FleetSite. */
function toFleetSite(site: Site, templatesByName: Map<string, SiteTemplate>): FleetSite {
  const ancestry = walkAncestry(site, templatesByName);
  const labels: Record<string, string> = {};
  for (const t of ancestry) Object.assign(labels, t.labels ?? {});
  Object.assign(labels, site.labels ?? {});
  const location =
    site.location ?? [...ancestry].reverse().find((t) => t.location)?.location ?? "unknown";

  // Azure binding fields (subscription, resourceGroup) can be declared on the
  // site or inherited from a shared template (self wins). Resolve them so the
  // UI always has a concrete value; fall back to the Scale Kit placeholder sub.
  const chain: SiteBase[] = [...ancestry, site];
  const pick = (key: string): string | undefined => {
    let val: string | undefined;
    for (const node of chain) {
      const v = (node as unknown as Record<string, unknown>)[key];
      if (typeof v === "string" && v) val = v;
    }
    return val;
  };
  const resolvedSite: Site = {
    ...site,
    subscription: site.subscription || pick("subscription") || "00000000-0000-0000-0000-000000000000",
    resourceGroup: site.resourceGroup || pick("resourceGroup") || "(subscription-scoped)",
    location,
  };

  return {
    site: resolvedSite,
    ancestry,
    runtime: synthRuntime(resolvedSite, ancestry),
    resolvedLabels: labels,
    resolvedLocation: location,
  };
}

export interface RepoFleetResult {
  fleet: FleetSite[];
  /** Templates found in the repo (kind: SiteTemplate). */
  templates: SiteTemplate[];
  /** Repo-relative paths that failed to parse, for surfacing in the UI. */
  skipped: string[];
}

/**
 * Read every YAML under `<workspace>/sites/`, parse it, split sites from
 * templates, resolve inheritance, and map to FleetSite[]. Throws on a hard
 * GitHub/network error; individual unparseable files are collected in
 * `skipped` rather than failing the whole load.
 */
export async function loadRepoFleet(conn: RepoConnection): Promise<RepoFleetResult> {
  const repo = coords(conn);
  const sitesPrefix = `${conn.workspace.replace(/\/$/, "")}/sites`;
  const entries = await listTree(repo, sitesPrefix);
  const yamlFiles = entries.filter((e) => /\.ya?ml$/i.test(e.path));

  const sites: Site[] = [];
  const templates: SiteTemplate[] = [];
  const skipped: string[] = [];

  // Fetch blobs in parallel; the client caches by ETag so reloads stay cheap.
  const blobs = await Promise.all(
    yamlFiles.map(async (f) => {
      try {
        return { path: f.path, text: await fetchBlob(repo, f.sha) };
      } catch {
        return { path: f.path, text: null };
      }
    }),
  );

  for (const { path, text } of blobs) {
    if (text === null) {
      skipped.push(path);
      continue;
    }
    let doc: unknown;
    try {
      doc = parseYaml(text);
    } catch {
      skipped.push(path);
      continue;
    }
    if (!isSiteDoc(doc)) {
      skipped.push(path);
      continue;
    }
    if (doc.kind === "SiteTemplate") {
      templates.push(doc as SiteTemplate);
    } else if (doc.kind === "Site") {
      // Tolerate subscription-scoped sites with no resourceGroup.
      const site = doc as Site;
      if (!site.resourceGroup) site.resourceGroup = "(subscription-scoped)";
      sites.push(site);
    } else {
      skipped.push(path);
    }
  }

  const templatesByName = new Map(templates.map((t) => [t.name, t]));
  const fleet = sites
    .map((s) => toFleetSite(s, templatesByName))
    .sort((a, b) => a.site.name.localeCompare(b.site.name));

  return { fleet, templates, skipped };
}
