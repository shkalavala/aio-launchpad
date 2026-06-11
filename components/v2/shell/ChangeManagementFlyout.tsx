"use client";

import { useState } from "react";
import {
  GitCommitHorizontal,
  GitPullRequest,
  Inbox,
  RadioTower,
  ChevronRight,
  Check,
  X,
  Layers,
  Loader2,
  ExternalLink,
  CornerDownRight,
} from "lucide-react";
import { useV2Store } from "@/store/useV2Store";
import { shortSha } from "@/lib/git/fixtures";
import type { PendingChange, IncomingChange, DriftRecord } from "@/lib/git/model";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { RepoConnectPanel } from "@/components/v2/shell/RepoConnectPanel";
import { useRepoConnection } from "@/store/useRepoConnection";
import { useChangeStage, useStagedEdits } from "@/store/useChangeStage";
import { writerFromConnection, resolveWriteToken } from "@/lib/github/writeClient";
import { changeBranch } from "@/lib/v2/templateEdit";

/** Full change-management body: repo, pending changes, incoming, drift. */
export function ChangeManagementFlyout() {
  return (
    <div className="max-h-[70vh] w-[420px] overflow-y-auto p-3">
      <SectionLabel>Repository</SectionLabel>
      <RepoConnectPanel />

      <StagedBindingsSection />
      <PendingSection />
      <IncomingSection />
      <DriftSection />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle first:mt-0">
      {children}
    </div>
  );
}

// ── Staged authoring edits (real repo, one PR for the whole batch) ───────────

