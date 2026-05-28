"use client";

import { useMemo } from "react";
import { Search, ArrowUpCircle, Cloud, Package, Wrench, RotateCcw, Sprout } from "lucide-react";
import { CommandBar } from "@/components/shell/CommandBar";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { SAMPLE_APPS } from "@/lib/fixtures/sampleApps";
import { ARM_MODULES } from "@/lib/fixtures/armModules";
import { useFleet } from "@/lib/useFleet";
import { buildLabelIndex } from "@/lib/selector";
import type { AioReleaseId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  targetCount: number;
  /** Source release of each selected site, captured at render time. Frozen
   *  into the store on Roll out so the per-row "from→to" and YAML diff keep
   *  showing the operator's starting baseline as sites flip. */
  releaseSnapshotForSelected: Record<string, AioReleaseId>;
}

/**
 * Rollout-screen command bar. Reuses the selector input + datalist pattern
 * from FleetCommandBar so the "selector is the magic moment" (DEMO.md Screen 3
 * killer detail) carries over verbatim.
 *
 * Payload picking lives in RolloutKindPicker; this bar just shows the CTA and
 * the selector input.
 */
export function UpgradeCommandBar({ targetCount, releaseSnapshotForSelected }: Props) {
  const selectorText = useAppStore((s) => s.selectorText);
  const setSelectorText = useAppStore((s) => s.setSelectorText);
  const rolloutKind = useAppStore((s) => s.rolloutKind);
  const targetReleaseId = useAppStore((s) => s.targetReleaseId);
  const rolloutAppId = useAppStore((s) => s.rolloutAppId);
  const rolloutArmId = useAppStore((s) => s.rolloutArmId);
  const rolloutResourceIds = useAppStore((s) => s.rolloutResourceIds);
  const rolloutStatus = useAppStore((s) => s.rolloutStatus);
  const startRollout = useAppStore((s) => s.startRollout);
  const resetRollout = useAppStore((s) => s.resetRollout);

  const fleet = useFleet();
  const suggestions = useMemo(() => {
    const labelIndex = buildLabelIndex(fleet);
    const byKey = new Map<string, string[]>();
    for (const [value, key] of Object.entries(labelIndex)) {
      const list = byKey.get(key) ?? [];
      list.push(value);
      byKey.set(key, list);
    }
    return [...byKey.entries()].map(([key, values]) => ({ key, values: values.sort() }));
  }, [fleet]);

  const locked = rolloutStatus !== "idle";

  // Per-kind CTA: label, icon, and "is the payload picked?" check.
  const { ctaLabel, ctaIcon: CtaIcon, payloadOk, payloadHint } = (() => {
    if (rolloutKind === "app") {
      const app = SAMPLE_APPS.find((a) => a.id === rolloutAppId);
      return {
        ctaLabel: app ? `Deploy ${app.name}` : "Deploy Solution",
        ctaIcon: Package,
        payloadOk: !!rolloutAppId,
        payloadHint: "Pick a Solution above",
      };
    }
    if (rolloutKind === "arm") {
      const mod = ARM_MODULES.find((m) => m.id === rolloutArmId);
      return {
        ctaLabel: mod ? `Apply ${mod.name}` : "Apply Solution",
        ctaIcon: Wrench,
        payloadOk: !!rolloutArmId,
        payloadHint: "Pick a Solution above",
      };
    }
    if (rolloutKind === "install") {
      return {
        ctaLabel: targetReleaseId ? `Install release ${targetReleaseId}` : "Install AIO",
        ctaIcon: Sprout,
        payloadOk: !!targetReleaseId,
        payloadHint: "Pick an install release above",
      };
    }
    if (rolloutKind === "resource") {
      const n = rolloutResourceIds.length;
      return {
        ctaLabel: n === 0 ? "Re-apply AIO resources" : `Re-apply ${n} AIO resource${n === 1 ? "" : "s"}`,
        ctaIcon: Cloud,
        payloadOk: n > 0,
        payloadHint: "Select AIO resources on /resources first",
      };
    }
    return {
      ctaLabel: targetReleaseId ? `Roll out release ${targetReleaseId}` : "Roll out release",
      ctaIcon: ArrowUpCircle,
      payloadOk: !!targetReleaseId,
      payloadHint: "Pick a target release above",
    };
  })();

  const deployDisabled = locked || targetCount === 0 || !payloadOk;

  return (
    <>
      <CommandBar>
        <Button
          variant="primary"
          size="sm"
          disabled={deployDisabled}
          onClick={() => startRollout(releaseSnapshotForSelected)}
          title={
            targetCount === 0
              ? "No sites match the current selector"
              : !payloadOk
                ? payloadHint
                : `Stage rollout to ${targetCount} site${targetCount === 1 ? "" : "s"}`
          }
        >
          <CtaIcon className="h-3.5 w-3.5" />
          {ctaLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetRollout}
          disabled={!locked && !payloadOk && !selectorText}
          title="Reset rollout state"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <div className="ml-auto text-[12px] text-fg-muted">
          <span className="font-semibold text-fg">{targetCount}</span> site
          {targetCount === 1 ? "" : "s"} targeted
        </div>
      </CommandBar>

      {rolloutKind !== "install" && (
        <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-3">
          <span className="text-[12px] font-medium text-fg-muted">Selector</span>
          <div className="relative w-[28rem]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={selectorText}
              onChange={(e) => setSelectorText(e.target.value)}
              placeholder="env=prod, country=SE"
              list="aio-upgrade-selector-suggestions"
              disabled={locked}
              className={cn(
                "h-7 w-full rounded-sm border border-border bg-bg pl-7 pr-2 font-mono text-[12px]",
                "outline-none placeholder:text-fg-subtle/70 disabled:opacity-60",
                "focus:border-accent focus:ring-1 focus:ring-accent/40",
              )}
            />
            <datalist id="aio-upgrade-selector-suggestions">
              {suggestions.flatMap((g) =>
                g.values.map((v) => (
                  <option key={`exp:${g.key}:${v}`} value={`${g.key}=${v}`} />
                )),
              )}
            </datalist>
          </div>
          <span className="text-[11px] text-fg-subtle">
            Mirrors <span className="font-mono">siteops -l</span> — same language the fleet view uses
          </span>
        </div>
      )}
    </>
  );
}
