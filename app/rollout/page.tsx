"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Target } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useFleet } from "@/lib/useFleet";
import { DEFAULT_RELEASE } from "@/lib/fixtures/releases";
import { SAMPLE_APPS } from "@/lib/fixtures/sampleApps";
import { ARM_MODULES } from "@/lib/fixtures/armModules";
import { PENDING_INSTALL_FLEET } from "@/lib/fixtures/sites";
import { buildLabelIndex } from "@/lib/selector";
import type { AioReleaseId } from "@/lib/types";
import { UpgradeCommandBar } from "@/components/upgrade/UpgradeCommandBar";
import { SiteMultiSelect } from "@/components/upgrade/SiteMultiSelect";
import { PendingInstallSitePicker } from "@/components/upgrade/PendingInstallSitePicker";
import { BlastRadiusPanel } from "@/components/upgrade/BlastRadiusPanel";
import { RingConfigurator } from "@/components/upgrade/RingConfigurator";
import { RolloutControls } from "@/components/upgrade/RolloutControls";
import { RolloutProgress } from "@/components/upgrade/RolloutProgress";
import { RolloutKindPicker } from "@/components/upgrade/RolloutKindPicker";
import { RecentRollouts } from "@/components/upgrade/RecentRollouts";
import { EmptyFleetCard } from "@/components/shell/EmptyFleetCard";

/**
 * Screen 3 — Rollout.
 *
 * One pipeline (rings, gates, pause/continue, health-verify, blast-radius
 * preview) drives three rollout kinds:
 *   - release: bump the AIO release pin across sites
 *   - app:     deploy or upgrade a Scale Kit sample app
 *   - arm:     apply a targeted post-deployment Bicep / config change
 *
 * Release-specific UI (BlastRadiusPanel, version-diff chips) renders only
 * when kind === "release". The rollout state machine itself is kind-agnostic.
 *
 * Vocabulary (persona-map.md §5): manifest, release pin, ring, blast radius,
 * AIO version, site, selector. Operations IT persona only. No rollback.
 */
