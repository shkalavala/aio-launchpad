"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFleet } from "@/lib/useFleet";
import { SiteTree } from "@/components/fleet/SiteTree";
import { FleetTable } from "@/components/fleet/FleetTable";
import { FleetCommandBar } from "@/components/fleet/FleetCommandBar";
import { FilterChips } from "@/components/fleet/FilterChips";
import { ResizableSidebar } from "@/components/shell/ResizableSidebar";
import { EmptyFleetCard } from "@/components/shell/EmptyFleetCard";
import { SiteDetailDrawer } from "@/components/fleet/SiteDetailDrawer";
import { ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PENDING_INSTALL_FLEET } from "@/lib/fixtures/sites";
import type { FleetSite } from "@/lib/types";

export default function FleetPage() {
  const pendingSites = useAppStore((s) => s.pendingSites);
  const installedPendingSiteNames = useAppStore((s) => s.installedPendingSiteNames);
  const versionOverrides = useAppStore((s) => s.versionOverrides);
  const demoMode = useAppStore((s) => s.demoMode);
  const baseFleet = useFleet();
  // Declared in the manifest but no AIO yet — surfaced here so the Fleet view
  // is the single catalog. Filter out any that this session has already
  // promoted via a completed install rollout (those are merged via useFleet).
  // Only shown when demo data is on; with demo off, a fresh tenant must stay
  // empty except for sites the user explicitly created.
  const declaredPending = useMemo(() => {
    if (!demoMode) return [];
    const installed = new Set(installedPendingSiteNames);
    return PENDING_INSTALL_FLEET.filter((fs) => !installed.has(fs.site.name));
  }, [demoMode, installedPendingSiteNames]);
  const fleet = useMemo(
    () => [...baseFleet, ...pendingSites, ...declaredPending],
    [baseFleet, pendingSites, declaredPending],
  );
  const isEmpty = fleet.length === 0;

  const installed = fleet.filter((f) => f.runtime.aioInstalled !== false);
  const totalSites = installed.length;
  const factories = installed.filter((f) => f.runtime.environment === "prod").length;
  const sharedDevs = installed.filter((f) => f.runtime.environment === "dev").length;
  const onCurrent = installed.filter(
    (f) => (versionOverrides[f.site.name] ?? f.runtime.resolvedRelease) === "2605",
  ).length;
  const pendingInstall = declaredPending.length;

  return (
    <div className="flex h-full">
      {/* Left rail: site hierarchy (resizable) */}
      <ResizableSidebar>
        <SiteTree fleet={fleet} />
      </ResizableSidebar>

      {/* Main pane */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Breadcrumbs + title */}
        <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
          <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
            <span>Home</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-fg">Fleet</span>
          </nav>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold leading-tight text-fg">Fleet</h1>
              <p className="text-[12px] text-fg-muted">
                Every site you own — installed AIO instances plus sites declared in the manifest
                that don&apos;t have AIO yet. Add new sites and roll out installs from here.
              </p>
            </div>
            <div className="flex gap-6 text-[12px]">
              <Stat label="AIO instances" value={totalSites} />
              <Stat label="Factories (prod)" value={factories} />
              <Stat label="Shared dev envs" value={sharedDevs} />
              <Stat label="On 2605" value={`${onCurrent}/${totalSites}`} />
              {pendingInstall > 0 && (
                <Stat label="Pending install" value={pendingInstall} />
              )}
            </div>
          </div>
        </div>

        <FleetCommandBar />
        <FilterChips />

        <div className="min-h-0 flex-1 overflow-auto bg-bg">
          {isEmpty ? (
            <EmptyFleetCard
              title="No AIO sites yet"
              body="A site is one AIO instance on one Arc-connected cluster. Run the pre-flight checks for your tenant, then scaffold your first site."
            />
          ) : (
            <FleetTable fleet={fleet} />
          )}
        </div>
      </section>

      <Suspense fallback={null}>
        <DrawerHost fleet={fleet} />
      </Suspense>
    </div>
  );
}

function DrawerHost({ fleet }: { fleet: FleetSite[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedName = searchParams.get("site");

  const closeDrawer = useCallback(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("site");
    const qs = params.toString();
    router.replace(qs ? `/fleet?${qs}` : "/fleet");
  }, [router, searchParams]);

  return <SiteDetailDrawer fleet={fleet} selectedName={selectedName} onClose={closeDrawer} />;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[18px] font-semibold leading-tight text-fg">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</span>
    </div>
  );
}


