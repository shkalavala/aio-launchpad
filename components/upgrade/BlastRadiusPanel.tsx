"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Cloud,
  Filter as FilterIcon,
  Globe2,
  Layers,
  ServerCog,
} from "lucide-react";
import type { AioReleaseId, FleetSite } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { COUNTRY_NAMES } from "@/lib/fixtures/sites";
import { resourceDriftForSites } from "@/lib/fixtures/aioResources";
import { parseSelector, serializeSelector } from "@/lib/selector";
import { YamlDiff } from "./YamlDiff";

interface Props {
  selectedSites: FleetSite[];
  selectorText: string;
  selectorLabelIndex: Record<string, string>;
  sourceReleaseBySite: Record<string, AioReleaseId>;
  targetReleaseId: AioReleaseId | null;
}

/**
 * Primitive #5 — Blast-radius preview (day2-reality.md §3.3, screen-recommendation.md §2.2).
 * Pre-deploy summary: site count, env breakdown, region breakdown, dataflows
 * touched, selector echo, YAML diff of the release-pin file.
 */
export function BlastRadiusPanel({
  selectedSites,
  selectorText,
  selectorLabelIndex,
  sourceReleaseBySite,
  targetReleaseId,
}: Props) {
  const breakdown = useMemo(() => {
    // Open env model: count per whatever env labels are present.
    const env: Record<string, number> = {};
    const region = new Map<string, number>();
    // Aggregate enabled add-on capabilities across the selected sites.
    // Each entry = site count where that flag is true in the manifest ancestry.
    // Keys mirror manifest-aio-install.yaml deployOptions.*
    const caps: Record<string, number> = {
      Dataflows: 0,
      SecretSync: 0,
      CertManager: 0,
      "Edge site": 0,
      "Global site": 0,
    };
    for (const fs of selectedSites) {
      const ev = fs.runtime.environment;
      env[ev] = (env[ev] ?? 0) + 1;
      const c = fs.resolvedLabels.country ?? "—";
      region.set(c, (region.get(c) ?? 0) + 1);
      const opts: Record<string, unknown> = {};
      // Last-write-wins ancestry walk so child overrides win, matching manifest semantics.
      for (const t of fs.ancestry) {
        const o = t.properties?.deployOptions;
        if (o) Object.assign(opts, o);
      }
      if (opts.includeDataflows === true) caps.Dataflows += 1;
      if (opts.enableSecretSync === true) caps.SecretSync += 1;
      if (opts.enableCertManager === true) caps.CertManager += 1;
      if (opts.enableEdgeSite === true) caps["Edge site"] += 1;
      if (opts.enableGlobalSite === true) caps["Global site"] += 1;
    }
    const capsList = Object.entries(caps).filter(([, n]) => n > 0);
    return { env, region: [...region.entries()], caps: capsList };
  }, [selectedSites]);

  const selectorEcho = useMemo(() => {
    if (!selectorText.trim()) return null;
    return serializeSelector(parseSelector(selectorText, selectorLabelIndex));
  }, [selectorText, selectorLabelIndex]);

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">Blast radius</h2>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          What this rollout touches
        </span>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat
          icon={<ServerCog className="h-3.5 w-3.5" />}
          label="Sites"
          value={selectedSites.length}
        />
        <Stat
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Environments"
          value={
            <span className="flex flex-wrap items-baseline gap-1">
              {Object.entries(breakdown.env)
                .sort(([a], [b]) => (a === "prod" ? -1 : b === "prod" ? 1 : a.localeCompare(b)))
                .map(([ev, n]) => (
                  <Badge key={ev} tone={ev === "prod" ? "accent" : "neutral"}>
                    {n} {ev}
                  </Badge>
                ))}
              {Object.keys(breakdown.env).length === 0 && (
                <span className="text-fg-subtle">—</span>
              )}
            </span>
          }
        />
        <Stat
          icon={<Globe2 className="h-3.5 w-3.5" />}
          label="Regions"
          value={
            <span className="flex flex-wrap items-baseline gap-1">
              {breakdown.region.length === 0 && <span className="text-fg-subtle">—</span>}
              {breakdown.region.map(([c, n]) => (
                <Badge key={c} tone="neutral">
                  {COUNTRY_NAMES[c] ?? c} · {n}
                </Badge>
              ))}
            </span>
          }
        />
        <Stat
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Capabilities touched"
          value={
            <div className="flex flex-col gap-1">
              <span
                className="flex flex-wrap items-baseline gap-1"
                title="AIO core + MQTT broker + default dataflow profile/endpoint + connector templates restart on every site. Add-ons listed below are only touched on sites that enabled them."
              >
                <Badge tone="accent">Core · {selectedSites.length}</Badge>
                {breakdown.caps.map(([name, n]) => (
                  <Badge key={name} tone="neutral">
                    {name} · {n}
                  </Badge>
                ))}
              </span>
              <span className="text-[10px] text-fg-subtle">
                Core = AIO instance, broker, default dataflow, connector templates
              </span>
            </div>
          }
        />
      </div>

      <div className="flex items-center gap-2 rounded border border-border bg-bg-subtle px-3 py-1.5 text-[12px]">
        <FilterIcon className="h-3.5 w-3.5 text-fg-subtle" />
        <span className="text-fg-muted">Selector match</span>
        <code className="font-mono text-accent">
          {selectorEcho ? `siteops -l ${selectorEcho}` : "(explicit row selection)"}
        </code>
        <span className="ml-auto text-fg-subtle">
          {selectedSites.length} of fleet match
        </span>
      </div>

      <ResourceDriftPreflight selectedSites={selectedSites} />

      {targetReleaseId && selectedSites.length > 0 && (
        <YamlDiff
          selectedSites={selectedSites}
          sourceReleaseBySite={sourceReleaseBySite}
          targetReleaseId={targetReleaseId}
        />
      )}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded border border-border bg-surface p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-subtle">
        {icon}
        {label}
      </div>
      <div className="text-[15px] font-semibold text-fg">{value}</div>
    </div>
  );
}

