// Live manifest fetch: pull YAML from a public Scale Kit-shaped repo and
// project it into the existing ManifestFile shape so the Developer screen
// can consume it without changes.
//
// The demo repo is *this* repo (`shkalavala/aio-launchpad`) pointing at
// `context/scale-kit-real-yaml/`, which already contains the Contoso-scrubbed
// site/template tree. Same files the fixture is modeled on.

import type { ManifestFile, ManifestNodeKind } from "@/lib/fixtures/manifests";
import { fetchBlob, listTree, type RepoCoords } from "./client";

export const LIVE_REPO: RepoCoords = {
  owner: "shkalavala",
  repo: "aio-launchpad",
  branch: "main",
};

/** Folder of the real YAML tree inside the demo repo. */
export const LIVE_PATH_PREFIX = "context/scale-kit-real-yaml";

/**
 * Map a filename to one of the canonical Developer-screen folders. Mirrors
 * the workspaces/iot-operations/ layout from Azure/digital-ops-scale-kit so
 * the existing tree-grouping in the UI still makes sense.
 */
function classify(filename: string): { folder: string; kind: ManifestNodeKind } | null {
  if (filename.startsWith("aio-release-")) return { folder: "parameters/aio-releases", kind: "release" };
  if (filename.startsWith("input-")) return { folder: "parameters/inputs", kind: "input" };
  if (filename.startsWith("cont-shared-")) return { folder: "sites/shared", kind: "template" };
  if (filename.startsWith("cont-")) return { folder: "sites", kind: "site" };
  // manifest-*, reference-* etc. — not surfaced in the current tree.
  return null;
}

/**
 * Tiny line-oriented YAML reader. Pulls only the parsed-fields subset the
 * sidebar renders: apiVersion, kind, name, inherits, aioRelease, labels.
 * Avoids a real YAML parser dep for the prototype. Good enough for the
 * controlled Scale Kit shape — not a general YAML parser.
 */
function parseFields(yaml: string): ManifestFile["parsed"] {
  const get = (key: string): string | undefined => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
    if (!m) return undefined;
    return m[1].replace(/^["']|["']$/g, "");
  };
  // aioRelease can be top-level or nested under properties. The current
  // fixtures keep it at top-level in concrete sites; templates set it on
  // properties.aioRelease. Try both — first match wins.
  const aioRelease =
    get("aioRelease") ??
    yaml.match(/^\s+aioRelease:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
  const labels: Array<[string, string]> = [];
  const labelsBlock = yaml.match(/^labels:\s*\n((?:\s{2,}.+\n?)+)/m);
  if (labelsBlock) {
    for (const line of labelsBlock[1].split("\n")) {
      const m = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.+?)\s*$/);
      if (m) labels.push([m[1], m[2].replace(/^["']|["']$/g, "")]);
    }
  }
  return {
    apiVersion: get("apiVersion"),
    kind: get("kind"),
    name: get("name"),
    inherits: get("inherits"),
    aioRelease,
    labels: labels.length > 0 ? labels : undefined,
  };
}

/** Fetch and project the live tree into ManifestFile shape. */
export async function fetchLiveManifests(): Promise<ManifestFile[]> {
  const entries = await listTree(LIVE_REPO, LIVE_PATH_PREFIX);
  const yamlEntries = entries.filter((e) => e.path.endsWith(".yaml"));
  // Fetch blobs in parallel (small set, ~25 files). If this grows we'll add
  // a concurrency limiter — for now, the anon rate limit is the real cap.
  const files = await Promise.all(
    yamlEntries.map(async (e) => {
      const filename = e.path.split("/").pop()!;
      const c = classify(filename);
      if (!c) return null;
      const yaml = await fetchBlob(LIVE_REPO, e.sha);
      const displayName = filename;
      const file: ManifestFile = {
        path: e.path,
        name: displayName,
        folder: c.folder,
        kind: c.kind,
        yaml,
        parsed: parseFields(yaml),
      };
      return file;
    }),
  );
  return files.filter((f): f is ManifestFile => f !== null);
}