export default function RolloutPage() {
  const fleet = useFleet();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get("site");

  const rolloutKind = useAppStore((s) => s.rolloutKind);
  const rolloutAppId = useAppStore((s) => s.rolloutAppId);
  const rolloutArmId = useAppStore((s) => s.rolloutArmId);
  const selectedSiteNames = useAppStore((s) => s.selectedSiteNames);
  const setSelectedSiteNames = useAppStore((s) => s.setSelectedSiteNames);
  const selectorText = useAppStore((s) => s.selectorText);
  const setSelectorText = useAppStore((s) => s.setSelectorText);
  const targetReleaseId = useAppStore((s) => s.targetReleaseId);
  const setTargetRelease = useAppStore((s) => s.setTargetRelease);
  const rolloutStatus = useAppStore((s) => s.rolloutStatus);
  const versionOverrides = useAppStore((s) => s.versionOverrides);
  const releaseSnapshotAtStart = useAppStore((s) => s.releaseSnapshotAtStart);
  const installedPendingSiteNames = useAppStore((s) => s.installedPendingSiteNames);
  const demoMode = useAppStore((s) => s.demoMode);

  const isRelease = rolloutKind === "release";
  const isInstall = rolloutKind === "install";

  // Pending-install candidates minus any that already came online via a
  // completed install rollout this session. Keeps the picker, ring planner,
  // and selection-cleanup effect on the same source of truth. Gated on demoMode
  // so an empty tenant has no pre-declared install backlog.
  const installCandidates = useMemo(() => {
    if (!demoMode) return [];
    if (installedPendingSiteNames.length === 0) return PENDING_INSTALL_FLEET;
    const installed = new Set(installedPendingSiteNames);
    return PENDING_INSTALL_FLEET.filter((f) => !installed.has(f.site.name));
  }, [demoMode, installedPendingSiteNames]);

  // Deep-link from Fleet row: /rollout?site=foo seeds a single-site rollout.
  // Runs once per ?site= value; clears the selector so the table shows the
  // target alone.
  const siteParamHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!siteParam) return;
    if (siteParamHandledRef.current === siteParam) return;
    if (rolloutStatus !== "idle") return;
    if (!fleet.some((f) => f.site.name === siteParam)) return;
    setSelectedSiteNames([siteParam]);
    if (selectorText.trim()) setSelectorText("");
    siteParamHandledRef.current = siteParam;
  }, [siteParam, fleet, rolloutStatus, setSelectedSiteNames, selectorText, setSelectorText]);

  // Initialize the release payload once on mount if the operator hasn't picked.
  // Install kind also needs a target release.
  useEffect(() => {
    if ((isRelease || isInstall) && !targetReleaseId) setTargetRelease(DEFAULT_RELEASE.id);
  }, [isRelease, isInstall, targetReleaseId, setTargetRelease]);

  const labelIndex = useMemo(() => buildLabelIndex(fleet), [fleet]);

  // Source release per site. During a live rollout (and after completion until
  // reset) the snapshot taken at startRollout() wins for sites that were in
  // the rollout — so per-row "from→to" stays "2604 → 2605" instead of
  // collapsing to "2605 → 2605" as the ticker writes overrides.
  const sourceReleaseBySite = useMemo(() => {
    const locked = rolloutStatus !== "idle";
    const m: Record<string, AioReleaseId> = {};
    for (const fs of fleet) {
      const name = fs.site.name;
      if (locked && releaseSnapshotAtStart[name]) {
        m[name] = releaseSnapshotAtStart[name];
      } else {
        m[name] = versionOverrides[name] ?? fs.runtime.resolvedRelease;
      }
    }
    return m;
  }, [versionOverrides, fleet, rolloutStatus, releaseSnapshotAtStart]);

  // Auto-suggest selection on first arrival (release kind only). For app/arm,
  // the operator picks sites explicitly — no natural "behind target" filter.
  // Skipped when ?site= is pre-seeding a single-site rollout.
  const autoSuggestedRef = useRef(false);
  useEffect(() => {
    if (autoSuggestedRef.current) return;
    if (siteParam) {
      autoSuggestedRef.current = true;
      return;
    }
    if (!isRelease) {
      autoSuggestedRef.current = true;
      return;
    }
    if (rolloutStatus !== "idle") return;
    if (selectedSiteNames.length > 0 || selectorText.trim()) {
      autoSuggestedRef.current = true;
      return;
    }
    const target = targetReleaseId ?? DEFAULT_RELEASE.id;
    const behind = fleet
      .filter(
        (fs) =>
          Number(sourceReleaseBySite[fs.site.name] ?? fs.runtime.resolvedRelease) <
          Number(target),
      )
      .map((fs) => fs.site.name);
    if (behind.length > 0) setSelectedSiteNames(behind);
    autoSuggestedRef.current = true;
  }, [
    isRelease,
    selectedSiteNames,
    selectorText,
    targetReleaseId,
    rolloutStatus,
    sourceReleaseBySite,
    setSelectedSiteNames,
    fleet,
  ]);

  // When the operator switches into install kind, clear any fleet-site
  // selection that doesn't exist in the greenfield list (and vice-versa on
  // exit). Keeps the table + ring planner in sync with the source list.
  useEffect(() => {
    if (rolloutStatus !== "idle") return;
    if (selectedSiteNames.length === 0) return;
    const validNames = new Set(
      isInstall
        ? installCandidates.map((f) => f.site.name)
        : fleet.map((f) => f.site.name),
    );
    const filtered = selectedSiteNames.filter((n) => validNames.has(n));
    if (filtered.length !== selectedSiteNames.length) setSelectedSiteNames(filtered);
  }, [isInstall, fleet, installCandidates, selectedSiteNames, setSelectedSiteNames, rolloutStatus]);

  const selectedSites = useMemo(() => {
    if (selectedSiteNames.length === 0) return [];
    const want = new Set(selectedSiteNames);
    if (isInstall) {
      return installCandidates.filter((f) => want.has(f.site.name));
    }
    return fleet.filter((f) => want.has(f.site.name));
  }, [selectedSiteNames, fleet, isInstall, installCandidates]);

  // Release-only guard: drop sites at or above the target version.
  // Bypassed when the operator has explicitly narrowed to a single site —
  // that's intent (e.g. deep-link from /fleet), not a stale auto-suggest.
  useEffect(() => {
    if (!isRelease) return;
    if (!targetReleaseId) return;
    if (rolloutStatus !== "idle") return;
    if (selectedSiteNames.length === 0) return;
    if (selectedSiteNames.length === 1) return;
    const filtered = selectedSiteNames.filter((name) => {
      const src = sourceReleaseBySite[name];
      if (!src) return true;
      return Number(src) < Number(targetReleaseId);
    });
    if (filtered.length !== selectedSiteNames.length) setSelectedSiteNames(filtered);
  }, [
    isRelease,
    targetReleaseId,
    rolloutStatus,
    selectedSiteNames,
    sourceReleaseBySite,
    setSelectedSiteNames,
  ]);

  const locked = rolloutStatus !== "idle";

  // When the operator commits (status flips idle → non-idle), bring the
  // Rollout progress panel into view. Without this, the page stays scrolled
  // wherever they were planning from — usually the manifest diff far above
  // the progress + gate Continue button. Only fires on the transition.
  const prevStatusRef = useRef(rolloutStatus);
  useEffect(() => {
    if (prevStatusRef.current === "idle" && rolloutStatus !== "idle") {
      // Defer one frame so the progress section has mounted.
      requestAnimationFrame(() => {
        document.getElementById("rollout-progress")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
    prevStatusRef.current = rolloutStatus;
  }, [rolloutStatus]);

  // Per-kind title + payload-aware change label for non-release rows.
  const { pageTitle, pageSubtitle, changeLabel } = useMemo(() => {
    if (rolloutKind === "app") {
      const app = SAMPLE_APPS.find((a) => a.id === rolloutAppId);
      return {
        pageTitle: app ? `Deploy app · ${app.name}` : "Deploy app",
        pageSubtitle: app
          ? `${app.tagline}. Staged in rings, gated between rings, health-verified before continuing.`
          : "Pick an app, pick sites, stage in rings.",
        changeLabel: app ? `Install ${app.name}` : "Install app",
      };
    }
    if (rolloutKind === "arm") {
      const mod = ARM_MODULES.find((m) => m.id === rolloutArmId);
      return {
        pageTitle: mod ? `Apply module · ${mod.name}` : "Apply ARM module",
        pageSubtitle: mod
          ? `${mod.tagline}. Same ring/gate/verify pipeline as an AIO upgrade.`
          : "Targeted post-deployment Bicep change. Pick a module, pick sites, stage in rings.",
        changeLabel: mod ? `Apply ${mod.name}` : "Apply module",
      };
    }
    if (rolloutKind === "install") {
      return {
        pageTitle: targetReleaseId ? `Install AIO release · ${targetReleaseId}` : "Install AIO",
        pageSubtitle:
          "Install AIO on sites that are declared in the manifest but don’t have AIO yet. Same ring/gate/verify pipeline as an upgrade — each site inherits defaults from its template ancestry.",
        changeLabel: targetReleaseId ? `Install release ${targetReleaseId}` : "Install AIO",
      };
    }
    return {
      pageTitle: targetReleaseId ? `Upgrade AIO · ${targetReleaseId}` : "Upgrade AIO",
      pageSubtitle:
        "In-place release pin update across a selector of sites. Staged in rings, gated between rings, health-verified before continuing. Live cluster, no rebuild, no identity loss.",
      changeLabel: undefined,
    };
  }, [rolloutKind, rolloutAppId, rolloutArmId, targetReleaseId]);

  const isSingleSite = selectedSites.length === 1;

  // Empty-state: live fleet only matters for non-install kinds. For install
  // the source is the greenfield cluster fixture, which is always populated.
  if (!isInstall && fleet.length === 0) {
    return (
      <section className="flex h-full min-w-0 flex-col">
        <Header pageTitle={pageTitle} />
        <div className="min-h-0 flex-1 overflow-auto bg-bg">
          <EmptyFleetCard
            title="Nothing to roll out yet"
            body="Rollouts stage a change (AIO release, sample app, or ARM module) across sites in rings, with gates and health checks between rings. Add at least one site to plan a rollout."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <Header pageTitle={pageTitle} subtitle={pageSubtitle} />

      <UpgradeCommandBar
        targetCount={selectedSites.length}
        releaseSnapshotForSelected={Object.fromEntries(
          selectedSites.map((fs) => [fs.site.name, sourceReleaseBySite[fs.site.name] ?? fs.runtime.resolvedRelease]),
        )}
      />
      <RolloutControls />

      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
          <RolloutKindPicker locked={locked} />

          {isInstall ? (
            <PendingInstallSitePicker locked={locked} />
          ) : (
            <SiteMultiSelect
              fleet={fleet}
              sourceReleaseBySite={sourceReleaseBySite}
              // Pass null for non-release kinds so the at/above-target filter
              // and version chips short-circuit cleanly.
              targetReleaseId={isRelease ? targetReleaseId : null}
              locked={locked}
            />
          )}
          {isRelease && selectedSites.length > 1 && targetReleaseId && (
            <BlastRadiusPanel
              selectedSites={selectedSites}
              selectorText={selectorText}
              selectorLabelIndex={labelIndex}
              sourceReleaseBySite={sourceReleaseBySite}
              targetReleaseId={targetReleaseId}
            />
          )}
          {isSingleSite && (
            <SingleSiteCallout siteName={selectedSites[0].site.name} />
          )}
          {selectedSites.length > 1 && (
            <RingConfigurator selectedSites={selectedSites} locked={locked} />
          )}
          {selectedSites.length > 0 && (
            <RolloutProgress
              selectedSites={selectedSites}
              sourceReleaseBySite={sourceReleaseBySite}
              targetReleaseId={isRelease ? targetReleaseId : null}
              changeLabel={changeLabel}
            />
          )}
          <RecentRollouts />
        </div>
      </div>
    </section>
  );
}

function Header({ pageTitle, subtitle }: { pageTitle: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
      <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
        <Link href="/fleet" className="hover:text-accent">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/fleet" className="hover:text-accent">Fleet</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-fg">Rollout</span>
      </nav>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-fg">{pageTitle}</h1>
          {subtitle && <p className="text-[12px] text-fg-muted">{subtitle}</p>}
        </div>
        <Link
          href="/fleet"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Fleet
        </Link>
      </div>
    </div>
  );
}

/**
 * Single-site rollout callout. Rings + blast-radius are hidden in this case
 * because the ceremony makes no sense for N=1; the operator still sees the
 * health-verify ticker and per-site progress row below.
 */
function SingleSiteCallout({ siteName }: { siteName: string }) {
  return (
    <section className="flex items-start gap-2 rounded border border-accent/40 bg-accent-subtle/30 p-3">
      <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-fg">Single-site rollout</h2>
        <p className="text-[11px] text-fg-muted">
          Applying to{" "}
          <span className="font-mono text-fg">{siteName}</span> only — ring and
          gate ceremony skipped. Health verify still runs after the change.
          Add more sites above to stage in rings.
        </p>
      </div>
    </section>
  );
}
