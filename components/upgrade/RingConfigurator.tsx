"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, RotateCcw, GripVertical, ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { planRollout, type Ring } from "@/lib/upgrade";
import { RING_STRATEGIES, getRingStrategy, type RingStrategy } from "@/lib/fixtures/strategies";
import type { FleetSite } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Props {
  selectedSites: FleetSite[];
  /** Read-only after the rollout starts (status !== "idle"). */
  locked: boolean;
}

const DRAG_MIME = "application/x-aio-site";

interface DragPayload {
  siteName: string;
  fromRingId: string;
}

/**
 * Primitive #1 — Rings. Operator picks a named strategy (Dev-only / Standard /
 * Cautious) and that strategy's knobs drive lib/upgrade.ts:planRollout against
 * the selected sites. Sites can be dragged between rings for per-rollout
 * customization (option C from the rings-customization design). Locks once the
 * rollout is running so the staged order is auditable. The inline Compare
 * panel surfaces the named strategies + educational copy in-place.
 */
export function RingConfigurator({ selectedSites, locked }: Props) {
  const rings = useAppStore((s) => s.rings);
  const setRings = useAppStore((s) => s.setRings);
  const ringStrategyId = useAppStore((s) => s.ringStrategyId);
  const setRingStrategyId = useAppStore((s) => s.setRingStrategyId);
  const strategy = getRingStrategy(ringStrategyId);

  // Track whether the operator has hand-edited rings since the last auto-plan.
  // Cleared when selection or strategy changes (those reset the plan).
  const [customized, setCustomized] = useState(false);
  // Bumped by Reset to re-run the planner even without selection/strategy delta.
  const [resetNonce, setResetNonce] = useState(0);
  // Inline strategy comparison panel — lets the operator pick without
  // round-tripping to /rings and losing rollout context.
  const [compareOpen, setCompareOpen] = useState(false);

  // Recompute the plan whenever the selection OR strategy changes, but only
  // while unlocked. This keeps the rings array in sync with operator edits.
  useEffect(() => {
    if (locked) return;
    setRings(
      planRollout(selectedSites, {
        canarySize: strategy.canarySize,
        waveCount: strategy.waveCount,
      }),
    );
    setCustomized(false);
  }, [selectedSites, locked, setRings, strategy.canarySize, strategy.waveCount, resetNonce]);

  function moveSite(siteName: string, fromRingId: string, toRingId: string) {
    if (locked || fromRingId === toRingId) return;
    const next = rings.map((r) => {
      if (r.id === fromRingId) {
        return { ...r, siteNames: r.siteNames.filter((n) => n !== siteName) };
      }
      if (r.id === toRingId) {
        if (r.siteNames.includes(siteName)) return r;
        return { ...r, siteNames: [...r.siteNames, siteName] };
      }
      return r;
    });
    setRings(next);
    setCustomized(true);
  }

  if (rings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-fg">
          <Layers className="h-4 w-4" />
          Rings
        </h2>
        <div className="flex items-center gap-2">
          {customized && !locked && (
            <button
              onClick={() => setResetNonce((n) => n + 1)}
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-1.5 py-0.5 text-[11px] text-fg-muted hover:border-accent/40 hover:text-fg"
              title="Discard custom arrangement and re-apply the strategy"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to {strategy.name}
            </button>
          )}
          <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            Strategy
            <select
              value={ringStrategyId}
              onChange={(e) => setRingStrategyId(e.target.value)}
              disabled={locked}
              className="h-6 rounded-sm border border-border bg-bg px-1.5 text-[11px] disabled:opacity-60"
              title={locked ? "Locked while rollout is running" : strategy.description}
            >
              {RING_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setCompareOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
            title="Compare ring strategies inline"
          >
            Compare
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                compareOpen && "rotate-180",
              )}
            />
          </button>
        </div>
      </header>
      <p className="text-[11px] text-fg-subtle">
        {locked
          ? "Rollout in progress — staged order locked."
          : customized
            ? `Custom · based on ${strategy.name}. Drag sites between rings to refine.`
            : `${strategy.name} · ${strategy.tagline}. Drag sites between rings to customize.`}
      </p>

      {compareOpen && (
        <div className="space-y-2 rounded border border-border-subtle bg-bg-subtle p-2">
          <div className="grid gap-2 md:grid-cols-3">
            {RING_STRATEGIES.map((s) => (
              <CompareStrategyCard
                key={s.id}
                strategy={s}
                active={s.id === ringStrategyId}
                locked={locked}
                selectedSites={selectedSites}
                onSelect={() => setRingStrategyId(s.id)}
              />
            ))}
          </div>
          <div className="rounded border border-border-subtle bg-surface p-2.5 text-[11px] text-fg-muted">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
              How rings work here
            </p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>
                <span className="text-fg">Canary</span> is the smallest first ring. Dev sites
                are preferred when available — lower blast radius, faster to roll forward.
              </li>
              <li>
                <span className="text-fg">Waves</span> split the remaining sites, named
                &ldquo;Wave 1&rdquo; and &ldquo;Wave 2&rdquo;.
              </li>
              <li>
                Between every ring there&apos;s a <span className="text-fg">health-verify</span>{" "}
                dwell, then an explicit <span className="text-fg">gate</span> the operator
                advances.
              </li>
              <li>
                Strategies change <em>shape</em>, not behavior — pause/resume, health-verify,
                and blast-radius preview always apply. Drag sites between rings below for
                per-rollout tweaks.
              </li>
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        {rings.map((ring, idx) => (
          <RingCard
            key={ring.id}
            ring={ring}
            order={idx + 1}
            locked={locked}
            onMoveSite={moveSite}
          />
        ))}
      </div>
    </section>
  );
}

function RingCard({
  ring,
  order,
  locked,
  onMoveSite,
}: {
  ring: Ring;
  order: number;
  locked: boolean;
  onMoveSite: (siteName: string, fromRingId: string, toRingId: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  // Hover counter — dragenter/leave fire on child elements too; counting keeps
  // the highlight stable while the cursor moves over inner <li>s.
  const enterCount = useRef(0);

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (locked) return;
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }
  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    if (locked) return;
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    enterCount.current += 1;
    setHovering(true);
  }
  function onDragLeave() {
    enterCount.current = Math.max(0, enterCount.current - 1);
    if (enterCount.current === 0) setHovering(false);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    enterCount.current = 0;
    setHovering(false);
    if (locked) return;
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    try {
      const { siteName, fromRingId } = JSON.parse(raw) as DragPayload;
      onMoveSite(siteName, fromRingId, ring.id);
    } catch {
      /* malformed payload — ignore */
    }
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "rounded border bg-surface p-2.5 transition-colors",
        hovering && !locked
          ? "border-accent bg-accent-subtle/40 ring-1 ring-accent/40"
          : "border-border",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-fg">
          <span className="mr-1 text-fg-subtle">{order}.</span>
          {ring.name}
        </span>
        <Badge tone="neutral">{ring.siteNames.length} sites</Badge>
      </div>
      {ring.siteNames.length === 0 ? (
        <p className="rounded border border-dashed border-border-subtle px-2 py-3 text-center text-[11px] text-fg-subtle">
          {locked ? "—" : "Drop sites here"}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {ring.siteNames.map((n) => (
            <DraggableSite
              key={n}
              siteName={n}
              fromRingId={ring.id}
              locked={locked}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DraggableSite({
  siteName,
  fromRingId,
  locked,
}: {
  siteName: string;
  fromRingId: string;
  locked: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  function onDragStart(e: React.DragEvent<HTMLLIElement>) {
    if (locked) {
      e.preventDefault();
      return;
    }
    const payload: DragPayload = { siteName, fromRingId };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDragging(true);
  }
  function onDragEnd() {
    setDragging(false);
  }

  return (
    <li
      draggable={!locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-1 truncate rounded-sm px-1 py-0.5 font-mono text-[11px] text-fg-muted",
        locked
          ? "cursor-default"
          : "cursor-grab hover:bg-bg-subtle active:cursor-grabbing",
        dragging && "opacity-40",
      )}
      title={locked ? siteName : `${siteName} — drag to another ring`}
    >
      {!locked && (
        <GripVertical
          className="h-3 w-3 shrink-0 text-fg-subtle/70 group-hover:text-fg-muted"
          aria-hidden
        />
      )}
      <span className="truncate">{siteName}</span>
    </li>
  );
}

/* ─── inline strategy comparison ──────────────────────────────────────────── */

function CompareStrategyCard({
  strategy,
  active,
  locked,
  selectedSites,
  onSelect,
}: {
  strategy: RingStrategy;
  active: boolean;
  locked: boolean;
  selectedSites: FleetSite[];
  onSelect: () => void;
}) {
  // Preview the rings this strategy would build against the operator's
  // current selection. Empty when nothing is selected yet.
  const previewRings = useMemo(
    () =>
      planRollout(selectedSites, {
        canarySize: strategy.canarySize,
        waveCount: strategy.waveCount,
      }),
    [selectedSites, strategy.canarySize, strategy.waveCount],
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded border bg-surface p-2 text-[11px]",
        active ? "border-accent" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12px] font-semibold text-fg">{strategy.name}</span>
            {active && (
              <span className="text-[10px] uppercase tracking-wide text-accent">Active</span>
            )}
          </div>
          <p className="text-fg-muted">{strategy.tagline}</p>
        </div>
        <ToneChip tone={strategy.tone} />
      </div>

      <p className="text-fg-muted">{strategy.description}</p>

      <div className="rounded border border-border-subtle bg-bg-subtle p-1.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
          Preview · {selectedSites.length} site{selectedSites.length === 1 ? "" : "s"}
        </p>
        {previewRings.length === 0 ? (
          <p className="text-[11px] text-fg-subtle">Select sites above to preview ring shape.</p>
        ) : (
          <ul className="space-y-0.5">
            {previewRings.map((r, i) => (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-2 font-mono text-[11px] text-fg"
              >
                <span className="text-fg-subtle">{i + 1}.</span>
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-fg-muted">{r.siteNames.length}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-fg-subtle">
        <span>canary {strategy.canarySize}</span>
        <span>waves {strategy.waveCount}</span>
      </div>

      {!active && (
        <button
          onClick={onSelect}
          disabled={locked}
          className="self-start rounded-sm border border-border bg-bg px-1.5 py-0.5 text-[10px] text-fg-muted hover:border-accent hover:text-accent disabled:opacity-60"
          title={`Replan rings using ${strategy.name}`}
        >
          Use this strategy
        </button>
      )}
    </div>
  );
}

function ToneChip({ tone }: { tone: RingStrategy["tone"] }) {
  const cls =
    tone === "fast"
      ? "border-warning/30 bg-warning-subtle text-warning-fg"
      : tone === "cautious"
        ? "border-accent/30 bg-accent-subtle text-accent"
        : "border-border bg-bg-subtle text-fg-muted";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide",
        cls,
      )}
    >
      {tone}
    </span>
  );
}

