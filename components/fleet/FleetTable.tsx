"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FleetSite } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { ExternalLink, Rocket } from "lucide-react";
import { VersionBadge } from "./VersionBadge";
import { HealthDot } from "./HealthDot";
import { EnvPill } from "./EnvPill";
import { filterBySelector, buildLabelIndex } from "@/lib/selector";
import { FACTORY_DISPLAY, siteDisplayName } from "@/lib/fixtures/sites";
import { getRingStrategy } from "@/lib/fixtures/strategies";
import { getFleetRingAssignment, ringTone } from "@/lib/rings";
import { Badge } from "@/components/ui/Badge";

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.round(days / 30);
  return `${months} mo ago`;
}

export function FleetTable({ fleet }: { fleet: FleetSite[] }) {
  const router = useRouter();
  const selectedSiteNames = useAppStore((s) => s.selectedSiteNames);
  const toggleSiteSelected = useAppStore((s) => s.toggleSiteSelected);
  const setSelectedSiteNames = useAppStore((s) => s.setSelectedSiteNames);
  const setRolloutKind = useAppStore((s) => s.setRolloutKind);
  const filterEnv = useAppStore((s) => s.filterEnv);
  const filterRelease = useAppStore((s) => s.filterRelease);
  const selectorText = useAppStore((s) => s.selectorText);
  const versionOverrides = useAppStore((s) => s.versionOverrides);
  const ringStrategyId = useAppStore((s) => s.ringStrategyId);
  const rolloutStatus = useAppStore((s) => s.rolloutStatus);
  const siteStatus = useAppStore((s) => s.siteStatus);

  const labelIndex = useMemo(() => buildLabelIndex(fleet), [fleet]);
  const ringAssignment = useMemo(
    () => getFleetRingAssignment(fleet, getRingStrategy(ringStrategyId)),
    [fleet, ringStrategyId],
  );

  const rolloutInFlight = rolloutStatus === "running" || rolloutStatus === "paused" || rolloutStatus === "awaiting-gate";
  const inFlightForSite = (name: string) => {
    if (!rolloutInFlight) return null;
    const s = siteStatus[name];
    if (s === "pending" || s === "upgrading" || s === "verifying") return s;
    return null;
  };

  const rows = useMemo(() => {
    let r = fleet;
    if (filterEnv !== "all") r = r.filter((f) => f.runtime.environment === filterEnv);
    if (filterRelease !== "all") r = r.filter((f) => f.runtime.resolvedRelease === filterRelease);
    if (selectorText.trim()) r = filterBySelector(r, selectorText, labelIndex);
    return r;
  }, [fleet, filterEnv, filterRelease, selectorText, labelIndex]);

  const allSelected = rows.length > 0 && rows.every((r) => selectedSiteNames.includes(r.site.name));
  const someSelected =
    rows.some((r) => selectedSiteNames.includes(r.site.name)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedSiteNames(
        selectedSiteNames.filter((n) => !rows.some((r) => r.site.name === n)),
      );
    } else {
      const merged = new Set(selectedSiteNames);
      rows.forEach((r) => merged.add(r.site.name));
      setSelectedSiteNames([...merged]);
    }
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-bg-subtle text-left text-fg-muted">
            <th className="w-8 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </th>
            <th className="px-2 py-2 font-semibold">Name</th>
            <th className="px-2 py-2 font-semibold">Env</th>
            <th className="px-2 py-2 font-semibold">AIO release</th>
            <th className="px-2 py-2 font-semibold">
              <Link
                href="/rings"
                className="inline-flex items-center gap-1 text-fg-muted hover:text-accent hover:underline"
                title="Ring assignment is computed from the active strategy on /rings"
              >
                Ring
              </Link>
            </th>
            <th className="px-2 py-2 font-semibold">Health</th>
            <th className="px-2 py-2 font-semibold">Region</th>
            <th className="px-2 py-2 font-semibold">Resource group</th>
            <th className="px-2 py-2 font-semibold">Last deploy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((fs) => {
            const checked = selectedSiteNames.includes(fs.site.name);
            const notInstalled = fs.runtime.aioInstalled === false;
            return (
              <tr
                key={fs.site.name}
                className={cn(
                  "group border-b border-border-subtle hover:bg-bg-subtle/60 cursor-pointer",
                  checked && "bg-accent-subtle/60 hover:bg-accent-subtle/80",
                  notInstalled && "bg-bg-subtle/30 text-fg-muted italic",
                )}
                onClick={() => toggleSiteSelected(fs.site.name)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSiteSelected(fs.site.name)}
                    aria-label={`Select ${fs.site.name}`}
                  />
                </td>
                <td className="px-2 py-2 font-medium">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/fleet?site=${encodeURIComponent(fs.site.name)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-left text-fg hover:text-accent hover:underline"
                        title="Open site detail"
                      >
                        {fs.runtime.environment === "prod"
                          ? (FACTORY_DISPLAY[fs.resolvedLabels.plant] ?? fs.site.name)
                          : "Shared dev environment"}
                      </Link>
                      <span className="text-[11px] text-fg-subtle">
                        <span className="uppercase tracking-wide">
                          {fs.runtime.environment === "prod" ? "Factory" : "Shared dev"}
                        </span>
                        <span className="mx-1 opacity-60">·</span>
                        {siteDisplayName(fs.resolvedLabels.factorySite, fs.resolvedLabels.country)}
                        <span className="mx-1 opacity-60">·</span>
                        <span className="font-mono normal-case">{fs.site.name}</span>
                      </span>
                      {inFlightForSite(fs.site.name) && (
                        <Link
                          href="/rollout"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 inline-flex w-fit items-center gap-1 rounded-sm border border-accent/40 bg-accent-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent hover:border-accent"
                          title="This site is part of an in-flight rollout. Click to open Rollout."
                        >
                          <Rocket className="h-2.5 w-2.5" />
                          In rollout · {inFlightForSite(fs.site.name)}
                        </Link>
                      )}
                    </div>
                    <DeepLinks site={fs} />
                  </div>
                </td>
                <td className="px-2 py-2">
                  <EnvPill env={fs.runtime.environment} />
                </td>
                <td className="px-2 py-2">
                  {notInstalled ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRolloutKind("install");
                        setSelectedSiteNames([fs.site.name]);
                        router.push("/rollout");
                      }}
                      className="inline-flex items-center gap-1 rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted hover:border-accent hover:text-accent"
                      title="Install AIO on this declared site"
                    >
                      <Rocket className="h-3 w-3" />
                      Install AIO
                    </button>
                  ) : (
                    <VersionBadge id={versionOverrides[fs.site.name] ?? fs.runtime.resolvedRelease} />
                  )}
                </td>
                <td className="px-2 py-2">
                  {notInstalled ? (
                    <span className="text-[11px] text-fg-subtle">—</span>
                  ) : ringAssignment[fs.site.name] ? (
                    <Badge tone={ringTone(ringAssignment[fs.site.name])}>
                      {ringAssignment[fs.site.name]}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-fg-subtle">—</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {notInstalled ? (
                    <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
                      Not installed
                    </span>
                  ) : (
                    <HealthDot
                      status={versionOverrides[fs.site.name] ? "healthy" : fs.runtime.health}
                    />
                  )}
                </td>
                <td className="px-2 py-2 text-fg-muted">{fs.resolvedLocation}</td>
                <td className="px-2 py-2 font-mono text-[12px] text-fg-muted">
                  {fs.site.resourceGroup}
                </td>
                <td className="px-2 py-2 text-fg-muted">
                  {notInstalled ? "\u2014" : fmtRelative(fs.runtime.lastDeployAt)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-fg-subtle">
                No sites match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Bidirectional deep-link affordance per portal-landscape.md §5 + screen-recommendation.md §1.3.
 * URLs are placeholder shapes — Azure portal AIO blade + AIO experience portal instance overview.
 * They don't need to resolve; the affordance is the point.
 */
function DeepLinks({ site }: { site: FleetSite }) {
  const sub = site.site.subscription;
  const rg = site.site.resourceGroup;
  const instance = (site.site.parameters?.aioInstanceName as string | undefined) ?? site.site.name;
  const azureHref =
    `https://portal.azure.com/#@/resource/subscriptions/${sub}` +
    `/resourceGroups/${rg}/providers/Microsoft.IoTOperations/instances/${instance}/overview`;
  const experienceHref = `https://iotoperations.azure.com/instances/${instance}/overview`;
  const rolloutHref = `/rollout?site=${encodeURIComponent(site.site.name)}`;
  return (
    <span
      className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        href={rolloutHref}
        title="Roll out a change to just this site"
        className="inline-flex h-5 items-center gap-1 rounded-sm px-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted hover:bg-bg-muted hover:text-accent"
      >
        <Rocket className="h-3 w-3" />
        Roll out
      </Link>
      <a
        href={azureHref}
        target="_blank"
        rel="noreferrer"
        title="Open in Azure portal (AIO instance)"
        className="inline-flex h-5 items-center gap-1 rounded-sm px-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted hover:bg-bg-muted hover:text-accent"
      >
        Azure Portal
        <ExternalLink className="h-3 w-3" />
      </a>
      <a
        href={experienceHref}
        target="_blank"
        rel="noreferrer"
        title="Open in DOE (AIO experience portal)"
        className="inline-flex h-5 items-center gap-1 rounded-sm px-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted hover:bg-bg-muted hover:text-accent"
      >
        DOE
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}
