"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Rocket,
  Beaker,
  Plug,
  KeyRound,
  Wrench,
  ShieldCheck,
  Workflow,
  Fingerprint,
  Package,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFleet } from "@/lib/useFleet";
import { useAppStore } from "@/store/useAppStore";
import { planRollout } from "@/lib/upgrade";
import { EmptyFleetCard } from "@/components/shell/EmptyFleetCard";
import {
  SOLUTIONS,
  SOLUTION_CATEGORIES,
  type AioSolution,
  type SolutionCategory,
} from "@/lib/fixtures/solutions";
import { getRingStrategy } from "@/lib/fixtures/strategies";

/**
 * Screen — AIO Solutions catalog.
 *
 * Per design decision 2026-05-28: today's "Apps" (Scale Kit samples/apps/)
 * and "Modules" (samples/modules/) collapse into one concept — AIO
 * Solutions — because they're the same transport (Scale Kit pipeline →
 * ARM) with different size / intent. Tag (`sample | module |
 * customer-authored`) is a label, not a type.
 *
 * Each card opens a detail panel with a recommended ring strategy and a
 * "Deploy with {strategy}" CTA that pre-loads /rollout with the payload
 * pre-filled. The underlying rollout kind (`app` vs `arm`) is dispatched
 * per-solution by the Solution itself — operator never sees it. Long-term
 * the two kinds collapse into a single `solution` kind (deferred with the
 * Changes model).
 */
