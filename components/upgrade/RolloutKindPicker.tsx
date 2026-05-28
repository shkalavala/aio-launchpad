"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpCircle, Cloud, Package, Sprout, Search, X, Cpu, Layers, Terminal, Server } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { RELEASES, DEFAULT_RELEASE } from "@/lib/fixtures/releases";
import { SOLUTIONS, type AioSolution } from "@/lib/fixtures/solutions";
import { AIO_RESOURCES } from "@/lib/fixtures/aioResources";
import type { AioReleaseId } from "@/lib/types";
import type { RolloutKind } from "@/lib/fixtures/rollouts";
import { cn } from "@/lib/utils";

type Kind = RolloutKind;

interface Props {
  locked: boolean;
}

/**
 * "What are you rolling?" picker. Three kinds share the same ring/gate/verify
 * pipeline; only the payload identifier and the headline change.
 *
 * Kept intentionally lean — this is the demo's proof that "Rollout" is the
 * verb, not "Upgrade". The longer-term model (Changes with history) is noted
 * in repo memory; this picker is the entry point that the eventual /changes
 * page will inherit.
 */
export function RolloutKindPicker({ locked }: Props) {
  const kind = useAppStore((s) => s.rolloutKind);
  const setKind = useAppStore((s) => s.setRolloutKind);
  const manageInfra = useAppStore((s) => s.manageInfra);

  const targetReleaseId = useAppStore((s) => s.targetReleaseId);
  const setTargetRelease = useAppStore((s) => s.setTargetRelease);
  const appId = useAppStore((s) => s.rolloutAppId);
  const setAppId = useAppStore((s) => s.setRolloutAppId);
  const armId = useAppStore((s) => s.rolloutArmId);
  const setArmId = useAppStore((s) => s.setRolloutArmId);
  const resourceIds = useAppStore((s) => s.rolloutResourceIds);
  const setResourceIds = useAppStore((s) => s.setRolloutResourceIds);

  const tabs: Array<{ id: Kind; label: string; icon: typeof ArrowUpCircle; hint: string; activeWhen?: (k: Kind) => boolean }> = [
    {
      id: "release",
      label: "Upgrade AIO",
      icon: ArrowUpCircle,
      hint: "Bump the AIO release pin across sites already running AIO",
    },
    {
      id: "install",
      label: "New install",
      icon: Sprout,
      hint: "Install AIO on sites declared in your manifest that don’t have it yet",
    },
    {
      // Unified AIO Solutions tab. The tab's nominal id is "app" (any sample
      // solution dispatches via the app rollout kind); module-tagged
      // solutions dispatch via "arm". Both light up this tab.
      id: "app",
      label: "AIO Solution",
      icon: Package,
      hint: "Deploy or apply an AIO Solution — unified Scale Kit samples (sample + module) and customer-authored solutions",
      activeWhen: (k) => k === "app" || k === "arm",
    },
    {
      id: "resource",
      label: "AIO resources",
      icon: Cloud,
      hint: "Re-apply git state for selected AIO resources (Dataflows, Assets, Endpoints…) across sites",
    },
  ];

  // Infra & workloads kinds — visible only when manageInfra=true. These run
  // over the Arc transport: aksee-upgrade and arc-*-agent-upgrade use Arc Run
  // Command to drive PowerShell on the node; helm uses the Arc Kubernetes
  // proxy. `script` is the generic Arc Run Command step exposed for ad-hoc
  // operator scripts. See private/Olympus/olympus-extension-model.md §4.
  const infraTabs: Array<{ id: Kind; label: string; icon: typeof ArrowUpCircle; hint: string }> = [
    {
      id: "aksee-upgrade",
      label: "AKS-EE upgrade",
      icon: Cpu,
      hint: "Stage + apply an AKS-EE cluster upgrade over Arc Run Command (three-cmdlet sequence)",
    },
    {
      id: "arc-server-agent-upgrade",
      label: "Arc-server agent",
      icon: Server,
      hint: "Upgrade the Arc-for-servers (connectedmachine) agent on host VMs — optional layer",
    },
    {
      id: "arc-k8s-agent-upgrade",
      label: "Arc-K8s agent",
      icon: Cpu,
      hint: "Upgrade the Arc-for-Kubernetes agent on the cluster — mandatory layer (AIO prereq)",
    },
    {
      id: "helm",
      label: "App",
      icon: Layers,
      hint: "Customer-owned helm chart on the cluster (via Arc Kubernetes proxy) — NOT an AIO Solution",
    },
    {
      id: "script",
      label: "Script (Arc)",
      icon: Terminal,
      hint: "Run an ad-hoc PowerShell / shell script on selected sites via Arc Run Command",
    },
  ];

  return (
    <section className="rounded border border-border bg-surface">
      <header className="border-b border-border-subtle px-3 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
          What are you rolling?
        </h2>
      </header>

      <div className="flex flex-wrap gap-1 px-3 pt-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.activeWhen ? t.activeWhen(kind) : kind === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setKind(t.id)}
              disabled={locked}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[12px] transition-colors disabled:opacity-60",
                active
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border bg-bg text-fg-muted hover:border-accent/40 hover:text-fg",
              )}
              title={t.hint}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {manageInfra && (
        <>
          <div className="mt-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            Infra &amp; workloads
          </div>
          <div className="flex flex-wrap gap-1 px-3 pt-1">
            {infraTabs.map((t) => {
              const Icon = t.icon;
              const active = kind === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setKind(t.id)}
                  disabled={locked}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[12px] transition-colors disabled:opacity-60",
                    active
                      ? "border-accent bg-accent-subtle text-accent"
                      : "border-border bg-bg text-fg-muted hover:border-accent/40 hover:text-fg",
                  )}
                  title={t.hint}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="px-3 pb-3 pt-2">
        {kind === "release" && (
          <PayloadRow label="Target release">
            <select
              value={targetReleaseId ?? DEFAULT_RELEASE.id}
              disabled={locked}
              onChange={(e) => setTargetRelease(e.target.value as AioReleaseId)}
              className="h-7 rounded-sm border border-border bg-bg px-2 text-[12px] disabled:opacity-60"
            >
              {RELEASES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — AIO {r.aioVersion}
                  {r.isDefault ? " (current)" : ""}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-fg-subtle">
              Sites already at or above this release are filtered out automatically.
            </span>
          </PayloadRow>
        )}

        {kind === "install" && (
          <PayloadRow label="Install release">
            <select
              value={targetReleaseId ?? DEFAULT_RELEASE.id}
              disabled={locked}
              onChange={(e) => setTargetRelease(e.target.value as AioReleaseId)}
              className="h-7 rounded-sm border border-border bg-bg px-2 text-[12px] disabled:opacity-60"
            >
              {RELEASES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — AIO {r.aioVersion}
                  {r.isDefault ? " (current)" : ""}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-fg-subtle">
              Picks from sites that are declared in the manifest but don’t have AIO installed yet.
            </span>
          </PayloadRow>
        )}

        {(kind === "app" || kind === "arm") && (
          <PayloadRow label="Solution">
            <select
              value={kind === "app" ? appId ?? "" : armId ?? ""}
              disabled={locked}
              onChange={(e) => {
                const id = e.target.value || null;
                if (!id) {
                  setAppId(null);
                  setArmId(null);
                  return;
                }
                const sol = SOLUTIONS.find((s) => s.id === id);
                if (!sol) return;
                // Dispatch to the underlying rollout kind for this solution.
                // Clear the other slice so /rollout doesn't read stale state.
                setKind(sol.rolloutKind);
                if (sol.rolloutKind === "app") {
                  setAppId(sol.id);
                  setArmId(null);
                } else {
                  setArmId(sol.id);
                  setAppId(null);
                }
              }}
              className="h-7 rounded-sm border border-border bg-bg px-2 text-[12px] disabled:opacity-60"
            >
              <option value="">— pick a solution —</option>
              <optgroup label="Sample (helm-shaped, installs pods)">
                {SOLUTIONS.filter((s) => s.tag === "sample").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Module (ARM/Bicep, patches resources)">
                {SOLUTIONS.filter((s) => s.tag === "module").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <SolutionHint kind={kind} appId={appId} armId={armId} />
          </PayloadRow>
        )}
        )}

        {kind === "resource" && (
          <ResourcePickerInline
            ids={resourceIds}
            onChange={setResourceIds}
            locked={locked}
          />
        )}

        {/* ── Infra-scope payload rows ─────────────────────────────────────────── */}
        {kind === "aksee-upgrade" && (
          <PayloadRow label="AKS-EE target">
            <span className="font-mono text-[12px] text-fg">aksee-1.7.230</span>
            <span className="text-[11px] text-fg-subtle">
              Three-cmdlet stage → control-plane → worker sequence over Arc Run Command.
            </span>
          </PayloadRow>
        )}
        {kind === "arc-server-agent-upgrade" && (
          <PayloadRow label="Arc-server agent target">
            <span className="font-mono text-[12px] text-fg">1.45.01781</span>
            <span className="text-[11px] text-fg-subtle">
              Upgrades the connectedmachine agent on the underlying VMs. Optional layer —
              only sites whose host is Arc-for-servers connected are eligible.
            </span>
          </PayloadRow>
        )}
        {kind === "arc-k8s-agent-upgrade" && (
          <PayloadRow label="Arc-K8s agent target">
            <span className="font-mono text-[12px] text-fg">1.21.6</span>
            <span className="text-[11px] text-fg-subtle">
              Upgrades the Arc-for-Kubernetes agent on the cluster. Every AIO-bearing site
              has this layer (hard prereq).
            </span>
          </PayloadRow>
        )}
        {kind === "helm" && (
          <PayloadRow label="Helm chart">
            <span className="font-mono text-[12px] text-fg">edge-control-3.2.0</span>
            <span className="text-[11px] text-fg-subtle">
              Issued through the Arc Kubernetes proxy on the target cluster.
            </span>
          </PayloadRow>
        )}
        {kind === "script" && (
          <PayloadRow label="Script step">
            <span className="font-mono text-[12px] text-fg">ad-hoc.ps1</span>
            <span className="text-[11px] text-fg-subtle">
              Generic Arc Run Command step. Use for one-off ops; persistent ops should live in a release.
            </span>
          </PayloadRow>
        )}
      </div>
    </section>
  );
}

function PayloadRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
      <span className="font-medium text-fg">{label}</span>
      {children}
    </label>
  );
}

