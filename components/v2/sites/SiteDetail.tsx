"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Server,
  Cpu,
  Boxes,
  KeyRound,
  History,
  SlidersHorizontal,
  Pencil,
} from "lucide-react";
import type { FleetSite, LayerBase, SecretSyncStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useV2Store } from "@/store/useV2Store";
import { buildConfigPair } from "@/lib/v2/config";
import { DiffView } from "@/components/v2/diff/DiffView";
import { healthMeta, clusterInfo, envTone, regionLabel } from "@/lib/v2/format";
import { EVENTS_BY_SITE, type SiteEvent } from "@/lib/fixtures/events";
import { SECRETS_BY_SITE, kvForSite } from "@/lib/fixtures/secrets";
import { RELEASES_BY_ID } from "@/lib/fixtures/releases";

type TabId = "infra" | "config" | "workloads" | "ops";

const TABS: { id: TabId; label: string; icon: typeof Server }[] = [
  { id: "infra", label: "Infrastructure", icon: Server },
  { id: "config", label: "Configurations", icon: SlidersHorizontal },
  { id: "workloads", label: "Workloads", icon: Boxes },
  { id: "ops", label: "Operations history", icon: History },
];

export function SiteDetail({ fs }: { fs: FleetSite }) {
  const [tab, setTab] = useState<TabId>("infra");
  const mode = useV2Store((s) => s.mode);
  const env = fs.runtime.environment;
  const health = healthMeta(fs.runtime.health);

  return (
    <div>
      <div className="border-b border-border bg-surface px-6 py-4">
        <Link
          href="/v2/sites"
          className="mb-2 inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sites
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-semibold text-fg">{fs.site.name}</h1>
          <Badge tone={envTone(env)}>{env}</Badge>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span className={cn("h-2 w-2 rounded-full", health.dot)} />
            {health.label}
          </span>
        </div>
        <div className="mt-1 text-[12px] text-fg-subtle">
          {regionLabel(fs.resolvedLocation)} · {fs.site.resourceGroup}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border bg-surface px-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "text-accent" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-accent" />}
            </button>
          );
        })}
      </div>

      <div className="px-6 py-5">
        {tab === "infra" && <InfrastructureTab fs={fs} advanced={mode === "advanced"} />}
        {tab === "config" && <ConfigurationsTab fs={fs} />}
        {tab === "workloads" && <WorkloadsTab fs={fs} />}
        {tab === "ops" && <OperationsHistoryTab fs={fs} />}
      </div>
    </div>
  );
}

// ── Infrastructure ───────────────────────────────────────────────────────────
function LayerRow({ name, layer, distro }: { name: string; layer: LayerBase; distro?: string }) {
  const h = healthMeta(layer.health);
  const driftTone = layer.drift === "behind" ? "warning" : layer.drift === "ahead" ? "accent" : "neutral";
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", h.dot)} />
        <span className="text-[13px] font-medium text-fg">{name}</span>
        {distro && <span className="text-[12px] text-fg-subtle">{distro}</span>}
      </div>
      <div className="flex items-center gap-3 text-[12px]">
        <span className="font-mono text-fg">{layer.currentVersion}</span>
        {layer.currentVersion !== layer.targetVersion && (
          <span className="font-mono text-fg-subtle">→ {layer.targetVersion}</span>
        )}
        {layer.drift !== "none" && layer.drift !== "unknown" && (
          <Badge tone={driftTone}>{layer.drift}</Badge>
        )}
      </div>
    </div>
  );
}

