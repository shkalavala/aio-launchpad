// Minimal GitHub REST client for the read-only "real repo connect" slice.
//
// Scope (Step A, day 1):
//   - Public repos only. No auth.
//   - GET requests against the Contents API + raw refs.
//   - In-memory ETag cache to stay within the 60 req/hr anon limit on hot
//     reloads. Persistent cache (IndexedDB) can come later.
//
// Out of scope here: PAT input, write path (branches/commits/PRs), private
// repos, GitHub App. Those land in step B.

export interface RepoCoords {
  owner: string;
  repo: string;
  branch: string;
  /**
   * Optional fine-grained PAT. When present, requests are authenticated
   * (lifts the 60 req/hr anon limit and unlocks private repos). Never logged
   * or persisted to disk by this module; the caller owns its lifecycle.
   */
  token?: string;
}

export interface GitHubFile {
  path: string;
  sha: string;
  size: number;
  /** Base64-decoded UTF-8 text. */
  text: string;
}

const API = "https://api.github.com";

interface CacheEntry {
  etag: string;
  body: unknown;
}

const cache = new Map<string, CacheEntry>();

async function ghGet<T>(url: string, token?: string): Promise<T> {
  const hit = cache.get(url);
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(hit ? { "If-None-Match": hit.etag } : {}),
    },
  });
  if (res.status === 304 && hit) return hit.body as T;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${res.statusText}: ${detail.slice(0, 200)}`);
  }
  const etag = res.headers.get("etag");
  const body = (await res.json()) as T;
  if (etag) cache.set(url, { etag, body });
  return body;
}

/**
 * List files under `pathPrefix` on the given ref, recursively. Returns paths
 * (and SHAs) only — call `fetchBlob` for content.
 */
export async function listTree(
  repo: RepoCoords,
  pathPrefix: string,
): Promise<Array<{ path: string; sha: string; size: number }>> {
  // Resolve the ref to a tree SHA first so we can use the recursive trees API.
  const ref = await ghGet<{ object: { sha: string } }>(
    `${API}/repos/${repo.owner}/${repo.repo}/git/refs/heads/${repo.branch}`,
    repo.token,
  );
  const commit = await ghGet<{ tree: { sha: string } }>(
    `${API}/repos/${repo.owner}/${repo.repo}/git/commits/${ref.object.sha}`,
    repo.token,
  );
  const tree = await ghGet<{
    truncated: boolean;
    tree: Array<{ path: string; type: string; sha: string; size?: number }>;
  }>(`${API}/repos/${repo.owner}/${repo.repo}/git/trees/${commit.tree.sha}?recursive=1`, repo.token);
  if (tree.truncated) {
    // Acceptable for now — our demo trees are well under 100k entries.
    console.warn("[github] tree truncated; some files may be missing");
  }
  const prefix = pathPrefix.endsWith("/") ? pathPrefix : `${pathPrefix}/`;
  return tree.tree
    .filter((n) => n.type === "blob" && n.path.startsWith(prefix))
    .map((n) => ({ path: n.path, sha: n.sha, size: n.size ?? 0 }));
}

export async function fetchBlob(repo: RepoCoords, sha: string): Promise<string> {
  const blob = await ghGet<{ content: string; encoding: string }>(
    `${API}/repos/${repo.owner}/${repo.repo}/git/blobs/${sha}`,
    repo.token,
  );
  if (blob.encoding !== "base64") {
    throw new Error(`Unexpected blob encoding: ${blob.encoding}`);
  }
  // atob handles base64; replace \n that GitHub injects into the payload.
  const binary = atob(blob.content.replace(/\n/g, ""));
  // Decode as UTF-8 (YAML is text; binary blobs aren't expected here).
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function blobUrl(repo: RepoCoords, path: string): string {
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${path}`;
}

export function editUrl(repo: RepoCoords, path: string): string {
  return `https://github.com/${repo.owner}/${repo.repo}/edit/${repo.branch}/${path}`;
}
