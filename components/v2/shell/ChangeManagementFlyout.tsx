"use client";

import { useState } from "react";
import {
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Inbox,
  RadioTower,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { useV2Store } from "@/store/useV2Store";
import { shortSha } from "@/lib/git/fixtures";
import { isWriteEnabled } from "@/lib/github/writeClient";
import type { PendingChange, IncomingChange, DriftRecord } from "@/lib/git/model";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/** Full change-management body: repo, pending changes, incoming, drift. */
export function ChangeManagementFlyout() {
  const repo = useV2Store((s) => s.repo);
  const writeLive = isWriteEnabled();

  return (
    <div className="max-h-[70vh] w-[420px] overflow-y-auto p-3">
      <SectionLabel>Repository</SectionLabel>
      <div className="rounded-md border border-border bg-bg-subtle p-2.5 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">
            {repo.owner}/{repo.repo}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-fg">
            <GitBranch className="h-3 w-3" />
            {repo.branch}
          </span>
        </div>
        <div className="mt-1.5 border-t border-border pt-1.5">
          <div className="font-mono text-[11px] text-accent">{shortSha(repo.lastCommit.sha)}</div>
          <div className="truncate text-fg">{repo.lastCommit.message}</div>
          <div className="text-[11px] text-fg-subtle">by {repo.lastCommit.author}</div>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5">
          <Badge tone={writeLive ? "success" : "neutral"} className="text-[10px]">
            {writeLive ? "writes: live fork" : "writes: in-memory mock"}
          </Badge>
          {!writeLive && (
            <span className="text-[10px] text-fg-subtle">
              connect a fork + token to push real branches & PRs
            </span>
          )}
        </div>
      </div>

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
