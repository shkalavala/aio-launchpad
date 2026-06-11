"use client";

import { useState, type ReactNode } from "react";
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
  Workflow,
  Radio,
  Send,
  Trash2,
  Layers,
  Clock,
  FileCode2,
  ExternalLink,
  ChevronRight,
  Package,
  ArrowUpCircle,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  Activity,
  Radar,
} from "lucide-react";
import type { FleetSite, LayerBase, SecretSyncStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useV2Store } from "@/store/useV2Store";
import { useIsRepoConnected, useRepoConnection } from "@/store/useRepoConnection";
import { useObservedSource } from "@/store/useObservedSource";
import { observedLastApply, OBSERVED_SOURCES } from "@/lib/v2/observedState";
import { RemoveSiteDialog } from "@/components/v2/sites/RemoveSiteDialog";
import { EditBindingsDrawer } from "@/components/v2/sites/EditBindingsDrawer";
import { buildConfigPair } from "@/lib/v2/config";
import { DiffView } from "@/components/v2/diff/DiffView";
import { clusterInfo, envTone, healthMeta, regionLabel } from "@/lib/v2/format";
import { HealthDot } from "@/components/v2/ui/HealthDot";
import { EVENTS_BY_SITE, type SiteEvent } from "@/lib/fixtures/events";
import { SECRETS_BY_SITE, kvForSite } from "@/lib/fixtures/secrets";
import { RELEASES_BY_ID } from "@/lib/fixtures/releases";
import { siteResources } from "@/lib/v2/resources";

type TabId = "infra" | "config" | "workloads" | "ops";

const TABS: { id: TabId; label: string; icon: typeof Server }[] = [
  { id: "infra", label: "Infrastructure", icon: Server },
  { id: "config", label: "Configurations", icon: SlidersHorizontal },
  { id: "workloads", label: "Workloads", icon: Boxes },
  { id: "ops", label: "Operations history", icon: History },
];

export function SiteDetail({ fs }: { fs: FleetSite }) {
  const [tab, setTab] = useState<TabId>("infra");
  const [removing, setRemoving] = useState(false);
  const [editingBindings, setEditingBindings] = useState(false);
  const mode = useV2Store((s) => s.mode);
  const repoConnected = useIsRepoConnected();
  const env = fs.runtime.environment;

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
          <HealthDot fs={fs} withLabel className="text-[12px]" />
          {repoConnected && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingBindings(true)}
                className="inline-flex items-center gap-1.5 rounded border border-border-strong bg-surface px-2.5 py-1 text-[12px] font-medium text-fg-muted hover:border-accent/50 hover:text-accent"
              >
                <Layers className="h-3.5 w-3.5" />
                Edit bindings
              </button>
              <button
                type="button"
                onClick={() => setRemoving(true)}
                className="inline-flex items-center gap-1.5 rounded border border-border-strong bg-surface px-2.5 py-1 text-[12px] font-medium text-fg-muted hover:border-danger/50 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove site
              </button>
            </div>
          )}
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

      {removing && (
        <RemoveSiteDialog siteName={fs.site.name} onClose={() => setRemoving(false)} />
      )}
      {editingBindings && (
        <EditBindingsDrawer fs={fs} onClose={() => setEditingBindings(false)} />
      )}
    </div>
  );
}

// ── Infrastructure ───────────────────────────────────────────────────────────