function SolutionHint({
  kind,
  appId,
  armId,
}: {
  kind: "app" | "arm";
  appId: string | null;
  armId: string | null;
}) {
  const id = kind === "app" ? appId : armId;
  if (!id) {
    return (
      <span className="text-[11px] text-fg-subtle">
        Browse AIO Solutions at <span className="font-mono">/apps</span>.
      </span>
    );
  }
  const sol = SOLUTIONS.find((s) => s.id === id);
  if (!sol) return null;
  return (
    <span className="text-[11px] text-fg-subtle">
      <span className="font-mono uppercase text-fg-muted">{sol.tag}</span> · {sol.tagline}
    </span>
  );
}

/** "2 Dataflow, 1 Asset" — count by category for the picker hint. */
function summariseResourceSelection(ids: string[]): string {
  const byCat: Record<string, number> = {};
  for (const id of ids) {
    const r = AIO_RESOURCES.find((x) => x.id === id);
    if (!r) continue;
    byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  }
  const parts = Object.entries(byCat).map(([cat, n]) => `${n} ${cat}`);
  return parts.length === 0 ? "" : parts.join(", ");
}

// ── Inline AIO-resource picker ──────────────────────────────────────────────
//
// Previously this row was just a deep link to `/resources?driftOnly=1` with a
// "Roll out N →" return trip. Forcing operators to leave the rollout screen to
// pick a payload broke flow, especially for the common "ship this one drifted
// dataflow" case. The full Resources page still exists for deeper exploration;
// this picker handles the >80% case in-line.