function InfrastructureTab({ fs, advanced }: { fs: FleetSite; advanced: boolean }) {
  const cluster = clusterInfo(fs);
  const layers = fs.site.layers;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Region" value={regionLabel(fs.resolvedLocation)} mono={false} />
        <Fact label="Cluster distro" value={cluster.distro} />
        <Fact label="AIO release" value={fs.runtime.resolvedRelease} />
        <Fact label="Resource group" value={fs.site.resourceGroup} />
        <Fact label="AIO instance" value={String(fs.site.parameters?.aioInstanceName ?? "—")} />
        <Fact label="Subscription" value={fs.site.subscription.slice(0, 8) + "…"} />
      </div>

      {layers ? (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
            Layer stack
          </div>
          {layers.cluster && (
            <LayerRow name="Cluster" layer={layers.cluster} distro={layers.cluster.distro} />
          )}
          {layers.arcK8sAgent && <LayerRow name="Arc for Kubernetes" layer={layers.arcK8sAgent} />}
          {advanced && layers.arcServerAgent && (
            <LayerRow name="Arc for Servers" layer={layers.arcServerAgent} />
          )}
          {advanced && fs.site.nodeInfo && (
            <div className="mt-2 border-t border-border pt-2 text-[12px] text-fg-muted">
              <span className="font-medium text-fg">Host</span> · {fs.site.nodeInfo.os}
              {fs.site.nodeInfo.kernel && (
                <span className="ml-1 font-mono text-fg-subtle">{fs.site.nodeInfo.kernel}</span>
              )}
            </div>
          )}
          {!advanced && (
            <p className="mt-2 text-[11px] text-fg-subtle">
              Switch to Advanced to see Arc-for-Servers and host OS detail.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-[12px] text-fg-subtle">
          This site runs AIO on an Arc-connected {cluster.distro} cluster. Detailed layer
          versions are available on layered sites.
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={cn("mt-0.5 text-[13px] text-fg", mono && "font-mono text-[12px]")}>{value}</div>
    </div>
  );
}

// ── Configurations (read-only diff) ──────────────────────────────────────────
function ConfigurationsTab({ fs }: { fs: FleetSite }) {
  const staged = useV2Store((s) => s.configOverrides[fs.site.name]);
  const { base, override } = buildConfigPair(fs, staged);
  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-fg-muted">
          How this site differs from the global template it inherits.
        </p>
        <Link
          href={`/v2/configurations?site=${fs.site.name}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 text-[12px] font-semibold text-fg hover:bg-bg-subtle"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit configuration
        </Link>
      </div>
      <DiffView base={base} override={override} />
    </div>
  );
}

// ── Workloads ────────────────────────────────────────────────────────────────
const SECRET_TONE: Record<SecretSyncStatus, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  synced: "success",
  syncing: "accent",
  drift: "warning",
  "missing-in-kv": "warning",
  error: "danger",
  never: "neutral",
};

function WorkloadsTab({ fs }: { fs: FleetSite }) {
  const release = RELEASES_BY_ID[fs.runtime.resolvedRelease];
  const workloads = fs.site.layers?.workloads ?? [];
  const secrets = SECRETS_BY_SITE[fs.site.name] ?? [];
  const kv = kvForSite(fs.site.name);

  return (
    <div className="max-w-3xl space-y-5">
      <section>
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <Cpu className="h-4 w-4 text-accent" />
          AIO components
          <span className="font-mono text-[12px] font-normal text-fg-subtle">
            release {fs.runtime.resolvedRelease}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-surface">
          {release ? (
            <>
              <ComponentRow name="Azure IoT Operations" version={release.aioVersion} />
              <ComponentRow name="cert-manager" version={release.certManagerVersion} />
              <ComponentRow name="secret-store" version={release.secretStoreVersion} />
            </>
          ) : (
            <div className="px-3 py-2 text-[12px] text-fg-subtle">Release pins unavailable.</div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <Boxes className="h-4 w-4 text-accent" />
          Connectors &amp; workloads
        </div>
        {workloads.length ? (
          <div className="rounded-lg border border-border bg-surface">
            {workloads.map((w) => (
              <ComponentRow key={w.name} name={w.name} version={w.chart} health={w.health} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-[12px] text-fg-subtle">
            No customer workloads observed on this cluster.
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <KeyRound className="h-4 w-4 text-accent" />
          Secrets
          <span className="text-[12px] font-normal text-fg-subtle">
            source: <span className="font-mono">{kv.name}</span>
          </span>
        </div>
        <div className="rounded-lg border border-border bg-surface">
          {secrets.length ? (
            secrets.map((s) => (
              <div
                key={s.secretName}
                className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[12px] last:border-0"
              >
                <span className="font-mono text-[11px] text-fg">{s.secretName}</span>
                <Badge tone={SECRET_TONE[s.syncStatus ?? "synced"]}>{s.syncStatus ?? "synced"}</Badge>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-[12px] text-fg-subtle">No secrets declared for this site.</div>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          Values live in the central Key Vault, never in git. Sites declare which secrets they need.
        </p>
      </section>
    </div>
  );
}

function ComponentRow({
  name,
  version,
  health,
}: {
  name: string;
  version: string;
  health?: "healthy" | "degraded" | "unhealthy";
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[12px] last:border-0">
      <span className="flex items-center gap-2">
        {health && <span className={cn("h-2 w-2 rounded-full", healthMeta(health).dot)} />}
        <span className="text-fg">{name}</span>
      </span>
      <span className="font-mono text-[11px] text-fg-muted">{version}</span>
    </div>
  );
}

// ── Operations history ───────────────────────────────────────────────────────
function relTime(minutesAgo: number): string {
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  if (minutesAgo < 1440) return `${Math.round(minutesAgo / 60)}h ago`;
  return `${Math.round(minutesAgo / 1440)}d ago`;
}

const EVENT_TONE: Record<SiteEvent["kind"], "neutral" | "accent" | "success" | "warning" | "danger"> = {
  "release-upgraded": "accent",
  "secret-synced": "success",
  "secret-error": "danger",
  "manifest-applied": "neutral",
  "dataflow-restarted": "warning",
  "health-changed": "warning",
  "asset-discovered": "neutral",
};

function OperationsHistoryTab({ fs }: { fs: FleetSite }) {
  const events = EVENTS_BY_SITE[fs.site.name] ?? [];
  if (!events.length) {
    return (
      <div className="max-w-3xl rounded-lg border border-dashed border-border p-4 text-[12px] text-fg-subtle">
        No recorded operations for this site yet.
      </div>
    );
  }
  return (
    <div className="max-w-3xl space-y-2">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
          <Badge tone={EVENT_TONE[e.kind]} className="mt-0.5 shrink-0">
            {e.kind.replace(/-/g, " ")}
          </Badge>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-fg">{e.message}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-subtle">
              <span>{relTime(e.minutesAgo)}</span>
              {e.actor && <span>· {e.actor}</span>}
              {e.commitSha && <span className="font-mono">· {e.commitSha}</span>}
              {e.pipelineRunId && <span>· {e.pipelineRunId}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
