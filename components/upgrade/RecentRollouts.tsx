"use client";

import { CheckCircle2, History, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ROLLOUT_HISTORY,
  type RolloutKind,
  type RolloutOutcome,
  type RolloutRecord,
} from "@/lib/fixtures/rollouts";
import { useAppStore } from "@/store/useAppStore";

/**
 * Recent-rollouts strip at the bottom of /rollout.
 *
 * Bridge to the future Changes model (see repo memory). Answers
 * "what did we ship last week?" without building full history — read-only,
 * 5 rows, deterministic fixture. No filters, no pagination, no click-through
 * yet. Each row collapses kind + target + sites + outcome + when into one
 * compact line.
 */
export function RecentRollouts() {
  const sessionRollouts = useAppStore((s) => s.sessionRollouts);
  const items = [...sessionRollouts, ...ROLLOUT_HISTORY].slice(0, 5);
  if (items.length === 0) return null;
  return (
    <section className="rounded-md border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          <History className="h-3.5 w-3.5 text-fg-subtle" />
          Recent rollouts
        </h2>
        <span className="text-[11px] text-fg-subtle">last {items.length}</span>
      </header>
      <ul className="divide-y divide-border-subtle">
        {items.map((r) => (
          <RolloutRow key={r.id} r={r} />
        ))}
      </ul>
      <footer className="border-t border-border px-3 py-1.5 text-[10px] text-fg-subtle">
        Read-only history. Full Changes timeline lands when the Changes model ships.
      </footer>
    </section>
  );
}

function RolloutRow({ r }: { r: RolloutRecord }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-[12px]">
      <OutcomeIcon outcome={r.outcome} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <KindChip kind={r.kind} />
          <span className="truncate font-medium text-fg">{describeTarget(r)}</span>
          <span className="shrink-0 text-fg-subtle">·</span>
          <span className="shrink-0 text-fg-muted">
            {r.siteCount} site{r.siteCount === 1 ? "" : "s"}
          </span>
          {r.ringStrategy && (
            <>
              <span className="shrink-0 text-fg-subtle">·</span>
              <span className="shrink-0 truncate text-fg-muted">{r.ringStrategy}</span>
            </>
          )}
        </div>
        {r.note && (
          <p
            className={cn(
              "mt-0.5 truncate text-[11px]",
              r.outcome === "failed" ? "text-danger" : "text-fg-subtle",
            )}
          >
            {r.note}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right font-mono text-[11px] text-fg-subtle">
        <div>{formatDate(r.finishedAt)}</div>
        <div>{formatDuration(r.startedAt, r.finishedAt)}</div>
      </div>
    </li>
  );
}

function describeTarget(r: RolloutRecord): string {
  switch (r.kind) {
    case "release":
      return `AIO release ${r.releaseId ?? "—"}`;
    case "install":
      return `Install AIO ${r.releaseId ?? ""}`.trim();
    case "app":
      return r.appName ?? "App deploy";
    case "arm":
      return r.armName ?? "ARM module";
    case "resource":
      return r.resourceLabel ?? "AIO resource re-apply";
  }
}

const KIND_LABEL: Record<RolloutKind, string> = {
  release: "release",
  install: "install",
  app: "app",
  arm: "module",
  resource: "aio resource",
};

function KindChip({ kind }: { kind: RolloutKind }) {
  return (
    <span className="shrink-0 rounded-sm border border-border bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
      {KIND_LABEL[kind]}
    </span>
  );
}

function OutcomeIcon({ outcome }: { outcome: RolloutOutcome }) {
  if (outcome === "succeeded")
    return <CheckCircle2 className="h-4 w-4 text-success" aria-label="succeeded" />;
  if (outcome === "failed")
    return <XCircle className="h-4 w-4 text-danger" aria-label="failed" />;
  return <MinusCircle className="h-4 w-4 text-fg-subtle" aria-label="cancelled" />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDuration(startedIso: string, finishedIso: string): string {
  const ms = new Date(finishedIso).getTime() - new Date(startedIso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}