export default function SolutionsPage() {
  const fleet = useFleet();

  if (fleet.length === 0) {
    return (
      <section className="flex h-full min-w-0 flex-col">
        <Header />
        <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
          <EmptyFleetCard
            title="No sites to roll AIO Solutions to"
            body="Solutions need at least one target site to be useful. Add a site first."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <Header />
      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
          <SolutionsCatalog fleet={fleet} />
        </div>
      </div>
    </section>
  );
}

/* ─── shell ───────────────────────────────────────────────────────────────── */

function Header() {
  const sampleCount = SOLUTIONS.filter((s) => s.tag === "sample").length;
  const moduleCount = SOLUTIONS.filter((s) => s.tag === "module").length;
  return (
    <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
      <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
        <Link href="/fleet" className="hover:text-accent">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-fg">AIO Solutions</span>
      </nav>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-fg">AIO Solutions</h1>
          <p className="text-[12px] text-fg-muted">
            ARM/Bicep-shaped bundles you can roll across sites — Scale Kit{" "}
            <span className="font-mono text-fg-subtle">samples/</span> today,
            customer-authored solutions over time. The{" "}
            <span className="font-mono text-fg-subtle">sample</span> /{" "}
            <span className="font-mono text-fg-subtle">module</span> distinction
            is a tag, not a separate concept.
          </p>
        </div>
        <div className="text-right text-[12px] text-fg-muted">
          <span className="font-semibold text-fg">{SOLUTIONS.length}</span> solutions ·{" "}
          {sampleCount} sample · {moduleCount} module
        </div>
      </div>
    </div>
  );
}

/* ─── catalog ─────────────────────────────────────────────────────────────── */

function SolutionsCatalog({ fleet }: { fleet: ReturnType<typeof useFleet> }) {
  const setRingStrategyId = useAppStore((s) => s.setRingStrategyId);
  const setRolloutKind = useAppStore((s) => s.setRolloutKind);
  const setRolloutAppId = useAppStore((s) => s.setRolloutAppId);
  const setRolloutArmId = useAppStore((s) => s.setRolloutArmId);
  const [category, setCategory] = useState<SolutionCategory | "all">("all");
  const [tag, setTag] = useState<"all" | "sample" | "module">("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = useMemo(() => {
    return SOLUTIONS.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (tag !== "all" && s.tag !== tag) return false;
      return true;
    });
  }, [category, tag]);
  const active = SOLUTIONS.find((s) => s.id === activeId) ?? null;

  const onDeploy = (sol: AioSolution) => {
    setRingStrategyId(sol.defaultRingStrategyId);
    setRolloutKind(sol.rolloutKind);
    if (sol.rolloutKind === "app") setRolloutAppId(sol.id);
    else setRolloutArmId(sol.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          options={SOLUTION_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          value={category}
          onChange={(v) => setCategory(v as typeof category)}
        />
        <span className="text-[10px] uppercase text-fg-subtle">tag</span>
        <FilterChips
          options={[
            { id: "all", label: "All" },
            { id: "sample", label: "Sample" },
            { id: "module", label: "Module" },
          ]}
          value={tag}
          onChange={(v) => setTag(v as typeof tag)}
        />
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          active && "lg:grid-cols-[1fr_360px]",
        )}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((sol) => (
            <SolutionCard
              key={sol.id}
              sol={sol}
              active={sol.id === activeId}
              onSelect={() => setActiveId((cur) => (cur === sol.id ? null : sol.id))}
            />
          ))}
          {visible.length === 0 && (
            <div className="rounded border border-dashed border-border p-6 text-center text-[12px] text-fg-subtle">
              No solutions match this filter.
            </div>
          )}
        </div>
        {active && (
          <aside className="space-y-3">
            <SolutionDetail
              sol={active}
              fleet={fleet}
              onDeploy={() => onDeploy(active)}
              onClose={() => setActiveId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── card + detail ───────────────────────────────────────────────────────── */

function SolutionCard({
  sol,
  active,
  onSelect,
}: {
  sol: AioSolution;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-2 rounded border bg-surface p-3 text-left transition-colors",
        active ? "border-accent" : "border-border hover:border-accent/40",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SolutionCategoryIcon category={sol.category} />
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-fg">{sol.name}</h3>
            <p className="text-[11px] text-fg-muted">{sol.tagline}</p>
          </div>
        </div>
        <TagChip tag={sol.tag} />
      </div>
      <div className="flex w-full items-center gap-1.5 text-[10px] text-fg-subtle">
        <ChipTag>{sol.category}</ChipTag>
        <span className="font-mono">{sol.repoPath}</span>
        {sol.estimatedDuration && (
          <span className="ml-auto text-fg-muted">{sol.estimatedDuration}</span>
        )}
      </div>
    </button>
  );
}

function SolutionDetail({
  sol,
  fleet,
  onDeploy,
  onClose,
}: {
  sol: AioSolution;
  fleet: ReturnType<typeof useFleet>;
  onDeploy: () => void;
  onClose: () => void;
}) {
  const strategy = getRingStrategy(sol.defaultRingStrategyId);
  const previewSites = useMemo(() => {
    if (sol.recommendedEnv === "any") return fleet;
    return fleet.filter((f) => f.runtime.environment === sol.recommendedEnv);
  }, [fleet, sol.recommendedEnv]);
  const rings = useMemo(
    () =>
      planRollout(previewSites, {
        canarySize: strategy.canarySize,
        waveCount: strategy.waveCount,
      }),
    [previewSites, strategy.canarySize, strategy.waveCount],
  );

  return (
    <div className="space-y-3 rounded border border-accent/40 bg-accent-subtle/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
          Selected solution · details
        </span>
        <button
          onClick={onClose}
          className="text-[10px] text-fg-subtle hover:text-accent"
          title="Close details panel"
        >
          close ×
        </button>
      </div>
      <header className="flex items-start gap-2 border-t border-accent/20 pt-3">
        <SolutionCategoryIcon category={sol.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[14px] font-semibold text-fg">{sol.name}</h2>
            <TagChip tag={sol.tag} />
          </div>
          <p className="text-[11px] text-fg-muted">{sol.tagline}</p>
        </div>
      </header>
      <p className="text-[12px] text-fg">{sol.description}</p>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
          What this solution {sol.tag === "module" ? "changes" : "deploys"}
        </p>
        <ul className="space-y-0.5 text-[12px] text-fg">
          {sol.creates.map((c) => (
            <li key={c} className="flex items-baseline gap-1.5">
              <span className="text-accent">·</span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      {sol.estimatedDuration && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Stat label="Category" value={sol.category} />
          <Stat label="Est. per site" value={sol.estimatedDuration} />
        </div>
      )}

      <div className="space-y-1 rounded border border-border-subtle bg-bg-subtle p-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            Recommended rollout
          </p>
          <span className="text-[10px] text-fg-subtle" title="Change on the Rollout page">
            change on Rollout
          </span>
        </div>
        <p className="text-[12px] text-fg">
          <span className="font-semibold">{strategy.name}</span>{" "}
          <span className="text-fg-muted">· {strategy.tagline}</span>
        </p>
        <p className="text-[11px] text-fg-subtle">
          Env: <span className="text-fg">{sol.recommendedEnv}</span> ·{" "}
          {previewSites.length} eligible site{previewSites.length === 1 ? "" : "s"} in fleet
        </p>
        {rings.length > 0 && (
          <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-fg">
            {rings.map((r, i) => (
              <li key={r.id} className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="text-fg-subtle">{i + 1}.</span> {r.name}
                </span>
                <span className="text-fg-muted">{r.siteNames.length} sites</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Link
          href="/rollout"
          onClick={onDeploy}
          className="inline-flex items-center justify-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg hover:bg-accent-hover"
        >
          <Rocket className="h-3.5 w-3.5" />
          Deploy with {strategy.name}
          <ArrowRight className="h-3 w-3" />
        </Link>
        <p className="text-center text-[10px] text-fg-subtle">
          Opens /rollout with this solution and the {strategy.name} strategy pre-selected. Pick sites there.
        </p>
      </div>
    </div>
  );
}

/* ─── primitives ──────────────────────────────────────────────────────────── */

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
            value === o.id
              ? "border-accent bg-accent-subtle text-accent"
              : "border-border bg-surface text-fg-muted hover:border-accent/40 hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border-subtle bg-bg-subtle px-2 py-1">
      <p className="text-[10px] uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="text-fg">{value}</p>
    </div>
  );
}

function ChipTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-bg-subtle px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-fg-muted">
      {children}
    </span>
  );
}

function TagChip({ tag }: { tag: AioSolution["tag"] }) {
  const tone =
    tag === "sample"
      ? "border-accent/40 text-accent"
      : tag === "module"
        ? "border-warning/50 text-warning"
        : "border-border text-fg-muted";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border bg-bg-subtle px-1.5 py-px text-[10px] font-medium uppercase tracking-wide",
        tone,
      )}
      title={
        tag === "sample"
          ? "samples/apps/ — helm-shaped, installs pods"
          : tag === "module"
            ? "samples/modules/ — ARM/Bicep, patches existing AIO resources"
            : "customer-authored solution"
      }
    >
      {tag}
    </span>
  );
}

/* ─── icons ───────────────────────────────────────────────────────────────── */

function SolutionCategoryIcon({ category }: { category: SolutionCategory }) {
  const Icon =
    category === "demo"
      ? Beaker
      : category === "connector"
        ? Plug
        : category === "secrets"
          ? KeyRound
          : category === "workload"
            ? Package
            : category === "dataflow"
              ? Workflow
              : category === "identity"
                ? Fingerprint
                : category === "role"
                  ? ShieldCheck
                  : Wrench;
  return <Icon className="h-4 w-4 shrink-0 text-accent" />;
}
