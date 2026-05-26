"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { RELEASES, DEFAULT_RELEASE } from "@/lib/fixtures/releases";
import { useFleet } from "@/lib/useFleet";
import type { AioRelease, AioReleaseId, FleetSite } from "@/lib/types";

/**
 * Screen 5 — Release catalog.
 *
 * Source of truth for what each AIO release line actually pins. Mirrors
 * context/scale-kit-real-yaml/aio-release-*.yaml. Shows:
 *   - All five releases (2512 → 2605) with default marker and fleet usage
 *   - Selected release: pinned versions + diff vs previous release
 *   - Sites currently on the selected release (drill back into /fleet)
 *
 * Vocabulary: release pin, AIO version, default release, drift. No component
 * editing here — releases are a Microsoft-owned catalog. Operators choose
 * which release a site pins to (via /sites or /upgrade).
 */
export default function ReleasesPage() {
  const fleet = useFleet();
  const sorted = useMemo(
    () => [...RELEASES].sort((a, b) => Number(b.id) - Number(a.id)),
    [],
  );
  const [selectedId, setSelectedId] = useState<AioReleaseId>(DEFAULT_RELEASE.id);
  const selected = useMemo(
    () => sorted.find((r) => r.id === selectedId) ?? sorted[0],
    [sorted, selectedId],
  );

  // index ascending so "previous" means a lower release number
  const ascending = useMemo(
    () => [...RELEASES].sort((a, b) => Number(a.id) - Number(b.id)),
    [],
  );
  const previous = useMemo(() => {
    const idx = ascending.findIndex((r) => r.id === selected.id);
    return idx > 0 ? ascending[idx - 1] : undefined;
  }, [ascending, selected.id]);

  const usageByRelease = useMemo(() => countSitesByRelease(fleet), [fleet]);
  const sitesOnSelected = useMemo(
    () => fleet.filter((fs) => fs.runtime.resolvedRelease === selected.id),
    [selected.id, fleet],
  );

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
        <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
          <Link href="/fleet" className="hover:text-accent">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-fg">Releases</span>
        </nav>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight text-fg">Releases</h1>
            <p className="text-[12px] text-fg-muted">
              Each release pins one set of compatible component versions. Sites pick a release;
              the manifest pipeline resolves the rest.
            </p>
          </div>
          <div className="text-right text-[12px] text-fg-muted">
            <div>
              <span className="font-semibold text-fg">{RELEASES.length}</span> releases ·{" "}
              <span className="font-semibold text-fg">{fleet.length}</span> sites
            </div>
            <div className="font-mono text-[11px]">
              default <span className="text-fg">{DEFAULT_RELEASE.id}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto max-w-[1200px]">
          {fleet.length === 0 && (
            <div className="mb-3 flex items-center gap-2 rounded border border-accent/30 bg-accent-subtle px-3 py-2 text-[12px] text-fg">
              <span className="font-semibold">No sites yet.</span>
              <span className="text-fg-muted">
                The catalog still shows what each release pins, but fleet usage and the
                &ldquo;sites on this release&rdquo; list stay empty until you add a site.
              </span>
              <Link href="/sites/new" className="ml-auto inline-flex items-center gap-1 text-accent hover:underline">
                Add a site
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* ── Left rail: release list ───────────────────────────────────── */}
          <aside className="rounded border border-border bg-surface">
            <header className="border-b border-border-subtle px-3 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                Release catalog
              </h2>
            </header>
            <ul className="divide-y divide-border-subtle">
              {sorted.map((r) => {
                const active = r.id === selected.id;
                const usage = usageByRelease[r.id] ?? 0;
                const isDefault = r.isDefault === true;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        active ? "bg-accent-subtle" : "hover:bg-bg-subtle",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-[14px] font-semibold",
                          active ? "text-accent" : "text-fg",
                        )}
                      >
                        {r.id}
                      </span>
                      {isDefault && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-accent-subtle px-1.5 py-px text-[10px] font-medium text-accent"
                          title="Default release for new sites"
                        >
                          <Star className="h-2.5 w-2.5" /> default
                        </span>
                      )}
                      <span className="ml-auto text-right text-[11px] text-fg-muted">
                        <div className="font-mono text-fg">{r.aioVersion}</div>
                        <div>
                          {usage === 0 ? (
                            <span className="text-fg-subtle">unused</span>
                          ) : (
                            <>
                              <span className="font-semibold text-fg">{usage}</span>{" "}
                              site{usage === 1 ? "" : "s"}
                            </>
                          )}
                        </div>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ── Right pane: selected release detail ──────────────────────── */}
          <div className="flex flex-col gap-4">
            <ReleaseHeader release={selected} usage={usageByRelease[selected.id] ?? 0} />
            <PinsTable release={selected} previous={previous} />
            <SitesOnRelease release={selected} sites={sitesOnSelected} />
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function ReleaseHeader({ release, usage }: { release: AioRelease; usage: number }) {
  const wikiUrl = `https://github.com/Azure/azure-iot-ops-cli-extension/wiki/IoT-Operations-versions#${release.id}`;
  const yamlPath = `context/scale-kit-real-yaml/aio-release-${release.id}.yaml`;
  return (
    <section className="rounded border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-[22px] font-semibold text-fg">{release.id}</h2>
            {release.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent">
                <Star className="h-3 w-3" /> default
              </span>
            )}
            <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-fg-muted">
              {release.aioTrain}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-fg-muted">
            AIO platform <span className="font-mono text-fg">{release.aioVersion}</span> · API{" "}
            <span className="font-mono text-fg">{release.aioApiVersion}</span> · ADR{" "}
            <span className="font-mono text-fg">{release.adrApiVersion}</span>
          </p>
        </div>
        <div className="text-right text-[12px] text-fg-muted">
          <div>
            <span className="font-semibold text-fg">{usage}</span> site{usage === 1 ? "" : "s"} on
            this release
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-fg-muted">
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          IoT Operations versions wiki <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-fg-subtle">·</span>
        <span className="font-mono">{yamlPath}</span>
      </div>
    </section>
  );
}

