"use client";

import { useMemo } from "react";
import { ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { useFleet } from "@/lib/useFleet";
import { RING_STRATEGIES, getRingStrategy } from "@/lib/fixtures/strategies";
import { getFleetRingAssignment, ringTone, type RingLabel } from "@/lib/rings";
import { Badge } from "@/components/ui/Badge";
import { EnvPill } from "@/components/fleet/EnvPill";
import { FACTORY_DISPLAY, siteDisplayName } from "@/lib/fixtures/sites";
import { cn } from "@/lib/utils";

/**
 * Rings — fleet-level browse view for the named ring strategies. The same
 * `ringStrategyId` drives both the Fleet table's Ring column and the
 * per-rollout planner on /rollout, so picking here propagates everywhere.
 */
export default function RingsPage() {
  const ringStrategyId = useAppStore((s) => s.ringStrategyId);
  const setRingStrategyId = useAppStore((s) => s.setRingStrategyId);
  const strategy = getRingStrategy(ringStrategyId);
  const fleet = useFleet();
  const installed = useMemo(
    () => fleet.filter((f) => f.runtime.aioInstalled !== false),
    [fleet],
  );
  const assignment = useMemo(
    () => getFleetRingAssignment(installed, strategy),
    [installed, strategy],
  );

  const grouped = useMemo(() => {
    const out: Record<RingLabel, typeof installed> = {
      Canary: [],
      "Wave 1": [],
      "Wave 2": [],
    };
    for (const fs of installed) {
      const r = assignment[fs.site.name];
      if (r) out[r].push(fs);
    }
    return out;
  }, [installed, assignment]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
        <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
          <span>Home</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-fg">Rings</span>
        </nav>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-[20px] font-semibold leading-tight text-fg">
              <Layers className="h-5 w-5 text-accent" />
              Rings
            </h1>
            <p className="text-[12px] text-fg-muted">
              Pick the named strategy that governs how fleet-wide rollouts stage.
              Every site is labeled with the ring it would land in under the active
              strategy. The /rollout planner uses the same shape against your selection.
            </p>
          </div>
          <Link
            href="/rollout"
            className="rounded border border-border bg-bg px-2.5 py-1 text-[12px] font-medium text-fg hover:border-accent hover:text-accent"
          >
            Plan a rollout &rarr;
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto bg-bg p-4">
        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-fg-muted">
            Strategies
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {RING_STRATEGIES.map((s) => {
              const active = s.id === ringStrategyId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setRingStrategyId(s.id)}
                  className={cn(
                    "rounded border bg-surface p-3 text-left transition-colors",
                    active
                      ? "border-accent ring-1 ring-accent/40"
                      : "border-border hover:border-accent/60",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-fg">{s.name}</span>
                    {active && <Badge tone="accent">Active</Badge>}
                  </div>
                  <p className="mb-2 text-[12px] text-fg-muted">{s.tagline}</p>
                  <p className="text-[11px] leading-snug text-fg-subtle">{s.description}</p>
                  <div className="mt-2 flex gap-3 text-[11px] text-fg-muted">
                    <span>
                      <span className="text-fg-subtle">Canary:</span> {s.canarySize}
                    </span>
                    <span>
                      <span className="text-fg-subtle">Waves:</span> {s.waveCount}
                    </span>
                    <span>
                      <span className="text-fg-subtle">Tone:</span> {s.tone}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-fg-muted">
            Fleet under {strategy.name}
          </h2>
          {installed.length === 0 ? (
            <p className="rounded border border-dashed border-border bg-bg-subtle px-4 py-8 text-center text-[12px] text-fg-subtle">
              No installed sites yet. Sites appear here once AIO is installed on them.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(["Canary", "Wave 1", "Wave 2"] as RingLabel[]).map((label) => (
                <div key={label} className="rounded border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge tone={ringTone(label)}>{label}</Badge>
                    <span className="text-[11px] text-fg-subtle">
                      {grouped[label].length} sites
                    </span>
                  </div>
                  {grouped[label].length === 0 ? (
                    <p className="rounded border border-dashed border-border-subtle px-2 py-3 text-center text-[11px] text-fg-subtle">
                      (empty under this strategy)
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {grouped[label].map((fs) => (
                        <li
                          key={fs.site.name}
                          className="flex items-center justify-between gap-2 rounded border border-border-subtle bg-bg px-2 py-1"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[12px] font-medium text-fg">
                              {fs.runtime.environment === "prod"
                                ? (FACTORY_DISPLAY[fs.resolvedLabels.plant] ?? fs.site.name)
                                : "Shared dev"}
                            </span>
                            <span className="truncate text-[10px] text-fg-subtle">
                              {siteDisplayName(
                                fs.resolvedLabels.factorySite,
                                fs.resolvedLabels.country,
                              )}
                              <span className="mx-1 opacity-60">·</span>
                              <span className="font-mono">{fs.site.name}</span>
                            </span>
                          </div>
                          <EnvPill env={fs.runtime.environment} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded border border-border-subtle bg-bg-subtle p-3 text-[11px] text-fg-muted">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            How rings work here
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              The active strategy labels <em>every installed site</em> with a default ring,
              shown in the Fleet table&apos;s Ring column.
            </li>
            <li>
              Dev sites are preferred as Canary (lower blast radius, faster to roll forward).
            </li>
            <li>
              On <Link href="/rollout" className="text-accent hover:underline">/rollout</Link>,
              the same strategy is applied to <em>your selected subset</em>; you can still
              drag sites between rings for per-rollout tweaks.
            </li>
            <li>
              Strategies change <em>shape</em> only — pause/resume, health-verify, and
              blast-radius preview always apply.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
