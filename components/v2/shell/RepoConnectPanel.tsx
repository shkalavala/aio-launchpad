"use client";

import { useState } from "react";
import {
  GitBranch,
  Github,
  Plug,
  RefreshCw,
  Unplug,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useV2Store } from "@/store/useV2Store";
import { useRepoConnection } from "@/store/useRepoConnection";
import { shortSha } from "@/lib/git/fixtures";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

const DEFAULTS = {
  slug: "shkalavala/launchpad-animated-fishstick",
  branch: "main",
  workspace: "workspaces/iot-operations",
};

/**
 * Repository connection control for the v2 change-management flyout.
 *
 * - Disconnected: shows the in-memory mock repo + a "Connect a repository" form
 *   (owner/repo, branch, workspace, optional PAT).
 * - Connected: shows the live repo coords, site count, and refresh/disconnect.
 *
 * The PAT lives only in sessionStorage (see useRepoConnection) and is sent only
 * to api.github.com. Never logged, never committed.
 */
export function RepoConnectPanel() {
  const mockRepo = useV2Store((s) => s.repo);
  const { connection, status, error, fleet, skipped, connect, refresh, disconnect } =
    useRepoConnection();

  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(DEFAULTS.slug);
  const [branch, setBranch] = useState(DEFAULTS.branch);
  const [workspace, setWorkspace] = useState(DEFAULTS.workspace);
  const [token, setToken] = useState("");

  const connecting = status === "loading";
  const connected = status === "connected" && fleet !== null;

  async function onConnect() {
    const [owner, repo] = slug.trim().split("/");
    if (!owner || !repo) return;
    await connect({ owner, repo, branch, workspace, token: token.trim() || undefined });
  }

  if (connected && connection) {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-2.5 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <Github className="h-3.5 w-3.5" />
            {connection.owner}/{connection.repo}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-fg">
            <GitBranch className="h-3 w-3" />
            {connection.branch}
          </span>
        </div>
        <div className="mt-1.5 border-t border-border pt-1.5 text-fg">
          <span className="font-mono text-[11px] text-fg-subtle">{connection.workspace}/sites</span>
          <div className="mt-0.5 inline-flex items-center gap-1.5">
            <Badge tone="success" className="text-[10px]">
              <CheckCircle2 className="mr-0.5 h-3 w-3" />
              live repo
            </Badge>
            <span className="text-fg">
              {fleet.length} site{fleet.length === 1 ? "" : "s"} from git
            </span>
            {connection.token && (
              <Badge tone="neutral" className="text-[10px]">
                authenticated
              </Badge>
            )}
          </div>
        </div>
        {skipped.length > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-warning">
            <AlertTriangle className="h-3 w-3" />
            {skipped.length} file{skipped.length === 1 ? "" : "s"} skipped (not a site)
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={connecting}>
            {connecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={disconnect}>
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-bg-subtle p-2.5 text-[12px]">
      {/* In-memory mock repo (the source of the demo git working state). */}
      <div className="flex items-center justify-between">
        <span className="text-fg-muted">
          {mockRepo.owner}/{mockRepo.repo}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-fg">
          <GitBranch className="h-3 w-3" />
          {mockRepo.branch}
        </span>
      </div>
      <div className="mt-1.5 border-t border-border pt-1.5">
        <div className="font-mono text-[11px] text-accent">{shortSha(mockRepo.lastCommit.sha)}</div>
        <div className="truncate text-fg">{mockRepo.lastCommit.message}</div>
        <div className="text-[11px] text-fg-subtle">by {mockRepo.lastCommit.author}</div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5">
        <Badge tone="neutral" className="text-[10px]">
          mock fleet · demo data
        </Badge>
      </div>

      {!open ? (
        <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setOpen(true)}>
          <Plug className="h-3.5 w-3.5" />
          Connect a repository
        </Button>
      ) : (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <div>
            <Label>Repository (owner/repo)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="owner/repo" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Branch</Label>
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
            </div>
            <div className="flex-[1.4]">
              <Label>Workspace</Label>
              <Input
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                placeholder="workspaces/iot-operations"
              />
            </div>
          </div>
          <div>
            <Label>Personal access token (optional)</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_… (public repos work without)"
              autoComplete="off"
            />
            <p className="mt-1 text-[10px] leading-snug text-fg-subtle">
              Fine-grained, single-repo token. Held in this tab only (cleared on close), sent only to
              api.github.com. Never committed or logged.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-1.5 rounded border border-danger/40 bg-danger/5 px-2 py-1.5 text-[11px] text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={onConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="h-3.5 w-3.5" />
              )}
              Connect
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={connecting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
      {children}
    </div>
  );
}