/** Relative time from an ISO timestamp ("3d ago"). */
function relTimeFromIso(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/**
 * Git provenance for this site's DESIRED state plus an honest, source-aware
 * "last applied" (which is OBSERVED — only a connected source can report it).
 */
function DesiredStateCard({ fs }: { fs: FleetSite }) {
  const connection = useRepoConnection((s) => s.connection);
  const sourceId = useObservedSource((s) => s.sourceId);
  const lastApply = observedLastApply(fs, sourceId);
  const src = OBSERVED_SOURCES[sourceId];

  const srcPath = connection ? `${connection.workspace}/sites/${fs.site.name}.yaml` : null;
  const blobUrl =
    connection && srcPath
      ? `https://github.com/${connection.owner}/${connection.repo}/blob/${connection.branch}/${srcPath}`
      : null;

  // Most recent commit that moved this site's manifest (fixture-derived).
  const appliedRev = (EVENTS_BY_SITE[fs.site.name] ?? []).find(
    (e) => e.commitSha && (e.kind === "manifest-applied" || e.kind === "release-upgraded"),
  )?.commitSha;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <ProvenanceRow icon={FileCode2} label="Source">
        {blobUrl && srcPath ? (
          <a
            href={blobUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
          >
            {srcPath}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-[12px] text-fg-muted">Resolved from the fleet repo</span>
        )}
      </ProvenanceRow>

      <ProvenanceRow icon={Package} label="Desired release">
        <span className="font-mono text-[12px] text-fg">AIO {fs.runtime.resolvedRelease}</span>
      </ProvenanceRow>

      <ProvenanceRow icon={Clock} label="Last applied">
        {lastApply.kind === "value" && lastApply.at ? (
          <span
            className="flex items-center gap-2 text-[12px] text-fg"
            title={src.note}
          >
            <span className="h-2 w-2 rounded-full bg-success" />
            {relTimeFromIso(lastApply.at)}
            {appliedRev && <span className="font-mono text-[11px] text-fg-subtle">· {appliedRev}</span>}
            <span className="text-[11px] text-fg-subtle">· {src.short.toLowerCase()}</span>
          </span>
        ) : (
          <span
            className="flex items-center gap-2 text-[12px] text-fg-subtle"
            title={src.note}
          >
            <span className="h-2 w-2 rounded-full bg-transparent ring-1 ring-inset ring-border-strong" />
            Not connected
          </span>
        )}
      </ProvenanceRow>
    </div>
  );
}

function ProvenanceRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Server;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-subtle">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {children}
    </div>
  );
}

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
      <DesiredStateCard fs={fs} />

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
  const workloads = fs.site.layers?.workloads ?? [];
  const secrets = SECRETS_BY_SITE[fs.site.name] ?? [];
  const kv = kvForSite(fs.site.name);
  const res = siteResources(fs);

  return (
    <div className="max-w-3xl space-y-5">
      <AioComponentsSection releaseId={fs.runtime.resolvedRelease} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
            <Workflow className="h-4 w-4 text-accent" />
            Data flows
            <span className="font-mono text-[12px] font-normal text-fg-subtle">
              profile {res.profile.name} · {res.profile.instanceCount}×
            </span>
          </div>
          <Badge tone="neutral" className="text-[10px]">authored in DOE · read-only</Badge>
        </div>
        <div className="rounded-lg border border-border bg-surface">
          {res.dataflows.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-[12px] last:border-0"
            >
              <span className="font-medium text-fg">{d.name}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                <span className="font-mono">{d.source}</span>
                <Send className="h-3 w-3 text-fg-subtle" />
                <span className="font-mono">{d.destination}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <Radio className="h-4 w-4 text-accent" />
          Assets &amp; endpoints
        </div>
        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[12px]">
            <span className="text-fg">{res.assets.protocol} assets</span>
            <span className="text-[11px] text-fg-muted">
              <span className="font-mono text-fg">{res.assets.count}</span> assets · sampling{" "}
              <span className="font-mono">{res.assets.samplingMs}ms</span>
            </span>
          </div>
          {res.endpoints.map((e) => (
            <div
              key={e.name}
              className="flex items-center justify-between border-b border-border px-3 py-2 text-[12px] last:border-0"
            >
              <span className="flex items-center gap-2">
                <span className="text-fg">{e.name}</span>
                <Badge tone="neutral" className="text-[10px]">{e.kind}</Badge>
              </span>
              <span className="font-mono text-[11px] text-fg-muted">{e.target}</span>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          What this site collects and where it sends. Add or change flows and assets in DOE; Launchpad
          rolls the resulting config across the fleet.
        </p>
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

// ── AIO components (release-bundle drill-down) ────────────────────────────────
function AioComponentsSection({ releaseId }: { releaseId: string }) {
  const [open, setOpen] = useState(false);
  const release = RELEASES_BY_ID[releaseId];

  const hasBundle = !!(release?.clusterPin || release?.arcAgentPin || release?.appPins?.length);

  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
        <Cpu className="h-4 w-4 text-accent" />
        AIO components
        <span className="font-mono text-[12px] font-normal text-fg-subtle">release {releaseId}</span>
      </div>

      {release ? (
        <div className="rounded-lg border border-border bg-surface">
          <ComponentRow name="Azure IoT Operations" version={release.aioVersion} />
          <ComponentRow name="cert-manager" version={release.certManagerVersion} />
          <ComponentRow name="secret-store" version={release.secretStoreVersion} />

          {hasBundle && (
            <>
              <div className="border-b border-border bg-bg-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                Release bundle · moves in lockstep
              </div>
              {release.clusterPin && (
                <ComponentRow name="Cluster (AKS Edge Essentials)" version={release.clusterPin} />
              )}
              {release.arcAgentPin && (
                <ComponentRow name="Arc connected-machine agent" version={release.arcAgentPin} />
              )}
              {release.appPins?.map((p) => (
                <ComponentRow key={p.name} name={p.name} version={p.chart} />
              ))}
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-fg-muted hover:text-accent"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
            {open ? "Hide" : "Show"} release details
          </button>
          {open && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border bg-bg-subtle px-3 py-2 text-[11px] text-fg-muted">
              <DetailKV label="AIO train" value={release.aioTrain} />
              <DetailKV label="AIO API" value={release.aioApiVersion} />
              <DetailKV label="ADR API" value={release.adrApiVersion} />
              <DetailKV label="cert-manager train" value={release.certManagerTrain} />
              <DetailKV label="secret-store train" value={release.secretStoreTrain} />
              {release.isDefault && <DetailKV label="Fleet default" value="yes" />}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-fg-subtle">
          Release pins unavailable.
        </div>
      )}
    </section>
  );
}

function DetailKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-subtle">{label}</span>
      <span className="font-mono text-fg">{value}</span>
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

const EVENT_ICON: Record<SiteEvent["kind"], typeof Server> = {
  "release-upgraded": ArrowUpCircle,
  "secret-synced": KeyRound,
  "secret-error": AlertTriangle,
  "manifest-applied": FileCheck2,
  "dataflow-restarted": RefreshCw,
  "health-changed": Activity,
  "asset-discovered": Radar,
};

const EVENT_ICON_TINT: Record<SiteEvent["kind"], string> = {
  "release-upgraded": "text-accent",
  "secret-synced": "text-success",
  "secret-error": "text-danger",
  "manifest-applied": "text-fg-muted",
  "dataflow-restarted": "text-warning",
  "health-changed": "text-warning",
  "asset-discovered": "text-fg-muted",
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
      {events.map((e, i) => {
        const Icon = EVENT_ICON[e.kind];
        return (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-bg-subtle">
              <Icon className={cn("h-3.5 w-3.5", EVENT_ICON_TINT[e.kind])} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge tone={EVENT_TONE[e.kind]} className="shrink-0">
                  {e.kind.replace(/-/g, " ")}
                </Badge>
                <span className="truncate text-[12px] text-fg">{e.message}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-subtle">
                <span>{relTime(e.minutesAgo)}</span>
                {e.actor && <span>· {e.actor}</span>}
                {e.commitSha && <span className="font-mono">· {e.commitSha}</span>}
                {e.pipelineRunId && <span>· {e.pipelineRunId}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
