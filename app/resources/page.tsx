// Resources screen — mocked DoEGit-style table backed by the clone JSON.
//
// Concept-only: all action buttons (Push to GitHub PR/Direct, Deploy to ARM,
// Refresh) toast or no-op. Data comes from `lib/fixtures/aioResources.ts`
// which flattens an `az iot ops clone` export of a real AIO instance.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Clock,
  GitPullRequest,
  Layers,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ResourceDetailDrawer } from "@/components/resources/ResourceDetailDrawer";
import {
  AIO_RESOURCES,
  AIO_RESOURCE_RG,
  RESOURCE_CATEGORIES,
  type AioResource,
  type AioResourceCategory,
} from "@/lib/fixtures/aioResources";
import { FLEET } from "@/lib/fixtures/sites";
import { useAppStore } from "@/store/useAppStore";

type Filter = "All" | AioResourceCategory;

export default function ResourcesPage() {
  const fleetRepo = useAppStore((s) => s.fleetRepo);
  const searchParams = useSearchParams();
  const siteParam = searchParams?.get("site") ?? null;

  const [filter, setFilter] = useState<Filter>("All");
  const [driftOnly, setDriftOnly] = useState(false);
  const [driftSource, setDriftSource] = useState<"snapshot" | "live">(
    "snapshot",
  );
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState<string | null>(siteParam);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const [openResource, setOpenResource] = useState<AioResource | null>(null);

  // Keep state in sync if the URL changes (e.g. via the SiteDetailDrawer link).
  useEffect(() => {
    setSiteFilter(siteParam);
  }, [siteParam]);

  const allSiteNames = useMemo(() => FLEET.map((f) => f.site.name).sort(), []);

  // Apply the site scope first so chip counts reflect the current site.
  const siteScoped = useMemo(() => {
    if (!siteFilter) return AIO_RESOURCES;
    return AIO_RESOURCES.filter((r) => r.owningSites.includes(siteFilter));
  }, [siteFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: siteScoped.length };
    for (const r of siteScoped) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [siteScoped]);

  const driftCount = useMemo(
    () => siteScoped.filter((r) => r.syncStatus === "drift").length,
    [siteScoped],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return siteScoped.filter((r) => {
      if (driftOnly && r.syncStatus !== "drift") return false;
      if (filter !== "All" && r.category !== filter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.displayType.toLowerCase().includes(q) ||
        r.armType.toLowerCase().includes(q)
      );
    });
  }, [siteScoped, filter, driftOnly, query]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((r) => selected.has(r.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filtered) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filtered) next.add(r.id);
        return next;
      });
    }
  }

  function flashAction(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2400);
  }

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected =
    filtered.some((r) => selected.has(r.id)) && !allSelected;
  const selectedCount = selected.size;
  const driftSelectedCount = useMemo(() => {
    let n = 0;
    for (const r of AIO_RESOURCES) {
      if (selected.has(r.id) && r.syncStatus === "drift") n++;
    }
    return n;
  }, [selected]);
  const repoLabel = fleetRepo.selectedRepo ?? "(no fleet repo configured)";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Layers className="h-3 w-3" />
            Concept · Mocked from clone JSON
          </div>
          <h1 className="text-[18px] font-semibold text-fg">Resources</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-fg-muted">
            Azure IoT Operations ARM resources for one instance. Select rows
            to commit to your fleet repo as Bicep, or deploy repo-side Bicep
            back to ARM. Read-only prototype — actions are no-ops; data is
            a fixture from{" "}
            <span className="font-mono">az iot ops clone</span>; drift values
            are synthetic.
          </p>
        </div>
        <div className="shrink-0 text-right text-[12px] text-fg-muted">
          <div>
            Source:{" "}
            <span className="font-mono text-fg">
              {AIO_RESOURCE_RG} / aio-165220922
            </span>
          </div>
          <div>
            Fleet repo:{" "}
            <Link href="/connect" className="text-accent underline">
              {repoLabel}
            </Link>
          </div>
          <div>
            Bicep path:{" "}
            <span className="font-mono text-fg">{fleetRepo.bicepPath}</span>
          </div>
        </div>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === "All" && !driftOnly}
          onClick={() => {
            setFilter("All");
            setDriftOnly(false);
          }}
          label="All"
          count={counts.All}
        />
        {RESOURCE_CATEGORIES.filter((c) => counts[c] > 0).map((c) => (
          <FilterChip
            key={c}
            active={filter === c && !driftOnly}
            onClick={() => {
              setFilter(c);
              setDriftOnly(false);
            }}
            label={c}
            count={counts[c] ?? 0}
          />
        ))}
        <DriftChip
          active={driftOnly}
          count={driftCount}
          onClick={() => setDriftOnly((v) => !v)}
        />
        <SiteFilterControl
          siteNames={allSiteNames}
          value={siteFilter}
          onChange={setSiteFilter}
        />
        <div className="ml-auto flex items-center gap-3">
          <DriftSourcePill
            mode={driftSource}
            onSwitch={(next) => {
              setDriftSource(next);
              if (next === "live") {
                flashAction(
                  "Mock: would request Azure subscription access to read live ARM state",
                );
              }
            }}
          />
          <div className="w-64">
            <Input
              placeholder="Search resources…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-accent-subtle/50 px-3 py-2">
        <div className="text-[12px] font-medium text-fg">
          {selectedCount === 0 ? (
            <span className="text-fg-muted">No selection</span>
          ) : (
            <span>{selectedCount} selected</span>
          )}
          {flash && (
            <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" />
              {flash}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="subtle"
            size="sm"
            disabled={selectedCount === 0}
            onClick={() =>
              flashAction(
                `Mock: opened PR with ${selectedCount} resource${selectedCount === 1 ? "" : "s"} to ${fleetRepo.selectedRepo ?? "<repo>"}`,
              )
            }
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            Push to GitHub (PR)
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={selectedCount === 0}
            onClick={() =>
              flashAction(
                `Mock: direct commit of ${selectedCount} resource${selectedCount === 1 ? "" : "s"} to ${fleetRepo.branch}`,
              )
            }
          >
            <Upload className="h-3.5 w-3.5" />
            Push to GitHub (Direct)
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={selectedCount === 0}
            onClick={() =>
              flashAction(
                `Mock: queued ARM deployment for ${selectedCount} resource${selectedCount === 1 ? "" : "s"}`,
              )
            }
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy to ARM
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={driftSelectedCount === 0}
            onClick={() =>
              flashAction(
                `Mock: opened reconcile PR for ${driftSelectedCount} drifted resource${driftSelectedCount === 1 ? "" : "s"} to ${fleetRepo.selectedRepo ?? "<repo>"}`,
              )
            }
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Reconcile drift
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => flashAction("Mock: refreshed (fixture data only)")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-bg-subtle text-[11px] uppercase tracking-wide text-fg-subtle">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all visible"
                />
              </th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Resource group</Th>
              <Th>Location</Th>
              <Th>State</Th>
              <Th>Sync</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <ResourceRow
                key={r.id}
                r={r}
                checked={selected.has(r.id)}
                onToggle={() => toggleRow(r.id)}
                onOpen={() => setOpenResource(r)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-fg-muted"
                >
                  No resources match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-fg-subtle">
        <div>
          Showing {filtered.length} of {siteScoped.length} resources
          {siteFilter && (
            <span className="ml-1 text-fg-muted">
              (scoped to <span className="font-mono text-fg">{siteFilter}</span>;{" "}
              {AIO_RESOURCES.length} total in the instance)
            </span>
          )}
          {siteFilter && (
            <span className="ml-2 italic">
              Site mapping is synthetic for this preview.
            </span>
          )}
        </div>
        <div>{selectedCount} selected</div>
      </div>

      <NoteCard />
      </div>
      <ResourceDetailDrawer
        resource={openResource}
        bicepRoot={fleetRepo.bicepPath}
        fleetRepo={fleetRepo.selectedRepo}
        branch={fleetRepo.branch}
        onClose={() => setOpenResource(null)}
      />
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border-strong bg-surface text-fg hover:border-accent hover:text-accent"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-semibold ${
          active ? "bg-accent-fg/20 text-accent-fg" : "bg-bg-muted text-fg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SiteFilterControl({
  siteNames,
  value,
  onChange,
}: {
  siteNames: string[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  if (value) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-subtle px-2 py-0.5 text-[12px] font-medium text-accent">
        <span className="text-[10px] uppercase tracking-wide opacity-80">Site</span>
        <span className="font-mono">{value}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear site filter"
          className="rounded-full p-0.5 hover:bg-accent/15"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <label
      className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[12px] text-fg-muted hover:border-accent"
      title="Filter resources by which fleet site consumes them"
    >
      <span className="text-[10px] uppercase tracking-wide">Site</span>
      <select
        value=""
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-transparent text-[12px] text-fg outline-none"
      >
        <option value="">All sites</option>
        {siteNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

function DriftSourcePill({
  mode,
  onSwitch,
}: {
  mode: "snapshot" | "live";
  onSwitch: (next: "snapshot" | "live") => void;
}) {
  const isLive = mode === "live";
  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-subtle px-2 py-1 text-[11px]"
      title="Where the drift comparison comes from. Snapshot = CI-exported state in the repo. Live = on-demand ARM read (requires Azure auth)."
    >
      <span className="font-medium uppercase tracking-wide text-fg-subtle">
        Drift source
      </span>
      <div className="inline-flex items-center rounded border border-border-strong bg-surface p-0.5">
        <PillSegment
          active={!isLive}
          onClick={() => onSwitch("snapshot")}
          icon={<Clock className="h-3 w-3" />}
        >
          CI snapshot <span className="opacity-70">· 4h ago</span>
        </PillSegment>
        <PillSegment
          active={isLive}
          onClick={() => onSwitch("live")}
          icon={isLive ? <Zap className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
        >
          {isLive ? (
            <>
              Live from Azure <span className="opacity-70">· just now</span>
            </>
          ) : (
            <>Connect Azure for live</>
          )}
        </PillSegment>
      </div>
    </div>
  );
}

function PillSegment({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
        active
          ? "border border-border-strong bg-surface text-accent shadow-sm"
          : "border border-transparent text-fg-muted hover:bg-bg-muted hover:text-fg"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-semibold">{children}</th>;
}

function DriftChip({
  active,
  count,
  onClick,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Show only resources whose live state differs from the fleet repo"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? "border-warning bg-warning/15 text-warning"
          : "border-warning/40 bg-surface text-warning hover:bg-warning/10"
      }`}
    >
      <AlertTriangle className="h-3 w-3" />
      Drift only
      <span
        className={`rounded-full px-1.5 text-[10px] font-semibold ${
          active ? "bg-warning/25 text-warning" : "bg-warning/15 text-warning"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SyncBadge({ status }: { status: AioResource["syncStatus"] }) {
  if (status === "drift") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
        <AlertTriangle className="h-3 w-3" />
        Drift
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      In sync
    </span>
  );
}

function ResourceRow({
  r,
  checked,
  onToggle,
  onOpen,
}: {
  r: AioResource;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <tr className="border-t border-border align-top hover:bg-bg-subtle/60">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select ${r.name}`}
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-left font-mono text-[12px] text-fg hover:text-accent hover:underline"
        >
          {r.name}
        </button>
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent">
          {r.displayType}
        </span>
        <div className="mt-0.5 font-mono text-[10px] text-fg-subtle">
          {r.armType}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">{r.resourceGroup}</td>
      <td className="whitespace-nowrap px-3 py-2 text-fg-muted">{r.location}</td>
      <td className="px-3 py-2">
        <span className="font-semibold text-success">{r.state}</span>
      </td>
      <td className="px-3 py-2">
        <SyncBadge status={r.syncStatus} />
      </td>
    </tr>
  );
}

function NoteCard() {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-subtle p-4 text-[12px] leading-relaxed text-fg-muted">
      <div className="mb-1 font-semibold text-fg">What&apos;s mocked vs real</div>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          Rows are flattened from a real{" "}
          <span className="font-mono">az iot ops clone</span> export
          (context/clone_aio-165220922_aio.json) — names and ARM types are
          authentic.
        </li>
        <li>
          Resource Group is read from the clone metadata; Location and State
          are synthetic placeholders.
        </li>
        <li>
          All four actions are no-ops that flash a toast. The real workflow
          would: Bicep-emit selected resources → commit to{" "}
          <span className="font-mono">{"<bicepPath>"}</span> → PR or direct push;
          or read repo Bicep → call ARM deployments.
        </li>
        <li>
          Drift detection (live ARM vs repo Bicep) is the missing fifth action
          and the highest-value capability for day-2 operators.
        </li>
      </ul>
    </div>
  );
}
