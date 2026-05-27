"use client";

import Link from "next/link";
import { ArrowUpCircle, Cloud, Package, Wrench, Sprout } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { RELEASES, DEFAULT_RELEASE } from "@/lib/fixtures/releases";
import { SAMPLE_APPS } from "@/lib/fixtures/sampleApps";
import { ARM_MODULES } from "@/lib/fixtures/armModules";
import { AIO_RESOURCES } from "@/lib/fixtures/aioResources";
import type { AioReleaseId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Kind = "release" | "app" | "arm" | "install" | "resource";

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

  const targetReleaseId = useAppStore((s) => s.targetReleaseId);
  const setTargetRelease = useAppStore((s) => s.setTargetRelease);
  const appId = useAppStore((s) => s.rolloutAppId);
  const setAppId = useAppStore((s) => s.setRolloutAppId);
  const armId = useAppStore((s) => s.rolloutArmId);
  const setArmId = useAppStore((s) => s.setRolloutArmId);
  const resourceIds = useAppStore((s) => s.rolloutResourceIds);
  const setResourceIds = useAppStore((s) => s.setRolloutResourceIds);

  const tabs: Array<{ id: Kind; label: string; icon: typeof ArrowUpCircle; hint: string }> = [
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
      id: "app",
      label: "App",
      icon: Package,
      hint: "Deploy or upgrade a Scale Kit sample app",
    },
    {
      id: "arm",
      label: "ARM module",
      icon: Wrench,
      hint: "Apply a targeted post-deployment Bicep / config change",
    },
    {
      id: "resource",
      label: "Resource",
      icon: Cloud,
      hint: "Re-apply git state for selected AIO resources (Dataflows, Assets, Endpoints…) across sites",
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

        {kind === "app" && (
          <PayloadRow label="App to deploy">
            <select
              value={appId ?? ""}
              disabled={locked}
              onChange={(e) => setAppId(e.target.value || null)}
              className="h-7 rounded-sm border border-border bg-bg px-2 text-[12px] disabled:opacity-60"
            >
              <option value="">— pick an app —</option>
              {SAMPLE_APPS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {appId ? (
              <span className="text-[11px] text-fg-subtle">
                {SAMPLE_APPS.find((a) => a.id === appId)?.tagline}
              </span>
            ) : (
              <span className="text-[11px] text-fg-subtle">
                Browse Apps & Modules at <span className="font-mono">/apps</span>.
              </span>
            )}
          </PayloadRow>
        )}

        {kind === "arm" && (
          <PayloadRow label="Module">
            <select
              value={armId ?? ""}
              disabled={locked}
              onChange={(e) => setArmId(e.target.value || null)}
              className="h-7 rounded-sm border border-border bg-bg px-2 text-[12px] disabled:opacity-60"
            >
              <option value="">— pick a module —</option>
              {ARM_MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {armId ? (
              <span className="text-[11px] text-fg-subtle">
                {ARM_MODULES.find((m) => m.id === armId)?.tagline}
              </span>
            ) : (
              <span className="text-[11px] text-fg-subtle">
                Targeted post-deployment Bicep / config change from{" "}
                <span className="font-mono">samples/modules/</span>.
              </span>
            )}
          </PayloadRow>
        )}

        {kind === "resource" && (
          <PayloadRow label="Resources">
            {resourceIds.length === 0 ? (
              <span className="text-[11px] text-fg-subtle">
                No resources picked. Open{" "}
                <Link href="/resources?driftOnly=1" className="text-accent underline-offset-2 hover:underline">
                  Resources
                </Link>{" "}
                to multi-select drifted resources, then “Roll out N →” back here.
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-sm border border-accent bg-accent-subtle px-2 py-0.5 text-[12px] font-medium text-accent">
                  {resourceIds.length} resource{resourceIds.length === 1 ? "" : "s"} selected
                </span>
                <button
                  type="button"
                  onClick={() => setResourceIds([])}
                  disabled={locked}
                  className="text-[11px] text-fg-subtle hover:text-danger-fg disabled:opacity-60"
                  title="Clear resource selection"
                >
                  clear
                </button>
                <span className="text-[11px] text-fg-subtle">
                  {summariseResourceSelection(resourceIds)}
                </span>
              </>
            )}
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