interface PinRow {
  label: string;
  field: keyof AioRelease;
  group: "AIO" | "API" | "Extensions";
}

const PIN_ROWS: PinRow[] = [
  { label: "AIO platform", field: "aioVersion", group: "AIO" },
  { label: "AIO train", field: "aioTrain", group: "AIO" },
  { label: "AIO API", field: "aioApiVersion", group: "API" },
  { label: "ADR API", field: "adrApiVersion", group: "API" },
  { label: "cert-manager", field: "certManagerVersion", group: "Extensions" },
  { label: "cert-manager train", field: "certManagerTrain", group: "Extensions" },
  { label: "secret-store", field: "secretStoreVersion", group: "Extensions" },
  { label: "secret-store train", field: "secretStoreTrain", group: "Extensions" },
];

function PinsTable({
  release,
  previous,
}: {
  release: AioRelease;
  previous: AioRelease | undefined;
}) {
  const groups: PinRow["group"][] = ["AIO", "API", "Extensions"];
  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Pinned versions
        </h3>
        {previous && (
          <div className="flex items-center gap-1 text-[11px] text-fg-muted">
            diff vs <span className="font-mono text-fg">{previous.id}</span>
          </div>
        )}
      </header>
      <table className="w-full text-[12px]">
        <thead className="bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
          <tr>
            <th className="w-[160px] px-3 py-1.5 font-medium">Component</th>
            <th className="px-3 py-1.5 font-medium">This release</th>
            {previous && <th className="px-3 py-1.5 font-medium">Previous ({previous.id})</th>}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g} className="divide-y divide-border-subtle">
              <tr className="bg-bg-subtle/50">
                <td
                  colSpan={previous ? 3 : 2}
                  className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle"
                >
                  {g}
                </td>
              </tr>
              {PIN_ROWS.filter((r) => r.group === g).map((row) => {
                const value = String(release[row.field] ?? "");
                const prevValue = previous ? String(previous[row.field] ?? "") : "";
                const changed = previous ? value !== prevValue : false;
                return (
                  <tr key={row.field} className="border-t border-border-subtle">
                    <td className="px-3 py-1.5 text-fg-muted">{row.label}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "font-mono",
                          changed ? "rounded bg-accent-subtle px-1.5 py-0.5 text-accent" : "text-fg",
                        )}
                      >
                        {value}
                      </span>
                    </td>
                    {previous && (
                      <td className="px-3 py-1.5">
                        <span
                          className={cn(
                            "font-mono text-[11px]",
                            changed ? "text-fg-subtle line-through" : "text-fg-subtle",
                          )}
                        >
                          {prevValue}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          ))}
      </table>
    </section>
  );
}

function SitesOnRelease({
  release,
  sites,
}: {
  release: AioRelease;
  sites: FleetSite[];
}) {
  if (sites.length === 0) {
    return (
      <section className="rounded border border-border bg-surface p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Sites on this release
        </h3>
        <p className="mt-2 text-[12px] text-fg-muted">
          No sites currently pinned to <span className="font-mono text-fg">{release.id}</span>.
          {release.isDefault
            ? " New sites added through /sites will land here by default."
            : ""}
        </p>
      </section>
    );
  }
  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Sites on this release
        </h3>
        <Link
          href={`/fleet?release=${release.id}`}
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
        >
          Open in Fleet <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <table className="w-full text-[12px]">
        <thead className="bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
          <tr>
            <th className="px-3 py-1.5 font-medium">Site</th>
            <th className="px-3 py-1.5 font-medium">Environment</th>
            <th className="px-3 py-1.5 font-medium">Health</th>
            <th className="px-3 py-1.5 font-medium">Last deploy</th>
            <th className="px-3 py-1.5 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sites.map((fs) => (
            <tr key={fs.site.name} className="hover:bg-bg-subtle">
              <td className="px-3 py-1.5 font-mono text-fg">{fs.site.name}</td>
              <td className="px-3 py-1.5 text-fg-muted">{fs.runtime.environment}</td>
              <td className="px-3 py-1.5">
                <HealthChip status={fs.runtime.health} />
              </td>
              <td className="px-3 py-1.5 font-mono text-[11px] text-fg-muted">
                {formatRelative(fs.runtime.lastDeployAt)}
              </td>
              <td className="px-3 py-1.5 text-right">
                <Link
                  href={`/rollout?site=${fs.site.name}`}
                  className="text-[11px] text-accent hover:underline"
                >
                  upgrade →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function HealthChip({ status }: { status: FleetSite["runtime"]["health"] }) {
  const tone =
    status === "healthy"
      ? "bg-success/15 text-success-fg"
      : status === "degraded"
        ? "bg-warning/15 text-warning-fg"
        : "bg-danger/15 text-danger-fg";
  return (
    <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium", tone)}>
      {status}
    </span>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countSitesByRelease(fleet: FleetSite[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const fs of fleet) {
    const id = fs.runtime.resolvedRelease;
    m[id] = (m[id] ?? 0) + 1;
  }
  return m;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const now = Date.now();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diffMs / day);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}
