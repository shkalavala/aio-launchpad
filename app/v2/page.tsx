"use client";

import Link from "next/link";
import {
  Activity,
  Network,
  GitBranch,
  Inbox,
  RadioTower,
  Rocket,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { useV2Fleet } from "@/lib/useV2Fleet";
import { useV2Store, selectChangeState } from "@/store/useV2Store";
import { shortSha } from "@/lib/git/fixtures";
import { ChangeStatePill } from "@/components/v2/shell/ChangeStatePill";
import { RECENT_DEPLOYMENTS, statusMeta } from "@/lib/v2/deployments";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function V2DashboardPage() {
  const fleet = useV2Fleet();
  const repo = useV2Store((s) => s.repo);
  const state = useV2Store(selectChangeState);
  const pendingCount = useV2Store((s) => s.pendingChanges.length);
  const incoming = useV2Store((s) => s.incomingChanges);
  const driftChecked = useV2Store((s) => s.driftChecked);
  const driftRecords = useV2Store((s) => s.driftRecords);

  const total = fleet.length;
  const healthy = fleet.filter((s) => s.runtime.health === "healthy").length;
  const degraded = fleet.filter((s) => s.runtime.health === "degraded").length;
  const unhealthy = fleet.filter((s) => s.runtime.health === "unhealthy").length;
  const devCount = fleet.filter((s) => s.runtime.environment === "dev").length;
  const prodCount = fleet.filter((s) => s.runtime.environment === "prod").length;

  const releaseDist = new Map<string, number>();
  for (const s of fleet) {
    releaseDist.set(s.runtime.resolvedRelease, (releaseDist.get(s.runtime.resolvedRelease) ?? 0) + 1);
  }
  const releases = Array.from(releaseDist.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxRelease = Math.max(...releases.map(([, n]) => n), 1);

  return (
    <div className="px-6 py-5">
      <PageHeader
        title="Dashboard"
        description="Fleet health, repository state, and recent activity at a glance."
      />

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Network className="h-4 w-4" />} label="Sites" value={total}>
          <span className="text-fg-subtle">
            {devCount} dev · {prodCount} prod
          </span>
        </StatCard>
        <StatCard icon={<Activity className="h-4 w-4" />} label="Healthy" value={healthy} tone="success">
          <span className="text-fg-subtle">
            {degraded} degraded · {unhealthy} unhealthy
          </span>
        </StatCard>
        <StatCard icon={<Inbox className="h-4 w-4" />} label="Incoming" value={incoming.length} tone="accent">
          <span className="text-fg-subtle">from git</span>
        </StatCard>
        <StatCard
          icon={<RadioTower className="h-4 w-4" />}
          label="Drift"
          value={driftChecked ? driftRecords.length : "—"}
          tone={driftChecked && driftRecords.length > 0 ? "danger" : "neutral"}
        >
          <span className="text-fg-subtle">{driftChecked ? "checked" : "not checked"}</span>
        </StatCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Repository */}
        <Panel title="Repository" icon={<GitBranch className="h-4 w-4" />}>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-fg-muted">
              {repo.owner}/{repo.repo}
            </span>
            <ChangeStatePill state={state} />
          </div>
          <div className="mt-2 rounded-md border border-border bg-bg-subtle p-2.5 text-[12px]">
            <div className="font-mono text-[11px] text-accent">
              {repo.branch} · {shortSha(repo.lastCommit.sha)}
            </div>
            <div className="truncate text-fg">{repo.lastCommit.message}</div>
            <div className="text-[11px] text-fg-subtle">by {repo.lastCommit.author}</div>
          </div>
          <div className="mt-2 text-[12px] text-fg-subtle">
            {pendingCount} pending change{pendingCount === 1 ? "" : "s"} ·{" "}
            {incoming.length} incoming
          </div>
        </Panel>

        {/* Release distribution */}
        <Panel title="AIO release spread" icon={<Rocket className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {releases.map(([rel, n]) => (
              <div key={rel} className="flex items-center gap-2 text-[12px]">
                <span className="w-12 font-mono text-fg">{rel}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-bg-subtle">
                  <div
                    className="h-full rounded bg-accent"
                    style={{ width: `${(n / maxRelease) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right text-fg-muted">{n}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Recent deployments */}
        <Panel
          title="Recent deployments"
          icon={<Rocket className="h-4 w-4" />}
          action={
            <Link href="/v2/deployments" className="text-[12px] text-accent hover:underline">
              View all
            </Link>
          }
        >
          <div className="space-y-2">
            {RECENT_DEPLOYMENTS.slice(0, 3).map((d) => {
              const st = statusMeta(d.status);
              return (
                <div key={d.id} className="flex items-center gap-2 text-[12px]">
                  {d.kind === "rollback" ? (
                    <RotateCcw className="h-3.5 w-3.5 shrink-0 text-warning" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5 shrink-0 text-accent" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-fg">{d.title}</span>
                  <Badge tone={st.tone} className="text-[10px]">
                    {st.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Incoming summary */}
      {incoming.length > 0 && (
        <Panel
          title="Incoming from git"
          icon={<Inbox className="h-4 w-4" />}
          className="mt-4"
          action={<span className="text-[12px] text-fg-subtle">Review in Change management</span>}
        >
          <div className="space-y-2">
            {incoming.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[12px]">
                <span className="font-mono text-[11px] text-accent">{shortSha(c.commit.sha)}</span>
                <span className="min-w-0 flex-1 truncate text-fg">{c.commit.message}</span>
                <span className="inline-flex items-center gap-1 text-fg-subtle">
                  {c.affectedSites.length} site{c.affectedSites.length === 1 ? "" : "s"}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "neutral" | "accent" | "success" | "danger";
  children?: React.ReactNode;
}) {
  const toneClass = {
    neutral: "text-fg-muted",
    accent: "text-accent",
    success: "text-success",
    danger: "text-danger",
  }[tone];
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-[24px] font-semibold leading-none text-fg">{value}</div>
      <div className="mt-1 text-[11px]">{children}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-surface", className)}>
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <span className="text-fg-muted">{icon}</span>
          {title}
        </h2>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}