function StagedBindingsSection() {
  const staged = useStagedEdits();
  const unstage = useChangeStage((s) => s.unstage);
  const clearAll = useChangeStage((s) => s.clearAll);
  const connection = useRepoConnection((s) => s.connection);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ number: number; url: string } | null>(null);

  const effectiveToken = resolveWriteToken(connection?.token);
  const canOpenPr = !!connection && staged.length > 0 && !!effectiveToken && !submitting;
  const templateCount = staged.filter((s) => s.kind === "template-default").length;
  const siteCount = staged.length - templateCount;

  async function onOpenPr() {
    if (!connection) return;
    setSubmitting(true);
    setError(null);
    try {
      const writer = writerFromConnection({ ...connection, token: effectiveToken });
      if (!writer) throw new Error("A write-scoped token is required to open a pull request.");

      const changes = staged.map((s) => ({ path: s.filePath, content: s.patchedText }));
      const summary = staged
        .map((s) => {
          const head = s.kind === "template-default" ? `- template \`${s.title}\`` : `- \`${s.title}\``;
          const lines = s.deltas.map((d) => `  - ${d.label}: \`${d.before}\` → \`${d.after}\``);
          if (s.affectedSites && s.affectedSites.length > 0) {
            lines.push(`  - blast radius: ${s.affectedSites.length} site(s) — ${s.affectedSites.join(", ")}`);
          }
          return [head, ...lines].join("\n");
        })
        .join("\n");

      const parts: string[] = [];
      if (siteCount) parts.push(`${siteCount} site${siteCount === 1 ? "" : "s"}`);
      if (templateCount) parts.push(`${templateCount} template${templateCount === 1 ? "" : "s"}`);
      const scope = parts.join(" + ");

      const pr = await writer.authorChange({
        branch: changeBranch(),
        changes,
        commitMessage: `Edit fleet defaults — ${scope}`,
        prTitle: `Edit fleet defaults — ${scope}`,
        prBody: [
          "Updates Azure bindings and/or template defaults, authored via AIO Launchpad.",
          "",
          summary,
          "",
          "Only the edited values change — each file's comments and key order are preserved.",
        ].join("\n"),
      });
      setResult({ number: pr.number, url: pr.url });
      clearAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open the pull request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (staged.length === 0 && !result) return null;

  return (
    <>
      <SectionLabel>
        <Layers className="h-3.5 w-3.5" />
        Staged edits
        {staged.length > 0 && (
          <Badge tone="accent" className="ml-1 text-[10px]">
            {staged.length}
          </Badge>
        )}
      </SectionLabel>

      {result ? (
        <div className="rounded-md border border-success/40 bg-success/10 p-2.5 text-[12px]">
          <div className="flex items-center gap-1.5 font-medium text-fg">
            <Check className="h-3.5 w-3.5 text-success" />
            Pull request #{result.number} opened
          </div>
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Review on GitHub
          </a>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="ml-3 text-[12px] text-fg-subtle hover:text-fg"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {staged.map((s) => (
              <div key={s.key} className="rounded-md border border-border bg-bg-subtle/40 p-2.5 text-[12px]">
                <div className="flex items-center gap-1.5">
                  {s.kind === "template-default" && (
                    <Badge tone="neutral" className="shrink-0 text-[10px]">
                      template
                    </Badge>
                  )}
                  <span className="font-mono font-medium text-fg">{s.title}</span>
                  <button
                    type="button"
                    onClick={() => unstage(s.key)}
                    className="ml-auto text-fg-subtle hover:text-danger"
                    title="Unstage"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 space-y-0.5">
                  {s.deltas.map((d) => (
                    <div key={d.field} className="flex items-start gap-1 font-mono text-[11px] text-fg-subtle">
                      <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                      <span>
                        {d.label}: <span className="line-through">{d.before}</span>
                        <span className="mx-1">→</span>
                        <span className="text-fg">{d.after}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {s.affectedSites && s.affectedSites.length > 0 && (
                  <div className="mt-1 text-[11px] text-warning-fg">
                    Blast radius: {s.affectedSites.length} site{s.affectedSites.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!effectiveToken && (
            <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-2 text-[11px] text-fg">
              A write-scoped token is required to open the pull request.
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={onOpenPr} disabled={!canOpenPr}>
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitPullRequest className="h-3.5 w-3.5" />
              )}
              Open PR ({staged.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll} disabled={submitting}>
              Clear all
            </Button>
          </div>
        </>
      )}
    </>
  );
}

// ── Pending changes ─────────────────────────────────────────────────────────

function PendingSection() {
  const pending = useV2Store((s) => s.pendingChanges);
  const pr = useV2Store((s) => s.pullRequest);
  const commitPending = useV2Store((s) => s.commitPending);
  const createPullRequest = useV2Store((s) => s.createPullRequest);
  const discardAll = useV2Store((s) => s.discardAllPending);
  const mergePR = useV2Store((s) => s.mergePullRequest);
  const closePR = useV2Store((s) => s.closePullRequest);

  return (
    <>
      <SectionLabel>
        <GitCommitHorizontal className="h-3.5 w-3.5" />
        Pending changes
        {pending.length > 0 && (
          <Badge tone="warning" className="ml-1 text-[10px]">
            {pending.length}
          </Badge>
        )}
      </SectionLabel>

      {pending.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-fg-subtle">
          Working tree is clean. Edit a site configuration to stage a change.
        </p>
      ) : (
        <div className="space-y-1.5">
          {pending.map((pc) => (
            <PendingRow key={pc.id} pc={pc} />
          ))}
        </div>
      )}

      {pr ? (
        <div className="mt-2 rounded-md border border-accent/40 bg-accent/5 p-2.5 text-[12px]">
          <div className="flex items-center gap-1.5 font-medium text-fg">
            <GitPullRequest className="h-3.5 w-3.5 text-accent" />
            PR #{pr.number}
          </div>
          <div className="mt-0.5 text-fg">{pr.title}</div>
          <div className="font-mono text-[11px] text-fg-subtle">
            {pr.branch} · {pr.fileCount} file{pr.fileCount === 1 ? "" : "s"}
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="primary" onClick={mergePR}>
              <Check className="h-3.5 w-3.5" />
              Merge PR
            </Button>
            <Button size="sm" variant="ghost" onClick={closePR}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        pending.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => commitPending()}>
              <GitCommitHorizontal className="h-3.5 w-3.5" />
              Commit to git
            </Button>
            <Button size="sm" variant="default" onClick={() => createPullRequest()}>
              <GitPullRequest className="h-3.5 w-3.5" />
              Create PR
            </Button>
            <Button size="sm" variant="ghost" onClick={discardAll}>
              Discard all
            </Button>
          </div>
        )
      )}
    </>
  );
}

function PendingRow({ pc }: { pc: PendingChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border bg-bg-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12px]"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 text-fg-subtle transition-transform", open && "rotate-90")} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{pc.path}</span>
        <Badge tone="accent" className="text-[10px]">
          {pc.fields.length} field{pc.fields.length === 1 ? "" : "s"}
        </Badge>
      </button>
      {open && (
        <div className="border-t border-border px-2.5 py-2">
          {pc.fields.map((f) => (
            <FieldDelta key={f.key} fieldKey={f.key} before={f.before} after={f.after} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Incoming changes ────────────────────────────────────────────────────────

function IncomingSection() {
  const incoming = useV2Store((s) => s.incomingChanges);

  return (
    <>
      <SectionLabel>
        <Inbox className="h-3.5 w-3.5" />
        Incoming from git
        {incoming.length > 0 && (
          <Badge tone="accent" className="ml-1 text-[10px]">
            {incoming.length}
          </Badge>
        )}
      </SectionLabel>
      {incoming.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-fg-subtle">
          Up to date with the branch.
        </p>
      ) : (
        <div className="space-y-1.5">
          {incoming.map((c) => (
            <IncomingRow key={c.id} change={c} />
          ))}
        </div>
      )}
    </>
  );
}

function IncomingRow({ change }: { change: IncomingChange }) {
  const [open, setOpen] = useState(false);
  const applyIncoming = useV2Store((s) => s.applyIncoming);
  const dismissIncoming = useV2Store((s) => s.dismissIncoming);
  return (
    <div className="rounded-md border border-border bg-bg-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-left text-[12px]"
      >
        <ChevronRight className={cn("mt-0.5 h-3.5 w-3.5 text-fg-subtle transition-transform", open && "rotate-90")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-fg">{change.commit.message}</span>
          <span className="font-mono text-[11px] text-fg-subtle">
            {shortSha(change.commit.sha)} · {change.commit.author} · {change.affectedSites.length} site
            {change.affectedSites.length === 1 ? "" : "s"}
          </span>
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-2.5 py-2">
          <p className="mb-1.5 text-[11px] text-fg-subtle">{change.summary}</p>
          {change.perSite.map((s) => (
            <div key={s.siteName} className="mb-1.5">
              <div className="font-mono text-[11px] text-fg">{s.siteName}</div>
              {s.fields.map((f) => (
                <FieldDelta key={f.key} fieldKey={f.key} before={f.before} after={f.after} />
              ))}
            </div>
          ))}
          <div className="mt-1.5 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => applyIncoming(change.id)}>
              <Check className="h-3.5 w-3.5" />
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dismissIncoming(change.id)}>
              <X className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drift ───────────────────────────────────────────────────────────────────

function DriftSection() {
  const driftChecked = useV2Store((s) => s.driftChecked);
  const driftRecords = useV2Store((s) => s.driftRecords);
  const runDriftCheck = useV2Store((s) => s.runDriftCheck);

  return (
    <>
      <SectionLabel>
        <RadioTower className="h-3.5 w-3.5" />
        Drift
        {driftChecked && driftRecords.length > 0 && (
          <Badge tone="danger" className="ml-1 text-[10px]">
            {driftRecords.length}
          </Badge>
        )}
      </SectionLabel>
      {!driftChecked ? (
        <div className="rounded-md border border-dashed border-border px-3 py-3">
          <p className="mb-2 text-[12px] text-fg-subtle">
            Compare what is running against git. Computed on demand, not watched.
          </p>
          <Button size="sm" variant="default" onClick={runDriftCheck}>
            <RadioTower className="h-3.5 w-3.5" />
            Run drift check
          </Button>
        </div>
      ) : driftRecords.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-success">
          No drift — portal matches git.
        </p>
      ) : (
        <div className="space-y-1.5">
          {driftRecords.map((d) => (
            <DriftRow key={d.siteName} record={d} />
          ))}
        </div>
      )}
    </>
  );
}

function DriftRow({ record }: { record: DriftRecord }) {
  const resolveDrift = useV2Store((s) => s.resolveDrift);
  const reconcileDrift = useV2Store((s) => s.reconcileDrift);
  const gitAhead = record.direction === "git-ahead";
  return (
    <div className="rounded-md border border-danger/40 bg-danger/5 p-2.5 text-[12px]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg">{record.siteName}</span>
        <Badge tone="danger" className="text-[10px]">
          {record.direction === "portal-ahead" ? "portal ahead" : "git ahead"}
        </Badge>
      </div>
      <div className="mt-1.5">
        {record.fields.map((f) => (
          <FieldDelta key={f.key} fieldKey={f.key} before={f.before} after={f.after} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {gitAhead ? (
          <>
            <Button size="sm" variant="default" onClick={() => reconcileDrift(record.siteName)}>
              Reconcile to git
            </Button>
            <span className="text-[11px] text-fg-subtle">re-applies git via a deployment</span>
          </>
        ) : (
          <>
            <Button size="sm" variant="default" onClick={() => resolveDrift(record.siteName)}>
              Capture to git
            </Button>
            <span className="text-[11px] text-fg-subtle">commits the running state</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

function FieldDelta({
  fieldKey,
  before,
  after,
}: {
  fieldKey: string;
  before: unknown;
  after: unknown;
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 text-[11px]">
      <span className="min-w-0 flex-1 truncate font-mono text-fg-muted">{fieldKey}</span>
      <span className="font-mono text-danger line-through">{fmt(before)}</span>
      <ChevronRight className="h-3 w-3 text-fg-subtle" />
      <span className="font-mono text-success">{fmt(after)}</span>
    </div>
  );
}

function fmt(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
