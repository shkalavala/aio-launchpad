"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  GitCommit,
  KeyRound,
  Layers,
  MapPin,
  Package,
  RefreshCw,
  Rocket,
  ShieldCheck,
  X,
} from "lucide-react";
import type { FleetSite, SecretEntry, SecretSyncStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HealthDot } from "./HealthDot";
import { VersionBadge } from "./VersionBadge";
import { EnvPill } from "./EnvPill";
import { SECRETS_BY_SITE, CENTRAL_KV } from "@/lib/fixtures/secrets";
import { IDENTITY_BY_SITE, type SyncControllerHealth } from "@/lib/fixtures/identity";
import { PIPELINE_RUNS, pipelineRunUrl } from "@/lib/fixtures/pipeline";
import { componentsForSite } from "@/lib/fixtures/components";
import { EVENTS_BY_SITE, type SiteEvent, type SiteEventKind } from "@/lib/fixtures/events";
import { useAppStore } from "@/store/useAppStore";

/**
 * Screen 6 — Per-site detail.
 *
 * Side drawer triggered by the `?site=` query param on /fleet. Pulls together
 * everything the other screens already know about a single site so the demo
 * can drill in without leaving the fleet view. Read-only by design.
 */
export function SiteDetailDrawer({
  fleet,
  selectedName,
  onClose,
}: {
  fleet: FleetSite[];
  selectedName: string | null;
  onClose: () => void;
}) {
  const fs = useMemo(
    () => (selectedName ? fleet.find((f) => f.site.name === selectedName) ?? null : null),
    [fleet, selectedName],
  );

  // Close on Escape.
  useEffect(() => {
    if (!fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fs, onClose]);

  const versionOverrides = useAppStore((s) => s.versionOverrides);

  if (!fs) return null;

  const name = fs.site.name;
  const release = versionOverrides[name] ?? fs.runtime.resolvedRelease;
  const secrets = SECRETS_BY_SITE[name] ?? [];
  const secretsSummary = summarizeSecretSync(secrets);
  const identity = IDENTITY_BY_SITE[name];
  const manifestPath = `sites/${name}.yaml`;
  const components = componentsForSite(name, release);
  const driftCount = components.filter((c) => c.drift).length;
  const lastApplied = PIPELINE_RUNS.find(
    (r) => r.status === "success" && r.sitesChanged.includes(name),
  );
  const events = EVENTS_BY_SITE[name] ?? [];

  return (
    <>
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close site detail"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-fg/30 backdrop-blur-[1px]"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label={`Site detail · ${name}`}
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-bg shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[11px] text-fg-muted">
              <span>Fleet</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-fg">Site detail</span>
            </div>
            <h2 className="truncate font-mono text-[18px] font-semibold text-fg">{name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EnvPill env={fs.runtime.environment} />
              <VersionBadge id={release} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[11px] text-fg-muted">
                <HealthDot status={versionOverrides[name] ? "healthy" : fs.runtime.health} />
                <span className="capitalize">{versionOverrides[name] ? "healthy" : fs.runtime.health}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            <DetailSection icon={MapPin} title="Location & resource">
              <KV label="Region" value={fs.resolvedLocation} mono />
              <KV label="Subscription" value={fs.site.subscription} mono />
              <KV label="Resource group" value={fs.site.resourceGroup} mono />
              <KV
                label="AIO instance"
                value={(fs.site.parameters?.aioInstanceName as string | undefined) ?? "—"}
                mono
              />
              <KV
                label="Last deploy"
                value={new Date(fs.runtime.lastDeployAt).toLocaleString()}
              />
              {lastApplied && (
                <div className="mt-1.5 flex items-baseline justify-between gap-3 rounded-sm border border-border bg-bg-subtle px-2 py-1.5 text-[11px]">
                  <span className="text-fg-subtle">Last applied</span>
                  <a
                    href={pipelineRunUrl(lastApplied)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 truncate font-mono text-fg hover:text-accent hover:underline"
                    title={lastApplied.commitMessage}
                  >
                    {lastApplied.commitSha} · {lastApplied.id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </DetailSection>

            <DetailSection icon={Layers} title="Inheritance chain">
              <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                {fs.ancestry.length === 0 && (
                  <span className="text-fg-subtle">No template parents</span>
                )}
                {fs.ancestry.map((t, i) => (
                  <span key={t.name} className="flex items-center gap-1.5">
                    <span className="rounded-sm border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-fg">
                      {t.name}
                    </span>
                    <ChevronRight className="h-3 w-3 text-fg-subtle" />
                    {i === fs.ancestry.length - 1 && (
                      <span className="rounded-sm border border-accent/30 bg-accent-subtle px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
                        {name}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </DetailSection>

            <DetailSection icon={Package} title="Resolved labels">
              {Object.keys(fs.resolvedLabels).length === 0 ? (
                <span className="text-[12px] text-fg-subtle">No labels</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(fs.resolvedLabels).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-fg-muted"
                    >
                      <span className="text-fg-subtle">{k}=</span>
                      <span className="text-fg">{v}</span>
                    </span>
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection
              icon={Cpu}
              title={`Components on release ${release}${driftCount > 0 ? ` · ${driftCount} drift` : ""}`}
            >
              <ul className="divide-y divide-border-subtle text-[12px]">
                {components.map((c) => (
                  <li
                    key={c.kind}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <span className="truncate text-fg">{c.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[11px] text-fg-muted">{c.version}</span>
                      {c.drift && (
                        <span className="rounded-sm border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          drift
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {driftCount > 0 && (
                <p className="mt-1.5 rounded-sm border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning-fg">
                  {driftCount === 1 ? "1 component" : `${driftCount} components`} on a
                  version different from what release {release} ships. Usually fixed by
                  re-running the rollout against this site.
                </p>
              )}
            </DetailSection>

            <DetailSection
              icon={ShieldCheck}
              title={`Identity & sync infra${
                identity && identity.syncController.health !== "healthy"
                  ? ` · ${identity.syncController.health}`
                  : ""
              }`}
            >
              {!identity ? (
                <p className="text-[12px] text-fg-subtle">
                  No identity binding recorded for this site yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <UamiRow label="Components UAMI" uami={identity.componentsUami} />
                  <UamiRow label="Secrets UAMI" uami={identity.secretsUami} />
                  <div className="rounded-sm border border-border bg-bg-subtle px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-fg-subtle">SecretSync controller</span>
                      <SyncControllerPill health={identity.syncController.health} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-fg-subtle">
                      <span>
                        Central KV:{" "}
                        <span className="font-mono text-fg-muted">{CENTRAL_KV.name}</span>
                      </span>
                      <span className="font-mono">
                        reconciled {formatRelative(identity.syncController.lastReconcileAt)}
                      </span>
                    </div>
                    {identity.syncController.note && (
                      <p
                        className={cn(
                          "mt-1 rounded-sm border px-1.5 py-1 text-[10px]",
                          identity.syncController.health === "down"
                            ? "border-danger/30 bg-danger/5 text-danger"
                            : "border-warning/30 bg-warning/10 text-warning-fg",
                        )}
                      >
                        {identity.syncController.note}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </DetailSection>

            <DetailSection
              icon={KeyRound}
              title={`Secrets (${secrets.length}${
                secretsSummary.problems > 0 ? ` · ${secretsSummary.label}` : ""
              })`}
              action={
                <Link
                  href={`/secrets?site=${encodeURIComponent(name)}`}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  Open in Secrets <ExternalLink className="h-3 w-3" />
                </Link>
              }
            >
              {secrets.length === 0 ? (
                <p className="text-[12px] text-fg-subtle">No secrets declared for this site.</p>
              ) : (
                <ul className="divide-y divide-border-subtle text-[12px]">
                  {secrets.slice(0, 6).map((s) => {
                    const status = s.syncStatus ?? "synced";
                    return (
                      <li key={s.secretName} className="flex flex-col gap-0.5 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-fg">{s.secretName}</span>
                          <SyncStatusPill status={status} />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-fg-subtle">
                          {s.kubernetesSecretName ? (
                            <span className="truncate font-mono">
                              → {s.kubernetesSecretName}/{s.kubernetesSecretKey}
                            </span>
                          ) : (
                            <span />
                          )}
                          {s.lastSyncAt && (
                            <span className="shrink-0 font-mono">
                              {formatRelative(s.lastSyncAt)}
                            </span>
                          )}
                        </div>
                        {status === "error" && s.syncError && (
                          <p className="mt-0.5 rounded-sm border border-danger/30 bg-danger/5 px-1.5 py-1 font-mono text-[10px] text-danger">
                            {s.syncError}
                          </p>
                        )}
                      </li>
                    );
                  })}
                  {secrets.length > 6 && (
                    <li className="py-1.5 text-[11px] text-fg-subtle">
                      +{secrets.length - 6} more…
                    </li>
                  )}
                </ul>
              )}
            </DetailSection>

            <DetailSection
              icon={Activity}
              title={`Activity (${events.length})`}
              action={
                <Link
                  href="/developer"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  Open in Source <ExternalLink className="h-3 w-3" />
                </Link>
              }
            >
              {events.length === 0 ? (
                <p className="text-[12px] text-fg-subtle">
                  No recent activity recorded for this site.
                </p>
              ) : (
                <ul className="divide-y divide-border-subtle text-[12px]">
                  {events.map((e, i) => (
                    <EventRow key={i} ev={e} />
                  ))}
                </ul>
              )}
            </DetailSection>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-2 border-t border-border bg-surface px-5 py-3 text-[12px]">
          <span className="truncate font-mono text-[11px] text-fg-subtle">{manifestPath}</span>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/developer"
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-[12px] text-fg hover:bg-bg-subtle"
            >
              View manifest <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href={`/rollout?site=${encodeURIComponent(name)}`}
              className="inline-flex items-center gap-1 rounded-sm border border-accent bg-accent px-2 py-1 text-[12px] font-medium text-white hover:bg-accent/90"
            >
              <Rocket className="h-3 w-3" /> Roll out to this site
            </Link>
          </div>
        </footer>
      </aside>
    </>
  );
}

function DetailSection({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          <Icon className="h-3.5 w-3.5 text-fg-subtle" />
          {title}
        </h3>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

function KV({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-[12px]">
      <span className="text-fg-subtle">{label}</span>
      <span className={cn("text-right text-fg", mono && "font-mono text-[11px]")}>{value}</span>
    </div>
  );
}

const SYNC_PILL: Record<
  SecretSyncStatus,
  { label: string; className: string }
> = {
  synced: { label: "synced", className: "border-success/30 bg-success/10 text-success" },
  syncing: { label: "syncing", className: "border-accent/30 bg-accent/10 text-accent" },
  drift: { label: "drift", className: "border-warning/30 bg-warning/10 text-warning" },
  "missing-in-kv": {
    label: "missing in KV",
    className: "border-danger/30 bg-danger/10 text-danger",
  },
  error: { label: "error", className: "border-danger/30 bg-danger/10 text-danger" },
  never: { label: "never", className: "border-border bg-bg-subtle text-fg-subtle" },
};

function SyncStatusPill({ status }: { status: SecretSyncStatus }) {
  const p = SYNC_PILL[status];
  return (
    <span
      className={cn(
        "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
        p.className,
      )}
    >
      {p.label}
    </span>
  );
}

function summarizeSecretSync(secrets: SecretEntry[]): { problems: number; label: string } {
  const counts: Partial<Record<SecretSyncStatus, number>> = {};
  for (const s of secrets) {
    const k = s.syncStatus ?? "synced";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const parts: string[] = [];
  if (counts.error) parts.push(`${counts.error} error`);
  if (counts["missing-in-kv"]) parts.push(`${counts["missing-in-kv"]} missing`);
  if (counts.drift) parts.push(`${counts.drift} drift`);
  if (counts.syncing) parts.push(`${counts.syncing} syncing`);
  return {
    problems: (counts.error ?? 0) + (counts["missing-in-kv"] ?? 0) + (counts.drift ?? 0),
    label: parts.join(", "),
  };
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function UamiRow({
  label,
  uami,
}: {
  label: string;
  uami: { name: string; clientId: string; principalId: string; lastFederatedCheckAt?: string };
}) {
  return (
    <div className="rounded-sm border border-border bg-bg-subtle px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-fg-subtle">{label}</span>
        <span className="truncate font-mono text-[11px] text-fg">{uami.name}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-fg-subtle">
        <span className="font-mono">clientId {uami.clientId.slice(0, 8)}…</span>
        <span className="font-mono">principalId {uami.principalId.slice(0, 8)}…</span>
      </div>
    </div>
  );
}

const CONTROLLER_PILL: Record<
  SyncControllerHealth,
  { label: string; className: string }
> = {
  healthy: { label: "healthy", className: "border-success/30 bg-success/10 text-success" },
  degraded: { label: "degraded", className: "border-warning/30 bg-warning/10 text-warning" },
  down: { label: "down", className: "border-danger/30 bg-danger/10 text-danger" },
};

function SyncControllerPill({ health }: { health: SyncControllerHealth }) {
  const p = CONTROLLER_PILL[health];
  return (
    <span
      className={cn(
        "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
        p.className,
      )}
    >
      {p.label}
    </span>
  );
}

const EVENT_META: Record<
  SiteEventKind,
  { icon: React.ComponentType<{ className?: string }>; tone: string; label: string }
> = {
  "release-upgraded": { icon: ArrowUpRight, tone: "text-accent", label: "release" },
  "secret-synced": { icon: CheckCircle2, tone: "text-success", label: "secret" },
  "secret-error": { icon: AlertCircle, tone: "text-danger", label: "secret" },
  "manifest-applied": { icon: GitCommit, tone: "text-fg-muted", label: "manifest" },
  "dataflow-restarted": { icon: RefreshCw, tone: "text-fg-muted", label: "dataflow" },
  "health-changed": { icon: AlertCircle, tone: "text-warning", label: "health" },
  "asset-discovered": { icon: Package, tone: "text-fg-muted", label: "asset" },
};

function EventRow({ ev }: { ev: SiteEvent }) {
  const meta = EVENT_META[ev.kind];
  const Icon = meta.icon;
  const minutes = ev.minutesAgo;
  const when =
    minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
      ? `${Math.floor(minutes / 60)}h ago`
      : `${Math.floor(minutes / 1440)}d ago`;
  return (
    <li className="flex items-start gap-2 py-1.5">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", meta.tone)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-fg-subtle">
          <span>{meta.label}</span>
          <span>·</span>
          <span className="font-mono">{when}</span>
          {ev.actor && (
            <>
              <span>·</span>
              <span className="font-mono normal-case text-fg-muted">{ev.actor}</span>
            </>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-fg">{ev.message}</p>
        {ev.commitSha && (
          <span className="mt-0.5 inline-block font-mono text-[10px] text-fg-subtle">
            {ev.pipelineRunId} · {ev.commitSha}
          </span>
        )}
      </div>
    </li>
  );
}
