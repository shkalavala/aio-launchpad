// GitHub REST WRITE path — "Step B" of the real-repo integration.
//
// This is the authoring path Launchpad needs to make in-UI config edits real:
// stage an edit -> branch -> commit -> open PR -> (review) -> merge, against a
// forked Scale Kit repo. It is fully implemented but INERT until activated:
// `getWriteConfig()` returns null unless a token + fork coordinates are wired
// in (see below), so importing this module changes no behaviour on its own.
//
// ACTIVATION (requires the operator's GitHub auth — cannot be done from code):
//   1. Fork the Scale Kit repo (e.g. you/aio-fleet).
//   2. Provide a token with `repo` scope (fine-grained: Contents RW + Pull
//      requests RW on that fork), or a GitHub App installation token.
//   3. Set NEXT_PUBLIC_GH_FORK_OWNER / _REPO / _BRANCH and supply the token at
//      runtime (never commit it). A PAT in NEXT_PUBLIC_* is fine for a local
//      demo only; production should use a GitHub App + server-side exchange.
//
// SECURITY: never hard-code or commit a token. The write path mutates a real
// repo; keep it pointed at a FORK, never the upstream Scale Kit repo.

import type { RepoCoords } from "@/lib/github/client";

const API = "https://api.github.com";

export interface WriteAuth {
  /** PAT or GitHub App installation token with Contents + PRs write. */
  token: string;
}

/** A single file to write in a commit: full replacement content. */
export interface FileChange {
  path: string;
  /** Full UTF-8 file content (YAML). Encoded to base64 on the wire. */
  content: string;
}

export interface OpenedPullRequest {
  number: number;
  url: string;
  headBranch: string;
}

/**
 * Resolve write activation from env. Returns null when not configured, which
 * keeps the whole write path inert. The token is read at call time so it is
 * never baked into a build artifact.
 */
export function getWriteConfig(): { repo: RepoCoords; auth: WriteAuth } | null {
  const owner = process.env.NEXT_PUBLIC_GH_FORK_OWNER;
  const repo = process.env.NEXT_PUBLIC_GH_FORK_REPO;
  const branch = process.env.NEXT_PUBLIC_GH_FORK_BRANCH ?? "main";
  const token = process.env.NEXT_PUBLIC_GH_TOKEN;
  if (!owner || !repo || !token) return null;
  return { repo: { owner, repo, branch }, auth: { token } };
}

/** True when the write path has been activated with auth + a fork target. */
export function isWriteEnabled(): boolean {
  return getWriteConfig() !== null;
}

