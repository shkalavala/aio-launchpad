"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Lock,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  type ManifestFile,
  type ManifestNodeKind,
} from "@/lib/fixtures/manifests";
import { useManifestSource, LIVE_HELP, type ManifestSourceState } from "@/lib/manifestSource";
import { PIPELINE_RUNS, pipelineRunUrl, type PipelineRun, type PipelineStatus } from "@/lib/fixtures/pipeline";

/**
 * Screen 7 — Developer view.
 *
 * Read-only manifest browser + Scale Kit pipeline run history. The point of
 * this screen is to close the demo loop: every other screen claims "the
 * manifest repo is truth," and this one finally *shows* the truth. Three
 * panes:
 *
 *   1. File tree (left) — mirrors workspaces/iot-operations/ from
 *      Azure/digital-ops-scale-kit (sites/, sites/shared/,
 *      parameters/aio-releases/, parameters/inputs/).
 *   2. YAML viewer (center) — raw read-only, with a "truth banner" and
 *      "Open in GitHub" / "Propose edit" deep links. No in-app editing.
 *   3. Right rail — parsed-fields summary on top, recent pipeline runs
 *      below. Pipeline runs are the bridge between merged PRs and fleet
 *      drift on /fleet.
 *
 * Audience: Central IT, Edge System IT. Anti-features: no in-app YAML edit
 * (manifest repo is truth via PR), no "deploy now" button, no rollback.
 */
