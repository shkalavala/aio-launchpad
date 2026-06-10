"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { useV2Fleet } from "@/lib/useV2Fleet";
import { groupHierarchy, regionLabel } from "@/lib/v2/format";
import { SiteCard } from "@/components/v2/sites/SiteCard";
import { SiteFilters } from "@/components/v2/sites/SiteFilters";

export default function V2SitesPage() {
  const fleet = useV2Fleet();
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [activeEnv, setActiveEnv] = useState<string | null>(null);

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
      />
      <div className="space-y-6 px-6 py-5">
        <SiteFilters
          regions={regions}
          environments={environments}
          activeRegion={activeRegion}
          activeEnv={activeEnv}
          onRegion={setActiveRegion}
          onEnv={setActiveEnv}
        />

        <div className="text-[12px] text-fg-subtle">
          {siteCount} site{siteCount === 1 ? "" : "s"}
        </div>

        {groups.map((ent) => (
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

        {siteCount === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-fg-subtle">
            No sites match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