function b64encode(text: string): string {
  // UTF-8 safe base64 for the Git blob/Contents API.
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function ghWrite<T>(
  auth: WriteAuth,
  method: "POST" | "PATCH" | "PUT",
  url: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${res.statusText}: ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function ghRead<T>(auth: WriteAuth, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${auth.token}`,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${res.statusText}: ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * A thin authenticated writer over one fork. Each method maps to exactly one
 * step of the stage -> branch -> commit -> PR -> merge flow so the store's
 * in-memory git operations can be swapped onto it 1:1 when activated.
 */
export class GitHubWriter {
  constructor(
    private readonly repo: RepoCoords,
    private readonly auth: WriteAuth,
  ) {}

  /** SHA of the tip commit of a branch. */
  private async headSha(branch: string): Promise<string> {
    const ref = await ghRead<{ object: { sha: string } }>(
      this.auth,
      `${API}/repos/${this.repo.owner}/${this.repo.repo}/git/refs/heads/${branch}`,
    );
    return ref.object.sha;
  }

  /**
   * Create `newBranch` off `fromBranch` (defaults to the configured base).
   * No-op-safe: if the branch already exists, returns its current tip.
   */
  async ensureBranch(newBranch: string, fromBranch = this.repo.branch): Promise<string> {
    try {
      return await this.headSha(newBranch);
    } catch {
      // Branch does not exist yet — create it off the base tip.
    }
    const baseSha = await this.headSha(fromBranch);
    await ghWrite(
      this.auth,
      "POST",
      `${API}/repos/${this.repo.owner}/${this.repo.repo}/git/refs`,
      { ref: `refs/heads/${newBranch}`, sha: baseSha },
    );
    return baseSha;
  }

  /**
   * Atomically commit one or more file changes onto `branch` via the Git Data
   * (trees) API, then advance the branch ref. Returns the new commit SHA.
   */
  async commitChanges(branch: string, changes: FileChange[], message: string): Promise<string> {
    if (changes.length === 0) throw new Error("commitChanges: no changes provided");
    const owner = this.repo.owner;
    const repo = this.repo.repo;

    const parentSha = await this.headSha(branch);
    const parentCommit = await ghRead<{ tree: { sha: string } }>(
      this.auth,
      `${API}/repos/${owner}/${repo}/git/commits/${parentSha}`,
    );

    // Create blobs, then a tree based on the parent tree.
    const tree = await Promise.all(
      changes.map(async (c) => {
        const blob = await ghWrite<{ sha: string }>(
          this.auth,
          "POST",
          `${API}/repos/${owner}/${repo}/git/blobs`,
          { content: b64encode(c.content), encoding: "base64" },
        );
        return { path: c.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
      }),
    );

    const newTree = await ghWrite<{ sha: string }>(
      this.auth,
      "POST",
      `${API}/repos/${owner}/${repo}/git/trees`,
      { base_tree: parentCommit.tree.sha, tree },
    );

    const newCommit = await ghWrite<{ sha: string }>(
      this.auth,
      "POST",
      `${API}/repos/${owner}/${repo}/git/commits`,
      { message, tree: newTree.sha, parents: [parentSha] },
    );

    await ghWrite(
      this.auth,
      "PATCH",
      `${API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      { sha: newCommit.sha, force: false },
    );

    return newCommit.sha;
  }

  /** Open a pull request from `head` into `base` (defaults to the base branch). */
  async openPullRequest(
    head: string,
    title: string,
    body = "",
    base = this.repo.branch,
  ): Promise<OpenedPullRequest> {
    const pr = await ghWrite<{ number: number; html_url: string }>(
      this.auth,
      "POST",
      `${API}/repos/${this.repo.owner}/${this.repo.repo}/pulls`,
      { title, head, base, body },
    );
    return { number: pr.number, url: pr.html_url, headBranch: head };
  }

  /** Merge a pull request. Default to squash to keep fleet history linear. */
  async mergePullRequest(
    number: number,
    method: "merge" | "squash" | "rebase" = "squash",
  ): Promise<string> {
    const res = await ghWrite<{ sha: string; merged: boolean }>(
      this.auth,
      "PUT",
      `${API}/repos/${this.repo.owner}/${this.repo.repo}/pulls/${number}/merge`,
      { merge_method: method },
    );
    if (!res.merged) throw new Error(`PR #${number} did not merge`);
    return res.sha;
  }

  /**
   * One-shot helper mirroring the store's flow: branch -> commit -> open PR.
   * Returns the opened PR so the caller can drive review/merge separately.
   */
  async authorChange(args: {
    branch: string;
    changes: FileChange[];
    commitMessage: string;
    prTitle: string;
    prBody?: string;
  }): Promise<OpenedPullRequest> {
    await this.ensureBranch(args.branch);
    await this.commitChanges(args.branch, args.changes, args.commitMessage);
    return this.openPullRequest(args.branch, args.prTitle, args.prBody);
  }
}

/**
 * Build a writer from env activation, or null when not configured. Callers
 * should branch on null and fall back to the in-memory mock store.
 */
export function getGitHubWriter(): GitHubWriter | null {
  const cfg = getWriteConfig();
  if (!cfg) return null;
  return new GitHubWriter(cfg.repo, cfg.auth);
}
