"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Package,
  Rocket,
  Beaker,
  Plug,
  KeyRound,
  Wrench,
  ShieldCheck,
  Workflow,
  Fingerprint,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFleet } from "@/lib/useFleet";
import { useAppStore } from "@/store/useAppStore";
import { planRollout } from "@/lib/upgrade";
import { EmptyFleetCard } from "@/components/shell/EmptyFleetCard";
import {
  SAMPLE_APPS,
  type SampleApp,
  type SampleAppKind,
} from "@/lib/fixtures/sampleApps";
import {
  ARM_MODULES,
  type ArmModule,
  type ArmModuleCategory,
} from "@/lib/fixtures/armModules";
import { getRingStrategy, DEFAULT_RING_STRATEGY_ID } from "@/lib/fixtures/strategies";

/**
 * Screen — Apps & Modules.
 *
 * Two stacked sections sharing one IA, because both are "things you can
 * roll out":
 *
 *   • Apps    — Scale Kit `samples/apps/` workloads (Helm-shaped). A deploy
 *               installs pods, has its own version lifecycle.
 *   • Modules — Scale Kit `samples/modules/` post-deployment ARM/Bicep
 *               changes (rotate cert, add dataflow profile, register trust
 *               chain). A deploy patches existing AIO resources, one-shot.
 *
 * Each card opens a per-section detail panel with a recommended ring
 * strategy + a "Deploy/Apply with {strategy}" CTA that pre-loads /rollout
 * (kind=app or kind=arm, payload id, ring strategy) so the operator lands
 * on Rollout with the picker pre-filled. Inline (non-tabbed) so an operator
 * scanning "what can I roll out?" sees both at once. Browse surface only.
 */

