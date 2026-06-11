"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin, LayoutGrid, ListTree, Plus } from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { useV2Fleet } from "@/lib/useV2Fleet";
import { groupHierarchy, regionLabel } from "@/lib/v2/format";
import { SiteCard } from "@/components/v2/sites/SiteCard";
import { SiteFilters } from "@/components/v2/sites/SiteFilters";
import { InheritanceTree } from "@/components/v2/sites/InheritanceTree";
import { AddSiteWizard } from "@/components/v2/sites/AddSiteWizard";
import { TelemetrySourceToggle } from "@/components/v2/ui/TelemetrySourceToggle";
import { Button } from "@/components/ui/Button";
import { useIsRepoConnected } from "@/store/useRepoConnection";
import { cn } from "@/lib/utils";

type SitesView = "grouped" | "inheritance";

export default function V2SitesPage() {
  const fleet = useV2Fleet();
  const connected = useIsRepoConnected();
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [activeEnv, setActiveEnv] = useState<string | null>(null);
  const [view, setView] = useState<SitesView>("grouped");
  const [addOpen, setAddOpen] = useState(false);

  const regions = useMemo(() => {
    const slugs = Array.from(new Set(fleet.map((fs) => fs.resolvedLocation)));
    return slugs
      .map((slug) => ({ slug, label: regionLabel(slug) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [fleet]);

  const environments = useMemo(
    () => Array.from(new Set(fleet.map((fs) => fs.runtime.environment))).sort(),
    [fleet],
  );

  const filtered = useMemo(
    () =>
      fleet.filter(
        (fs) =>
          (activeRegion === null || fs.resolvedLocation === activeRegion) &&
          (activeEnv === null || fs.runtime.environment === activeEnv),
      ),
    [fleet, activeRegion, activeEnv],
  );

  const groups = useMemo(() => groupHierarchy(filtered), [filtered]);
  const siteCount = filtered.length;

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Your fleet by Enterprise, Region, and Site. Environment and cluster are shown per site."
        actions={
          <div className="flex items-center gap-3">
            <TelemetrySourceToggle />
            {connected && (
              <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add site
              </Button>
            )}
          </div>
        }
      />
      {addOpen && <AddSiteWizard onClose={() => setAddOpen(false)} />}
      <div className="space-y-6 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SiteFilters
            regions={regions}
            environments={environments}
            activeRegion={activeRegion}
            activeEnv={activeEnv}
            onRegion={setActiveRegion}
            onEnv={setActiveEnv}
          />
          <div
            className="inline-flex items-center rounded-full border border-border bg-bg-subtle p-0.5 text-[11px] font-medium"
            role="group"
            aria-label="Sites view"
          >
            {(
              [
                { id: "grouped", label: "Grouped", icon: LayoutGrid },
                { id: "inheritance", label: "Inheritance", icon: ListTree },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                title={
                  v.id === "grouped"
                    ? "Grouped \u2014 sites by Enterprise, Region, and Site."
                    : "Inheritance \u2014 how each site resolves config from its template chain."
                }
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-full px-3 transition-colors",
                  view === v.id ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[12px] text-fg-subtle">
          {siteCount} site{siteCount === 1 ? "" : "s"}
        </div>

        {view === "inheritance" && <InheritanceTree fleet={filtered} />}

        {view === "grouped" &&
          groups.map((ent) => (
          <section key={ent.enterprise} className="space-y-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <Building2 className="h-4 w-4 text-accent" />
              {ent.enterprise}
              <span className="text-[11px] font-normal uppercase tracking-wide text-fg-subtle">
                Enterprise
              </span>
            </div>

            {ent.regions.map((region) => (
              <div key={region.region} className="space-y-2.5 border-l-2 border-border pl-4">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
                  <MapPin className="h-3.5 w-3.5 text-fg-subtle" />
                  {region.label}
                  <span className="font-mono text-[11px] text-fg-subtle">{region.region}</span>
                  <span className="text-fg-subtle">· {region.sites.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {region.sites.map((fs) => (
                    <SiteCard key={fs.site.name} fs={fs} />
                  ))}
                </div>
              </div>
            ))}
          </section>
          ))}

        {view === "grouped" && siteCount === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-fg-subtle">
            No sites match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
