// Source switch for manifest data on the Developer screen.
//
// Default: fixture mode — inline strings, zero network, always works.
// Opt-in:  live mode — read-only fetch of YAML from the demo repo.
//
// Activation: `?source=live` in the URL. No persisted setting yet; one click
// to revert by removing the query param. This keeps the public Pages demo
// safe (it never burns rate limit unless someone explicitly opts in).

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MANIFEST_FILES as FIXTURE_FILES,
  MANIFEST_REPO as FIXTURE_REPO,
  DEFAULT_MANIFEST_PATH as FIXTURE_DEFAULT_PATH,
  type ManifestFile,
} from "@/lib/fixtures/manifests";
import {
  LIVE_REPO,
  LIVE_PATH_PREFIX,
  fetchLiveManifests,
} from "@/lib/github/manifests";
import { blobUrl, editUrl, type RepoCoords } from "@/lib/github/client";

export type ManifestSource = "fixture" | "live";

export interface ManifestSourceState {
  source: ManifestSource;
  files: ManifestFile[];
  tree: Array<{ folder: string; files: ManifestFile[] }>;
  defaultPath: string;
  repo: { owner: string; repo: string; branch: string };
  /** Deep link to the file on github.com. Source-aware. */
  githubFileUrl: (path: string) => string;
  /** Deep link to the GitHub web editor. Source-aware. */
  githubEditUrl: (path: string) => string;
  loading: boolean;
  error: string | null;
}

const FOLDER_ORDER = [
  "sites",
  "sites/shared",
  "parameters/aio-releases",
  "parameters/inputs",
];

function groupTree(files: ManifestFile[]): ManifestSourceState["tree"] {
  return FOLDER_ORDER.map((folder) => ({
    folder,
    files: files
      .filter((f) => f.folder === folder)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.files.length > 0);
}

function pickDefault(files: ManifestFile[]): string {
  // Prefer a concrete dev site, fall back to first available file.
  const dev = files.find((f) => f.kind === "site" && /-dev\.yaml$/.test(f.name));
  return (dev ?? files[0])?.path ?? "";
}

function detectSource(): ManifestSource {
  if (typeof window === "undefined") return "fixture";
  const p = new URLSearchParams(window.location.search);
  return p.get("source") === "live" ? "live" : "fixture";
}

const FIXTURE_REPO_COORDS: RepoCoords = {
  owner: FIXTURE_REPO.org,
  repo: FIXTURE_REPO.repo,
  branch: FIXTURE_REPO.defaultBranch,
};

const FIXTURE_TREE = groupTree(FIXTURE_FILES);

const FIXTURE_STATE: ManifestSourceState = {
  source: "fixture",
  files: FIXTURE_FILES,
  tree: FIXTURE_TREE,
  defaultPath: FIXTURE_DEFAULT_PATH,
  repo: FIXTURE_REPO_COORDS,
  githubFileUrl: (path) => blobUrl(FIXTURE_REPO_COORDS, path),
  githubEditUrl: (path) => editUrl(FIXTURE_REPO_COORDS, path),
  loading: false,
  error: null,
};

export function useManifestSource(): ManifestSourceState {
  // Always start in fixture mode so SSR/CSR render the same shell. Live mode
  // upgrades after mount.
  const [source, setSource] = useState<ManifestSource>("fixture");
  const [liveFiles, setLiveFiles] = useState<ManifestFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const target = detectSource();
    setSource(target);
    if (target !== "live") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLiveManifests()
      .then((files) => {
        if (cancelled) return;
        setLiveFiles(files);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo<ManifestSourceState>(() => {
    if (source === "fixture") return FIXTURE_STATE;
    // Live mode: while loading or on error, fall back to fixture data so the
    // tree never renders empty. The banner conveys the live status.
    const files = liveFiles ?? FIXTURE_FILES;
    return {
      source: "live",
      files,
      tree: groupTree(files),
      defaultPath: liveFiles ? pickDefault(files) : FIXTURE_DEFAULT_PATH,
      repo: LIVE_REPO,
      githubFileUrl: (path) => blobUrl(LIVE_REPO, path),
      githubEditUrl: (path) => editUrl(LIVE_REPO, path),
      loading,
      error,
    };
  }, [source, liveFiles, loading, error]);
}

export const LIVE_HELP = `Live mode reads YAML from ${LIVE_REPO.owner}/${LIVE_REPO.repo}@${LIVE_REPO.branch} under ${LIVE_PATH_PREFIX}/. Remove ?source=live to return to fixture data.`;