export default function DeveloperPage() {
  const src = useManifestSource();
  const { files, tree, defaultPath, repo, source, loading, error } = src;

  const getByPath = (p: string) => files.find((f) => f.path === p);

  const [selectedPath, setSelectedPath] = useState<string>(defaultPath);
  const userPickedRef = useRef(false);

  // When live data finishes loading, snap selection to the new defaultPath
  // unless the user has already navigated somewhere themselves.
  useEffect(() => {
    if (userPickedRef.current) return;
    if (!defaultPath) return;
    setSelectedPath(defaultPath);
  }, [defaultPath]);

  const selected = useMemo(
    () => getByPath(selectedPath) ?? tree[0]?.files[0] ?? files[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPath, files, tree],
  );

  const onSelect = (p: string) => {
    userPickedRef.current = true;
    setSelectedPath(p);
  };

  // Allow the parsed-fields "inherits" link to jump to the parent template
  // without prop-drilling a setter into the nested viewer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (!detail?.path) return;
      if (getByPath(detail.path)) {
        userPickedRef.current = true;
        setSelectedPath(detail.path);
      }
    };
    window.addEventListener("devscreen:select", handler as EventListener);
    return () => window.removeEventListener("devscreen:select", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
        <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
          <Link href="/fleet" className="hover:text-accent">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-fg">Source</span>
        </nav>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight text-fg">Source</h1>
            <p className="text-[12px] text-fg-muted">
              Read-only view of the manifest repo and Scale Kit pipeline. Every change to the fleet
              originates as a PR here.
            </p>
          </div>
          <div className="text-right text-[12px] text-fg-muted">
            <div className="flex items-center justify-end gap-1 font-mono text-[11px]">
              <GitBranch className="h-3 w-3" />
              <span className="text-fg">
                {repo.owner}/{repo.repo}
              </span>
              <span>·</span>
              <span>{repo.branch}</span>
            </div>
            <div className="font-mono text-[11px]">
              {tree.reduce((n, g) => n + g.files.length, 0)} files · {PIPELINE_RUNS.length} recent runs
            </div>
            <SourceBadge source={source} loading={loading} error={error} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_320px]">
          <FileTree tree={tree} selectedPath={selected?.path ?? ""} onSelect={onSelect} />
          {selected ? (
            <ManifestViewer
              file={selected}
              repo={repo}
              githubFileUrl={src.githubFileUrl}
              githubEditUrl={src.githubEditUrl}
            />
          ) : (
            <div className="rounded border border-border bg-surface p-6 text-[12px] text-fg-muted">
              {loading ? "Loading manifests from GitHub…" : "No manifest files available."}
            </div>
          )}
          <div className="flex flex-col gap-4">
            {selected && <PipelinePanel selected={selected} />}
            {selected && <ParsedFields file={selected} />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── File tree ───────────────────────────────────────────────────────────────

function SourceBadge({
  source,
  loading,
  error,
}: {
  source: ManifestSourceState["source"];
  loading: boolean;
  error: string | null;
}) {
  if (source === "fixture") {
    return (
      <div
        className="mt-1 font-mono text-[10px] uppercase tracking-wide text-fg-subtle"
        title="Read from inline fixture. Append ?source=live to fetch live YAML from GitHub."
      >
        source: fixture
      </div>
    );
  }
  let tone: string;
  let text: string;
  if (loading) {
    tone = "text-accent";
    text = "source: live · loading…";
  } else if (error) {
    tone = "text-danger";
    text = `source: live · error (${error.slice(0, 60)})`;
  } else {
    tone = "text-success";
    text = "source: live · github.com";
  }
  return (
    <div
      className={cn("mt-1 font-mono text-[10px] uppercase tracking-wide", tone)}
      title={LIVE_HELP}
    >
      {text}
    </div>
  );
}

function FileTree({
  tree,
  selectedPath,
  onSelect,
}: {
  tree: ManifestSourceState["tree"];
  selectedPath: string;
  onSelect: (p: string) => void;
}) {
  return (
    <aside className="rounded border border-border bg-surface">
      <header className="border-b border-border-subtle px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Manifest repo
        </h2>
      </header>
      <div className="p-2">
        {tree.map((group) => (
          <div key={group.folder} className="mb-2 last:mb-0">
            <div className="flex items-center gap-1 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              <ChevronRight className="h-3 w-3" />
              {group.folder}/
            </div>
            <ul className="space-y-px">
              {group.files.map((f) => {
                const active = f.path === selectedPath;
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => onSelect(f.path)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-[12px] transition-colors",
                        active ? "bg-accent-subtle text-accent" : "text-fg hover:bg-bg-subtle",
                      )}
                    >
                      <FileText className="h-3 w-3 shrink-0 text-fg-subtle" />
                      <span className="truncate font-mono">{f.name}</span>
                      <KindBadge kind={f.kind} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

function KindBadge({ kind }: { kind: ManifestNodeKind }) {
  const label =
    kind === "site"
      ? "site"
      : kind === "template"
        ? "tmpl"
        : kind === "release"
          ? "rel"
          : "in";
  return (
    <span className="ml-auto rounded-sm bg-bg-subtle px-1 text-[10px] uppercase tracking-wide text-fg-subtle">
      {label}
    </span>
  );
}

// ── YAML viewer ─────────────────────────────────────────────────────────────

function ManifestViewer({
  file,
  repo,
  githubFileUrl,
  githubEditUrl,
}: {
  file: ManifestFile;
  repo: ManifestSourceState["repo"];
  githubFileUrl: (p: string) => string;
  githubEditUrl: (p: string) => string;
}) {
  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(file.yaml).catch(() => {});
    }
  };
  return (
    <section className="flex min-w-0 flex-col rounded border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2">
        <FileText className="h-3.5 w-3.5 text-fg-subtle" />
        <code className="truncate font-mono text-[12px] text-fg">{file.path}</code>
        <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-muted">
          <Lock className="h-3 w-3" />
          read-only
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-[11px] hover:bg-bg-subtle"
            title="Copy YAML to clipboard"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <a
            href={githubFileUrl(file.path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-[11px] hover:bg-bg-subtle"
          >
            <ExternalLink className="h-3 w-3" />
            Open in GitHub
          </a>
          <a
            href={githubEditUrl(file.path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-accent-subtle px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-subtle/80"
            title="Edits go through a PR — the manifest repo is truth"
          >
            <Pencil className="h-3 w-3" />
            Propose edit
          </a>
        </div>
      </header>
      <div className="flex items-start gap-2 border-b border-border-subtle bg-bg-subtle px-3 py-2 text-[11px] text-fg-muted">
        <GitPullRequest className="mt-px h-3 w-3 shrink-0 text-fg-subtle" />
        <span>
          This file is the source of truth. Launchpad never edits manifests in place — propose an
          edit to open a PR in <code className="font-mono">{repo.owner}/{repo.repo}</code>.
          The Scale Kit pipeline applies the merged change to the fleet.
        </span>
      </div>
      <pre className="m-0 max-h-[640px] overflow-auto bg-bg p-3 font-mono text-[12px] leading-relaxed text-fg">
        {file.yaml}
      </pre>
    </section>
  );
}

// ── Parsed fields ───────────────────────────────────────────────────────────

function ParsedFields({ file }: { file: ManifestFile }) {
  const p = file.parsed;
  return (
    <section className="rounded border border-border bg-surface">
      <header className="border-b border-border-subtle px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Parsed fields
        </h2>
      </header>
      <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 p-3 text-[12px]">
        {p.kind && (
          <>
            <dt className="text-fg-subtle">kind</dt>
            <dd className="font-mono text-fg">{p.kind}</dd>
          </>
        )}
        {p.apiVersion && (
          <>
            <dt className="text-fg-subtle">apiVersion</dt>
            <dd className="font-mono text-fg">{p.apiVersion}</dd>
          </>
        )}
        {p.name && (
          <>
            <dt className="text-fg-subtle">name</dt>
            <dd className="font-mono text-fg">{p.name}</dd>
          </>
        )}
        {p.inherits && (
          <>
            <dt className="text-fg-subtle">inherits</dt>
            <dd className="truncate font-mono text-fg">
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  // Best-effort jump: resolve relative paths against shared/.
                  const target =
                    p.inherits!.startsWith("shared/") || p.inherits!.includes("/")
                      ? p.inherits
                      : `shared/${p.inherits}`;
                  // Re-select in the tree via a custom event on the window so we
                  // avoid prop-drilling. Falls back to a no-op if unrecognized.
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("devscreen:select", { detail: { path: target } }),
                    );
                  }
                }}
                title="Jump to parent template"
              >
                {p.inherits}
              </button>
            </dd>
          </>
        )}
        {p.aioRelease && (
          <>
            <dt className="text-fg-subtle">aioRelease</dt>
            <dd className="font-mono text-fg">
              <Link href={`/releases`} className="text-accent hover:underline">
                {p.aioRelease}
              </Link>
            </dd>
          </>
        )}
        {p.labels && p.labels.length > 0 && (
          <>
            <dt className="self-start text-fg-subtle">labels</dt>
            <dd className="flex flex-wrap gap-1">
              {p.labels.map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg-subtle px-1.5 py-px font-mono text-[11px] text-fg-muted"
                >
                  <span className="text-fg-subtle">{k}:</span>
                  <span className="text-fg">{v}</span>
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}

// ── Pipeline ────────────────────────────────────────────────────────────────

function PipelinePanel({ selected }: { selected: ManifestFile }) {
  // Highlight runs whose changed-sites overlap with the selected file's site
  // name (if it's a Site manifest). Helps connect a site manifest to its
  // most recent rollouts.
  const focusName = selected.kind === "site" ? selected.parsed.name : undefined;
  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex items-baseline justify-between border-b border-border-subtle px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Recent pipeline runs
        </h2>
        {focusName && (
          <span className="text-[11px] text-fg-muted">
            highlighted: <code className="font-mono text-fg">{focusName}</code>
          </span>
        )}
      </header>
      <ul className="divide-y divide-border-subtle">
        {PIPELINE_RUNS.map((r) => {
          const highlight = focusName ? r.sitesChanged.includes(focusName) : false;
          return (
            <li
              key={r.id}
              className={cn(
                "px-3 py-2 text-[12px]",
                highlight && "bg-accent-subtle/30",
              )}
            >
              <div className="flex items-center gap-2">
                <PipelineStatusDot status={r.status} />
                <span className="font-mono text-[12px] font-semibold text-fg">{r.id}</span>
                <a
                  href={pipelineRunUrl(r)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-accent hover:underline"
                >
                  open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-fg">{r.commitMessage}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-muted">
                <GitCommit className="h-3 w-3" />
                <code className="font-mono">{r.commitSha}</code>
                <span>·</span>
                <span>{r.author}</span>
                <span>·</span>
                <span>{formatAgo(r.startedAtMinutesAgo)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-fg-subtle">step</span>
                <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg-subtle px-1.5 py-px font-mono text-[11px] text-fg">
                  {r.scaleKitStep.name}
                </span>
                <PipelineStatusBadge status={r.scaleKitStep.status} />
                <span className="ml-auto text-[11px] text-fg-subtle">
                  {r.sitesChanged.length} site{r.sitesChanged.length === 1 ? "" : "s"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PipelineStatusDot({ status }: { status: PipelineStatus }) {
  const tone =
    status === "success"
      ? "bg-success"
      : status === "running"
        ? "bg-accent"
        : status === "failed"
          ? "bg-danger"
          : "bg-fg-subtle";
  return <span className={cn("h-2 w-2 rounded-full", tone)} aria-hidden />;
}

function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  if (status === "success") return <Badge tone="success">success</Badge>;
  if (status === "failed") return <Badge tone="danger">failed</Badge>;
  if (status === "running") return <Badge tone="accent">running</Badge>;
  return <Badge tone="neutral">cancelled</Badge>;
}

function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
