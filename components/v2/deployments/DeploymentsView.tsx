"use client";

import { useMemo, useState } from "react";
import {
  Rocket,
  RotateCcw,
  Plus,
  X,
  GitCommitHorizontal,
  ShieldCheck,
  ArrowRight,
  Check,
  Boxes,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { useV2Fleet } from "@/lib/useV2Fleet";
import { useV2Store } from "@/store/useV2Store";
import { regionLabel } from "@/lib/v2/format";
import { SOLUTIONS } from "@/lib/fixtures/solutions";
import {
  COMMIT_HISTORY,
  KIND_META,
  RECENT_DEPLOYMENTS,
  deployLifecycle,
  shortId,
  statusMeta,
  type Deployment,
  type DeployKind,
  type DeployStatus,
  type DeploymentSiteChange,
} from "@/lib/v2/deployments";
import type { AioReleaseId, FleetSite } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const RELEASES: AioReleaseId[] = ["2602", "2603", "2604", "2605", "2606"];

export function DeploymentsView() {
  const [deployments, setDeployments] = useState<Deployment[]>(RECENT_DEPLOYMENTS);
  const [wizardOpen, setWizardOpen] = useState(false);
  const advanced = useV2Store((s) => s.mode === "advanced");

  // Walk a run through the remaining lifecycle stages, one step at a time.
  function runLifecycle(id: string, stages: DeployStatus[]) {
    stages.forEach((status, i) => {
      setTimeout(
        () => {
          setDeployments((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
        },
        (i + 1) * 1300,
      );
    });
  }

  function onExecute(d: Deployment) {
    setDeployments((prev) => [d, ...prev]);
    setWizardOpen(false);
    // When routed to the Approvals service it starts at "waiting-approval";
    // otherwise PR review + CI already gated it, so it starts at "submitted".
    const stages = deployLifecycle(d.status === "waiting-approval");
    runLifecycle(d.id, stages.slice(1));
  }

  // Retry a failed run: re-enter the pipeline (gates already passed) → done.
  function onRetry(id: string) {
    setDeployments((prev) => prev.map((x) => (x.id === id ? { ...x, status: "submitted" } : x)));
    runLifecycle(id, ["deploying", "succeeded"]);
  }

  return (
    <div className="px-6 py-5">
      <PageHeader
        title="Deployments"
        description="Upgrades, config applies, and rollbacks — every run is a git-driven pipeline, never a direct cluster write."
        actions={
          <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            New deployment
          </Button>
        }
      />

      <div className="mt-6 overflow-hidden rounded-md border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Deployment</th>
              <th className="px-4 py-2 font-medium">Kind</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2 font-medium">Commit</th>
              <th className="px-4 py-2 font-medium">Status</th>
              {advanced && <th className="px-4 py-2 font-medium">Approval</th>}
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deployments.map((d) => (
              <DeploymentRow key={d.id} d={d} advanced={advanced} onRetry={onRetry} />
            ))}
          </tbody>
        </table>
      </div>

      {wizardOpen && (
        <NewDeploymentWizard onClose={() => setWizardOpen(false)} onExecute={onExecute} />
      )}
    </div>
  );
}

function DeploymentRow({
  d,
  advanced,
  onRetry,
}: {
  d: Deployment;
  advanced: boolean;
  onRetry: (id: string) => void;
}) {
  const status = statusMeta(d.status);
  const isRollback = d.kind === "rollback";
  const isSolution = d.kind === "solution-deploy";
  return (
    <tr className="hover:bg-bg-subtle/60">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isRollback ? (
            <RotateCcw className="h-4 w-4 text-warning" />
          ) : isSolution ? (
            <Boxes className="h-4 w-4 text-accent" />
          ) : (
            <Rocket className="h-4 w-4 text-accent" />
          )}
          <span className="text-fg">{d.title}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-fg-muted">{KIND_META[d.kind].label}</td>
      <td className="px-4 py-2.5 text-fg-muted">{d.scopeLabel}</td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent">
          <GitCommitHorizontal className="h-3 w-3" />
          {d.commitSha}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {d.status === "failed" && (
            <button
              type="button"
              onClick={() => onRetry(d.id)}
              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-fg-muted hover:border-accent/50 hover:text-accent"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </td>
      {advanced && (
        <td className="px-4 py-2.5 text-[12px] text-fg-muted">
          <span className="text-fg">{d.requestedBy}</span>
          {d.approvedBy && (
            <span className="text-fg-subtle"> → {d.approvedBy}</span>
          )}
        </td>
      )}
      <td className="px-4 py-2.5 text-[12px] text-fg-subtle">{relTime(d.createdAt)}</td>
    </tr>
  );
}

// ── Wizard ──────────────────────────────────────────────────────────────────

function NewDeploymentWizard({
  onClose,
  onExecute,
}: {
  onClose: () => void;
  onExecute: (d: Deployment) => void;
}) {
  const fleet = useV2Fleet();

  const [kind, setKind] = useState<DeployKind>("release-upgrade");
  const [targetRelease, setTargetRelease] = useState<AioReleaseId>("2606");
  const [commitSha, setCommitSha] = useState(COMMIT_HISTORY[0].sha);
  const [solutionId, setSolutionId] = useState(SOLUTIONS[0].id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [useApprovals, setUseApprovals] = useState(false);
  const [approver, setApprover] = useState("");

  const solution = SOLUTIONS.find((s) => s.id === solutionId) ?? SOLUTIONS[0];

  function toggleSite(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectEnv(env: string) {
    setSelected(new Set(fleet.filter((s) => s.runtime.environment === env).map((s) => s.site.name)));
  }

  const changes: DeploymentSiteChange[] = useMemo(() => {
    return fleet
      .filter((s) => selected.has(s.site.name))
      .map((s) => {
        if (kind === "release-upgrade") {
          return { siteName: s.site.name, before: s.runtime.resolvedRelease, after: targetRelease };
        }
        if (kind === "rollback") {
          return { siteName: s.site.name, before: s.runtime.resolvedRelease, after: `@${commitSha}` };
        }
        if (kind === "solution-deploy") {
          return { siteName: s.site.name, after: `+ ${solution.name}` };
        }
        return { siteName: s.site.name };
      });
  }, [fleet, selected, kind, targetRelease, commitSha, solution]);

  const approvalOk = !useApprovals || approver.trim().length > 0;
  const canExecute = selected.size > 0 && approvalOk;

  function execute() {
    const title =
      kind === "release-upgrade"
        ? `Upgrade ${selected.size} site${selected.size === 1 ? "" : "s"} to ${targetRelease}`
        : kind === "rollback"
          ? `Rollback ${selected.size} site${selected.size === 1 ? "" : "s"} to ${commitSha}`
          : kind === "solution-deploy"
            ? `Deploy ${solution.name} to ${selected.size} site${selected.size === 1 ? "" : "s"}`
            : `Apply config to ${selected.size} site${selected.size === 1 ? "" : "s"}`;
    onExecute({
      id: `dep-${shortId()}`,
      title,
      kind,
      status: useApprovals ? "waiting-approval" : "submitted",
      commitSha: kind === "rollback" ? commitSha : "staged",
      scopeLabel: `${selected.size} site${selected.size === 1 ? "" : "s"}`,
      changes,
      createdAt: new Date().toISOString(),
      requestedBy: "You",
      approvedBy: useApprovals ? approver.trim() : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-[480px] flex-col bg-surface shadow-depth16">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[14px] font-semibold text-fg">New deployment</h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Action */}
          <WizStep n={1} label="Choose an action">
            <div className="grid grid-cols-2 gap-2">
              <ActionCard
                active={kind === "release-upgrade"}
                onClick={() => setKind("release-upgrade")}
                icon={<Rocket className="h-4 w-4" />}
                title="Release upgrade"
                desc="Move sites to a newer AIO release."
              />
              <ActionCard
                active={kind === "solution-deploy"}
                onClick={() => setKind("solution-deploy")}
                icon={<Boxes className="h-4 w-4" />}
                title="Deploy solution"
                desc="Roll out an AIO Solution onto sites."
              />
              <ActionCard
                active={kind === "rollback"}
                onClick={() => setKind("rollback")}
                icon={<RotateCcw className="h-4 w-4" />}
                title="Rollback"
                desc="Revert sites to a prior commit."
              />
            </div>
          </WizStep>

          {/* Parameters */}
          {kind === "release-upgrade" ? (
            <WizStep n={2} label="Target release">
              <Select
                value={targetRelease}
                onChange={(e) => setTargetRelease(e.target.value as AioReleaseId)}
                className="w-40"
              >
                {RELEASES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </WizStep>
          ) : kind === "solution-deploy" ? (
            <WizStep n={2} label="Choose a solution">
              <Select
                value={solutionId}
                onChange={(e) => setSolutionId(e.target.value)}
                className="w-full"
              >
                {SOLUTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.tag}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[11px] text-fg-subtle">
                {solution.tagline} Creates: {solution.creates.join(", ")}.
              </p>
            </WizStep>
          ) : (
            <WizStep n={2} label="Roll back to commit">
              <Select value={commitSha} onChange={(e) => setCommitSha(e.target.value)} className="w-full">
                {COMMIT_HISTORY.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {c.sha} · {c.message}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[11px] text-fg-subtle">
                The pipeline re-applies this commit; no opaque cluster swap.
              </p>
            </WizStep>
          )}

          {/* Targets */}
          <WizStep n={3} label="Select target sites">
            <div className="mb-2 flex gap-2">
              <Button size="sm" variant="subtle" onClick={() => selectEnv("dev")}>
                All dev
              </Button>
              <Button size="sm" variant="subtle" onClick={() => selectEnv("prod")}>
                All prod
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border p-1.5">
              {fleet.map((s) => (
                <SiteCheck
                  key={s.site.name}
                  fs={s}
                  checked={selected.has(s.site.name)}
                  onToggle={() => toggleSite(s.site.name)}
                />
              ))}
            </div>
          </WizStep>

          {/* Preview */}
          <WizStep n={4} label="Preview changes">
            {changes.length === 0 ? (
              <p className="text-[12px] text-fg-subtle">Select at least one site to preview.</p>
            ) : (
              <div className="space-y-1 rounded-md border border-border bg-bg-subtle p-2">
                {changes.map((c) => (
                  <div key={c.siteName} className="flex items-center gap-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">
                      {c.siteName}
                    </span>
                    {c.before !== undefined ? (
                      <>
                        <span className="font-mono text-danger line-through">{c.before}</span>
                        <ArrowRight className="h-3 w-3 text-fg-subtle" />
                        <span className="font-mono text-success">{c.after}</span>
                      </>
                    ) : c.after !== undefined ? (
                      <span className="font-mono text-success">{c.after}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </WizStep>

          {/* Approval (optional) */}
          <WizStep n={5} label="Approval">
            <p className="flex items-start gap-2 rounded-md border border-border bg-bg-subtle p-2.5 text-[12px] text-fg-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Every run already passes your repo&apos;s PR review and CI/CD gates before it
              reaches a cluster. An extra approval is optional.
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-fg">
              <input
                type="checkbox"
                checked={useApprovals}
                onChange={(e) => setUseApprovals(e.target.checked)}
              />
              Require sign-off from the Approvals service
              <Badge tone="accent" className="text-[10px]">
                preview
              </Badge>
            </label>
            {useApprovals && (
              <div className="mt-2 space-y-2 rounded-md border border-accent/40 bg-accent/5 p-2.5">
                <Input
                  placeholder="Route to (approver or group)"
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className="w-full"
                />
                <ol className="space-y-1 text-[11px] text-fg-muted">
                  <li>1. Waiting on approval (request sent to Approvals service)</li>
                  <li>2. Approval received</li>
                  <li>3. Submitted to pipeline (ADO / GitHub Actions)</li>
                  <li>4. Deploying</li>
                  <li>5. Done</li>
                </ol>
              </div>
            )}
          </WizStep>
        </div>

        <footer className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-[12px] text-fg-subtle">
            {selected.size} site{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!canExecute} onClick={execute}>
              <Check className="h-3.5 w-3.5" />
              {useApprovals ? "Request approval" : "Run deployment"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function WizStep({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
          {n}
        </span>
        <h3 className="text-[13px] font-semibold text-fg">{label}</h3>
      </div>
      <div className="pl-7">{children}</div>
    </section>
  );
}

function ActionCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-2.5 text-left transition-colors",
        active ? "border-accent bg-accent/5" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-[11px] text-fg-subtle">{desc}</p>
    </button>
  );
}

function SiteCheck({
  fs,
  checked,
  onToggle,
}: {
  fs: FleetSite;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-bg-subtle">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{fs.site.name}</span>
      <Badge tone={fs.runtime.environment === "prod" ? "accent" : "neutral"} className="text-[10px]">
        {fs.runtime.environment}
      </Badge>
      <span className="text-[11px] text-fg-subtle">{regionLabel(fs.resolvedLocation)}</span>
      <span className="font-mono text-[11px] text-fg-muted">{fs.runtime.resolvedRelease}</span>
    </label>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
