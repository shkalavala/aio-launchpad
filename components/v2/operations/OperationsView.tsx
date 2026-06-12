"use client";

import {
  Activity,
  ShieldCheck,
  GitCommitHorizontal,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Rocket,
  RotateCcw,
  Boxes,
  SlidersHorizontal,
  Search,
  ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { useV2Store } from "@/store/useV2Store";
import { useObservedSource } from "@/store/useObservedSource";
import { observedAvailable, OBSERVED_SOURCES } from "@/lib/v2/observedState";
import {
  APPROVAL_STAGES,
  KIND_META,
  approvalMeta,
  approvalPending,
  statusMeta,
  type ApprovalStatus,
  type Deployment,
  type DeployStatus,
} from "@/lib/v2/deployments";
import type { DriftRecord } from "@/lib/git/model";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PIPELINE_ACTIVE: DeployStatus[] = ["submitted", "deploying", "in-progress", "queued"];

export function OperationsView() {
  const deployments = useV2Store((s) => s.deployments);
  const driftRecords = useV2Store((s) => s.driftRecords);
  const driftChecked = useV2Store((s) => s.driftChecked);
  const runDriftCheck = useV2Store((s) => s.runDriftCheck);
  const reconcileDrift = useV2Store((s) => s.reconcileDrift);
  const sourceId = useObservedSource((s) => s.sourceId);
  const observedOk = observedAvailable(sourceId);

  const awaitingApproval = deployments.filter(
    (d) => d.approval && approvalPending(d.approval.status),
  );
  const inFlight = deployments.filter((d) => PIPELINE_ACTIVE.includes(d.status));

  return (
    <div className="px-6 py-5">
      <PageHeader
        title="Operations"
        description="Day-2 mission control — what the fleet is doing right now, what's awaiting approval, and an audit trail of every change. Starting a change lives in Deployments."
      />

      <div className="mt-6 space-y-7">
        {/* Awaiting approval */}
        <Section
          icon={<ShieldCheck className="h-4 w-4 text-warning" />}
          title="Awaiting approval"
          count={awaitingApproval.length}
        >
          <p className="mb-3 text-[12px] text-fg-muted">
            Approval is granted out-of-band by the AIO operator on the cluster, who validates the
            token presented on the change. Launchpad requests it and reads back status — there is no
            Approve action here.
          </p>
          {awaitingApproval.length === 0 ? (
            <EmptyRow text="Nothing waiting on approval." />
          ) : (
            <div className="space-y-3">
              {awaitingApproval.map((d) => (
                <ApprovalCard key={d.id} d={d} />
              ))}
            </div>
          )}
        </Section>

        {/* In-flight runs */}
        <Section
          icon={<Activity className="h-4 w-4 text-accent" />}
          title="In-flight runs"
          count={inFlight.length}
        >
          {inFlight.length === 0 ? (
            <EmptyRow text="No runs in the pipeline right now." />
          ) : (
            <div className="space-y-3">
              {inFlight.map((d) => (
                <RunCard key={d.id} d={d} />
              ))}
            </div>
          )}
        </Section>

        {/* Drift & reconcile */}
        <Section
          icon={<Search className="h-4 w-4 text-accent" />}
          title="Drift & reconcile"
          count={observedOk && driftChecked ? driftRecords.length : undefined}
        >
          {!observedOk ? (
            <div className="rounded-md border border-border bg-bg-subtle px-3 py-2.5 text-[12px] text-fg-muted">
              {OBSERVED_SOURCES[sourceId].note} Drift compares deployed cluster state against git, so
              it needs a connected observed-state source.
            </div>
          ) : !driftChecked ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-bg-subtle px-3 py-2.5 text-[12px] text-fg-muted">
              <span>No drift check has run this session. Drift is computed on demand, never watched.</span>
              <Button size="sm" variant="subtle" onClick={runDriftCheck}>
                <Search className="h-3.5 w-3.5" />
                Check for drift
              </Button>
            </div>
          ) : driftRecords.length === 0 ? (
            <EmptyRow text="Portal state matches git. No drift." />
          ) : (
            <div className="space-y-2">
              {driftRecords.map((r) => (
                <DriftRow key={r.siteName} r={r} onReconcile={() => reconcileDrift(r.siteName)} />
              ))}
            </div>
          )}
        </Section>

        {/* Audit log */}
        <Section
          icon={<ScrollText className="h-4 w-4 text-fg-muted" />}
          title="Audit log"
          count={deployments.length}
        >
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-[13px]">
              <thead className="bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Change</th>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2 font-medium">Commit</th>
                  <th className="px-4 py-2 font-medium">Requested by</th>
                  <th className="px-4 py-2 font-medium">Signed off</th>
                  <th className="px-4 py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deployments.map((d) => {
                  const status = statusMeta(d.status);
                  return (
                    <tr key={d.id} className="hover:bg-bg-subtle/60">
                      <td className="px-4 py-2.5 text-[12px] text-fg-subtle">{relTime(d.createdAt)}</td>
                      <td className="px-4 py-2.5 text-fg">{d.title}</td>
                      <td className="px-4 py-2.5 text-fg-muted">{KIND_META[d.kind].label}</td>
                      <td className="px-4 py-2.5 text-fg-muted">{d.scopeLabel}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent">
                          <GitCommitHorizontal className="h-3 w-3" />
                          {d.commitSha}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-fg-muted">{d.requestedBy}</td>
                      <td className="px-4 py-2.5 text-[12px] text-fg-muted">
                        {d.approval
                          ? `${d.approval.routedTo} · ${approvalMeta(d.approval.status).label}`
                          : d.approvedBy
                            ? d.approvedBy
                            : "PR + CI"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function ApprovalCard({ d }: { d: Deployment }) {
  if (!d.approval) return null;
  const approval = d.approval;
  return (
    <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KindIcon kind={d.kind} />
            <span className="text-[13px] font-medium text-fg">{d.title}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            {d.scopeLabel} · requested by {d.requestedBy} · routed to{" "}
            <span className="text-fg">{approval.routedTo}</span>
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          title="Preview — deep link to the Approvals service"
          className="inline-flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-fg-muted hover:border-accent/50 hover:text-accent"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Approvals service
        </a>
      </div>
      <ApprovalStepper status={approval.status} />
    </div>
  );
}

function ApprovalStepper({ status }: { status: ApprovalStatus }) {
  const currentIdx = APPROVAL_STAGES.indexOf(status as (typeof APPROVAL_STAGES)[number]);
  const rejected = status === "rejected";
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
      {APPROVAL_STAGES.map((stage, i) => {
        const meta = approvalMeta(stage);
        const done = !rejected && i <= currentIdx;
        return (
          <li key={stage} className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded px-1.5 py-0.5",
                done ? "bg-accent/15 text-accent" : "bg-bg-subtle text-fg-subtle",
                i === currentIdx && !rejected && "ring-1 ring-accent/40",
              )}
            >
              {meta.label}
            </span>
            {i < APPROVAL_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-fg-subtle" />}
          </li>
        );
      })}
      {rejected && (
        <li>
          <Badge tone="danger" className="text-[10px]">
            Rejected by operator
          </Badge>
        </li>
      )}
    </ol>
  );
}

function RunCard({ d }: { d: Deployment }) {
  const status = statusMeta(d.status);
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KindIcon kind={d.kind} />
          <span className="text-[13px] font-medium text-fg">{d.title}</span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="mt-0.5 text-[12px] text-fg-muted">
        {d.scopeLabel} · requested by {d.requestedBy} · started {relTime(d.createdAt)}
      </p>
      <div className="mt-2 space-y-1 rounded-md border border-border bg-bg-subtle p-2">
        {d.changes.map((c) => (
          <div key={c.siteName} className="flex items-center gap-2 text-[12px]">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{c.siteName}</span>
            {c.before !== undefined ? (
              <>
                <span className="font-mono text-danger line-through">{c.before}</span>
                <ArrowRight className="h-3 w-3 text-fg-subtle" />
                <span className="font-mono text-success">{c.after}</span>
              </>
            ) : c.after !== undefined ? (
              <span className="font-mono text-success">{c.after}</span>
            ) : (
              <span className="text-fg-subtle">applying</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DriftRow({ r, onReconcile }: { r: DriftRecord; onReconcile: () => void }) {
  const gitAhead = r.direction === "git-ahead";
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-fg">{r.siteName}</span>
          <Badge tone={gitAhead ? "accent" : "warning"} className="text-[10px]">
            {gitAhead ? "git ahead" : "portal ahead"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-fg-subtle">
          {r.fields.map((f) => f.key).join(", ")} · detected {relTime(r.detectedAt)}
        </p>
      </div>
      {gitAhead ? (
        <Button size="sm" variant="subtle" onClick={onReconcile}>
          <RefreshCw className="h-3.5 w-3.5" />
          Reconcile to git
        </Button>
      ) : (
        <span className="text-[11px] text-fg-subtle">Capture via Change Management</span>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: Deployment["kind"] }) {
  switch (kind) {
    case "rollback":
      return <RotateCcw className="h-4 w-4 text-warning" />;
    case "solution-deploy":
      return <Boxes className="h-4 w-4 text-accent" />;
    case "reconcile":
      return <RefreshCw className="h-4 w-4 text-warning" />;
    case "config-apply":
      return <SlidersHorizontal className="h-4 w-4 text-accent" />;
    default:
      return <Rocket className="h-4 w-4 text-accent" />;
  }
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-muted">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-border bg-bg-subtle px-3 py-2.5 text-[12px] text-fg-subtle">
      {text}
    </p>
  );
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