/**
 * Pre-rollout resource-drift check. Reads the Resources fixture (synthetic
 * snapshot of `az iot ops clone` state) and shows how many ARM resources in
 * the selected sites have drifted vs the fleet repo. Resource drift can mean
 * a rollout silently overwrites a hand-edited resource, so we surface the
 * count with a deep-link to /resources?site=… for the first affected site
 * (or unfiltered if many sites are selected).
 */
function ResourceDriftPreflight({ selectedSites }: { selectedSites: FleetSite[] }) {
  const siteNames = useMemo(
    () => selectedSites.map((s) => s.site.name),
    [selectedSites],
  );
  const { total, drift } = useMemo(() => resourceDriftForSites(siteNames), [siteNames]);
  if (selectedSites.length === 0) return null;
  const single = selectedSites.length === 1 ? selectedSites[0].site.name : null;
  const href = single
    ? `/resources?site=${encodeURIComponent(single)}`
    : "/resources";
  const tone = drift > 0
    ? "border-warning/40 bg-warning/10"
    : "border-success/30 bg-success/5";
  return (
    <div
      className={`flex items-center gap-3 rounded border px-3 py-2 text-[12px] ${tone}`}
    >
      <Cloud className="h-4 w-4 text-fg-subtle" />
      <div className="flex-1">
        <div className="font-semibold text-fg">
          Resource drift preflight{" "}
          <span className="font-normal text-fg-muted">
            · {total} ARM resource{total === 1 ? "" : "s"} in scope
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-fg-muted">
          {drift === 0 ? (
            <>
              All resources mapped to the selected sites match the fleet repo —
              no hand-edits will be overwritten.
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <AlertTriangle className="h-3 w-3" />
                {drift} drifted
              </span>{" "}
              vs the fleet repo. Reconcile or accept overwrite before rolling
              out — drift will be silently overwritten when the manifest
              re-applies.
            </>
          )}
        </p>
      </div>
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors ${
          drift > 0
            ? "border-warning/60 bg-surface text-warning hover:bg-warning/15"
            : "border-border bg-surface text-fg hover:bg-bg-subtle"
        }`}
      >
        {drift > 0 ? "Review drift" : "Open Resources"}
      </Link>
    </div>
  );
}