export default function CatalogPage() {
  const fleet = useFleet();

  if (fleet.length === 0) {
    return (
      <section className="flex h-full min-w-0 flex-col">
        <Header />
        <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
          <EmptyFleetCard
            title="No sites to roll apps or modules to"
            body="Both Apps (Helm workloads) and Modules (post-deployment Bicep changes) need at least one target site to be useful. Add a site first."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <Header />
      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
          <SectionHeader
            icon={Package}
            title="Apps"
            count={SAMPLE_APPS.length}
            hint={
              <>
                Scale Kit{" "}
                <span className="font-mono text-fg-subtle">samples/apps/</span>{" "}
                workloads (Helm-shaped, install pods).
              </>
            }
          />
          <AppsTab fleet={fleet} />
          <SectionHeader
            icon={Wrench}
            title="Modules"
            count={ARM_MODULES.length}
            hint={
              <>
                Scale Kit{" "}
                <span className="font-mono text-fg-subtle">samples/modules/</span>{" "}
                post-deployment changes (ARM/Bicep, patch existing resources).
              </>
            }
          />
          <ModulesTab fleet={fleet} />
        </div>
      </div>
    </section>
  );
}

/* ─── shell ───────────────────────────────────────────────────────────────── */

function Header() {
  return (
    <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
      <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
        <Link href="/fleet" className="hover:text-accent">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-fg">Apps &amp; Modules</span>
      </nav>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-fg">Apps &amp; Modules</h1>
          <p className="text-[12px] text-fg-muted">
            Browse what you can roll out. <span className="text-fg">Apps</span> are
            Helm-shaped workloads that install pods.{" "}
            <span className="text-fg">Modules</span> are post-deployment ARM/Bicep
            changes that patch existing resources.
          </p>
        </div>
        <div className="text-right text-[12px] text-fg-muted">
          <span className="font-semibold text-fg">{SAMPLE_APPS.length}</span> apps ·{" "}
          <span className="font-semibold text-fg">{ARM_MODULES.length}</span> modules
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  hint: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-1.5">
      <div className="flex items-baseline gap-2">
        <Icon className="h-4 w-4 self-center text-fg-subtle" />
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        <span className="text-[11px] text-fg-subtle">({count})</span>
      </div>
      <p className="text-[11px] text-fg-muted">{hint}</p>
    </div>
  );
}

/* ─── apps tab ────────────────────────────────────────────────────────────── */

function AppsTab({ fleet }: { fleet: ReturnType<typeof useFleet> }) {
  const setRingStrategyId = useAppStore((s) => s.setRingStrategyId);
  const setRolloutKind = useAppStore((s) => s.setRolloutKind);
  const setRolloutAppId = useAppStore((s) => s.setRolloutAppId);
  const [filter, setFilter] = useState<"all" | SampleAppKind>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? SAMPLE_APPS : SAMPLE_APPS.filter((a) => a.kind === filter)),
    [filter],
  );
  const active = SAMPLE_APPS.find((a) => a.id === activeId) ?? null;

  const filters: Array<{ id: "all" | SampleAppKind; label: string }> = [
    { id: "all", label: "All" },
    { id: "demo", label: "Demo" },
    { id: "connector", label: "Connectors" },
    { id: "secrets", label: "Secrets" },
    { id: "workload", label: "Workloads" },
  ];

  return (
    <div className="space-y-3">
      <FilterChips
        options={filters}
        value={filter}
        onChange={(v) => setFilter(v as typeof filter)}
      />
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          active && "lg:grid-cols-[1fr_360px]",
        )}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              active={app.id === activeId}
              onSelect={() => setActiveId((cur) => (cur === app.id ? null : app.id))}
            />
          ))}
          {visible.length === 0 && <EmptyFilter kind="apps" />}
        </div>
        {active && (
          <aside className="space-y-3">
            <AppDetail
              app={active}
              fleet={fleet}
              onDeploy={() => {
                setRingStrategyId(active.defaultRingStrategyId);
                setRolloutKind("app");
                setRolloutAppId(active.id);
              }}
              onClose={() => setActiveId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── modules tab ─────────────────────────────────────────────────────────── */

function ModulesTab({ fleet }: { fleet: ReturnType<typeof useFleet> }) {
  const setRingStrategyId = useAppStore((s) => s.setRingStrategyId);
  const setRolloutKind = useAppStore((s) => s.setRolloutKind);
  const setRolloutArmId = useAppStore((s) => s.setRolloutArmId);
  const [filter, setFilter] = useState<"all" | ArmModuleCategory>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "all" ? ARM_MODULES : ARM_MODULES.filter((m) => m.category === filter),
    [filter],
  );
  const active = ARM_MODULES.find((m) => m.id === activeId) ?? null;

  const filters: Array<{ id: "all" | ArmModuleCategory; label: string }> = [
    { id: "all", label: "All" },
    { id: "dataflow", label: "Dataflow" },
    { id: "connector", label: "Connectors" },
    { id: "secret", label: "Secrets" },
    { id: "identity", label: "Identity" },
    { id: "role", label: "Roles" },
  ];

  return (
    <div className="space-y-3">
      <FilterChips
        options={filters}
        value={filter}
        onChange={(v) => setFilter(v as typeof filter)}
      />
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          active && "lg:grid-cols-[1fr_360px]",
        )}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              active={mod.id === activeId}
              onSelect={() => setActiveId((cur) => (cur === mod.id ? null : mod.id))}
            />
          ))}
          {visible.length === 0 && <EmptyFilter kind="modules" />}
        </div>
        {active && (
          <aside className="space-y-3">
            <ModuleDetail
              module={active}
              fleet={fleet}
              onApply={() => {
                setRingStrategyId(DEFAULT_RING_STRATEGY_ID);
                setRolloutKind("arm");
                setRolloutArmId(active.id);
              }}
              onClose={() => setActiveId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── shared bits ─────────────────────────────────────────────────────────── */

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
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

function EmptyFilter({ kind }: { kind: "apps" | "modules" }) {
  return (
    <div className="rounded border border-dashed border-border p-6 text-center text-[12px] text-fg-subtle">
      No {kind} match this filter.
    </div>
  );
}

/* ─── apps: card + detail ─────────────────────────────────────────────────── */

function AppCard({
  app,
  active,
  onSelect,
}: {
  app: SampleApp;
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
          <AppKindIcon kind={app.kind} />
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-fg">{app.name}</h3>
            <p className="text-[11px] text-fg-muted">{app.tagline}</p>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center gap-1.5 text-[10px] text-fg-subtle">
        <ChipTag>{app.kind}</ChipTag>
        <span className="font-mono">{app.repoPath}</span>
      </div>
    </button>
  );
}

function AppDetail({
  app,
  fleet,
  onDeploy,
  onClose,
}: {
  app: SampleApp;
  fleet: ReturnType<typeof useFleet>;
  onDeploy: () => void;
  onClose: () => void;
}) {
  const strategy = getRingStrategy(app.defaultRingStrategyId);
  const previewSites = useMemo(() => {
    if (app.recommendedEnv === "any") return fleet;
    return fleet.filter((f) => f.runtime.environment === app.recommendedEnv);
  }, [fleet, app.recommendedEnv]);
  const rings = useMemo(
    () =>
      planRollout(previewSites, {
        canarySize: strategy.canarySize,
        waveCount: strategy.waveCount,
      }),
    [previewSites, strategy.canarySize, strategy.waveCount],
  );

  return (
    <DetailShell
      eyebrow="Selected app · details"
      icon={<AppKindIcon kind={app.kind} />}
      name={app.name}
      tagline={app.tagline}
      description={app.description}
      onClose={onClose}
    >
      <DetailList title="What this app deploys" items={app.creates} />

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
          Env: <span className="text-fg">{app.recommendedEnv}</span> ·{" "}
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

      <DeployCta
        label={`Deploy with ${strategy.name}`}
        onClick={onDeploy}
        hint={`Opens /rollout with this app and the ${strategy.name} strategy pre-selected. Pick sites there.`}
      />
    </DetailShell>
  );
}

/* ─── modules: card + detail ──────────────────────────────────────────────── */

function ModuleCard({
  module: mod,
  active,
  onSelect,
}: {
  module: ArmModule;
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
          <ModuleCategoryIcon category={mod.category} />
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-fg">{mod.name}</h3>
            <p className="text-[11px] text-fg-muted">{mod.tagline}</p>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center gap-1.5 text-[10px] text-fg-subtle">
        <ChipTag>{mod.category}</ChipTag>
        <span className="font-mono">{mod.repoPath}</span>
        <span className="ml-auto text-fg-muted">{mod.estimatedDuration}</span>
      </div>
    </button>
  );
}

function ModuleDetail({
  module: mod,
  fleet,
  onApply,
  onClose,
}: {
  module: ArmModule;
  fleet: ReturnType<typeof useFleet>;
  onApply: () => void;
  onClose: () => void;
}) {
  // Modules don't carry a recommendedEnv; default to fleet-wide and use the
  // default ring strategy. Operator picks the actual scope on /rollout.
  const strategy = getRingStrategy(DEFAULT_RING_STRATEGY_ID);
  const rings = useMemo(
    () =>
      planRollout(fleet, {
        canarySize: strategy.canarySize,
        waveCount: strategy.waveCount,
      }),
    [fleet, strategy.canarySize, strategy.waveCount],
  );

  return (
    <DetailShell
      eyebrow="Selected module · details"
      icon={<ModuleCategoryIcon category={mod.category} />}
      name={mod.name}
      tagline={mod.tagline}
      description={mod.description}
      onClose={onClose}
    >
      <DetailList title="What this module changes" items={mod.changes} />

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Stat label="Category" value={mod.category} />
        <Stat label="Est. per site" value={mod.estimatedDuration} />
      </div>

      <div className="space-y-1 rounded border border-border-subtle bg-bg-subtle p-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            Default rollout
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
          Modules apply across whichever scope you pick on Rollout. Preview below is
          fleet-wide ({fleet.length} site{fleet.length === 1 ? "" : "s"}).
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

      <DeployCta
        label={`Apply with ${strategy.name}`}
        onClick={onApply}
        hint={`Opens /rollout with this module and the ${strategy.name} strategy pre-selected. Pick sites there.`}
      />
    </DetailShell>
  );
}

/* ─── shared detail primitives ────────────────────────────────────────────── */

function DetailShell({
  eyebrow,
  icon,
  name,
  tagline,
  description,
  onClose,
  children,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  name: string;
  tagline: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded border border-accent/40 bg-accent-subtle/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
          {eyebrow}
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
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-fg">{name}</h2>
          <p className="text-[11px] text-fg-muted">{tagline}</p>
        </div>
      </header>
      <p className="text-[12px] text-fg">{description}</p>
      {children}
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </p>
      <ul className="space-y-0.5 text-[12px] text-fg">
        {items.map((c) => (
          <li key={c} className="flex items-baseline gap-1.5">
            <span className="text-accent">·</span>
            {c}
          </li>
        ))}
      </ul>
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

function DeployCta({
  label,
  onClick,
  hint,
}: {
  label: string;
  onClick: () => void;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <Link
        href="/rollout"
        onClick={onClick}
        className="inline-flex items-center justify-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg hover:bg-accent-hover"
      >
        <Rocket className="h-3.5 w-3.5" />
        {label}
        <ArrowRight className="h-3 w-3" />
      </Link>
      <p className="text-center text-[10px] text-fg-subtle">{hint}</p>
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

/* ─── icons ───────────────────────────────────────────────────────────────── */

function AppKindIcon({ kind }: { kind: SampleAppKind }) {
  const Icon =
    kind === "demo"
      ? Beaker
      : kind === "connector"
        ? Plug
        : kind === "secrets"
          ? KeyRound
          : Package;
  return <Icon className="h-4 w-4 shrink-0 text-accent" />;
}

function ModuleCategoryIcon({ category }: { category: ArmModuleCategory }) {
  const Icon =
    category === "dataflow"
      ? Workflow
      : category === "connector"
        ? Plug
        : category === "secret"
          ? ShieldCheck
          : category === "identity"
            ? Fingerprint
            : Wrench;
  return <Icon className="h-4 w-4 shrink-0 text-accent" />;
}