function ResourcePickerInline({
  ids,
  onChange,
  locked,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  locked: boolean;
}) {
  const [open, setOpen] = useState(ids.length === 0);
  const [query, setQuery] = useState("");
  const [driftOnly, setDriftOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AIO_RESOURCES.filter((r) => {
      if (driftOnly && r.syncStatus !== "drift") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [query, driftOnly]);

  const idSet = new Set(ids);
  const driftTotal = AIO_RESOURCES.filter((r) => r.syncStatus === "drift").length;

  const toggle = (id: string) => {
    if (locked) return;
    const next = new Set(idSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const selectAllFiltered = () => {
    if (locked) return;
    const next = new Set(idSet);
    for (const r of filtered) next.add(r.id);
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
        <span className="font-medium text-fg">AIO resources</span>
        {ids.length > 0 ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-sm border border-accent bg-accent-subtle px-2 py-0.5 text-[12px] font-medium text-accent">
              {ids.length} selected
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={locked}
              className="text-[11px] text-fg-subtle hover:text-danger-fg disabled:opacity-60"
              title="Clear resource selection"
            >
              clear
            </button>
            <span className="text-[11px] text-fg-subtle">
              {summariseResourceSelection(ids)}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-fg-subtle">No resources picked.</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto text-[11px] text-accent hover:underline"
        >
          {open ? "Hide picker" : ids.length > 0 ? "Edit selection" : "Pick resources"}
        </button>
      </div>

      {open && (
        <div className="rounded-md border border-border bg-surface p-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, category, or id…"
                className="w-full rounded-sm border border-border bg-bg-subtle py-1 pl-7 pr-7 text-[12px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                  aria-label="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
              <input
                type="checkbox"
                checked={driftOnly}
                onChange={(e) => setDriftOnly(e.target.checked)}
                className="h-3 w-3 accent-accent"
              />
              Drift only ({driftTotal})
            </label>
            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={locked || filtered.length === 0}
              className="text-[11px] text-accent hover:underline disabled:opacity-60"
            >
              Select all ({filtered.length})
            </button>
            <Link
              href="/resources?driftOnly=1"
              className="text-[11px] text-fg-subtle hover:text-accent hover:underline"
              title="Open full Resources page for deeper exploration"
            >
              Open full list ↗
            </Link>
          </div>

          <ul className="mt-2 max-h-64 divide-y divide-border-subtle overflow-y-auto rounded-sm border border-border-subtle bg-bg-subtle/40">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-[11px] text-fg-subtle">
                No resources match.
              </li>
            ) : (
              filtered.map((r) => {
                const checked = idSet.has(r.id);
                return (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[12px] hover:bg-bg-subtle">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(r.id)}
                        disabled={locked}
                        className="h-3 w-3 accent-accent"
                      />
                      <span className="min-w-0 flex-1 truncate text-fg">{r.name}</span>
                      <span className="shrink-0 rounded-sm bg-bg-subtle px-1.5 py-0.5 text-[10px] text-fg-subtle">
                        {r.category}
                      </span>
                      {r.syncStatus === "drift" && (
                        <span className="shrink-0 rounded-sm bg-warning-fg/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-fg">
                          drift
                        </span>
                      )}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
