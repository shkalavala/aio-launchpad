"use client";

import { useMemo } from "react";
import { CheckSquare, Square } from "lucide-react";
import type { AioReleaseId, FleetSite } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VersionBadge } from "@/components/fleet/VersionBadge";
import { EnvPill } from "@/components/fleet/EnvPill";
import { FACTORY_DISPLAY, siteDisplayName } from "@/lib/fixtures/sites";
import { filterBySelector, buildLabelIndex } from "@/lib/selector";
import { cn } from "@/lib/utils";

interface Props {
  fleet: FleetSite[];
  sourceReleaseBySite: Record<string, AioReleaseId>;
  targetReleaseId: AioReleaseId | null;
  locked: boolean;
}

/**
 * Always-visible site picker on /upgrade. Selector input above acts as a
 * filter over this table (same vocabulary as Fleet); checkboxes drive
 * selectedSiteNames in the store. Sites whose current release is older than
 * the target are flagged "Behind target" — the natural upgrade intent.
 */
export function SiteMultiSelect({
  fleet,
  sourceReleaseBySite,
  targetReleaseId,
  locked,
}: Props) {
  const selectedSiteNames = useAppStore((s) => s.selectedSiteNames);
  const setSelectedSiteNames = useAppStore((s) => s.setSelectedSiteNames);
  const toggleSiteSelected = useAppStore((s) => s.toggleSiteSelected);
  const selectorText = useAppStore((s) => s.selectorText);

  const labelIndex = useMemo(() => buildLabelIndex(fleet), [fleet]);

  const visible = useMemo(() => {
    if (!selectorText.trim()) return fleet;
    return filterBySelector(fleet, selectorText, labelIndex);
  }, [fleet, selectorText, labelIndex]);

  const isAheadOfTarget = (name: string) => {
    if (!targetReleaseId) return false;
    const src = sourceReleaseBySite[name];
    if (!src) return false;
    return Number(src) > Number(targetReleaseId);
  };

  const isAtTarget = (name: string) => {
    if (!targetReleaseId) return false;
    const src = sourceReleaseBySite[name];
    if (!src) return false;
    return Number(src) === Number(targetReleaseId);
  };

  // Eligible = strictly behind target. Same-version sites are excluded so we
  // never stage a no-op rollout; ahead-of-target sites are excluded to block
  // downgrades.
  const eligibleVisible = useMemo(
    () => visible.filter((f) => !isAheadOfTarget(f.site.name) && !isAtTarget(f.site.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, targetReleaseId, sourceReleaseBySite],
  );

  const allVisibleSelected =
    eligibleVisible.length > 0 &&
    eligibleVisible.every((f) => selectedSiteNames.includes(f.site.name));
  const someVisibleSelected =
    eligibleVisible.some((f) => selectedSiteNames.includes(f.site.name)) && !allVisibleSelected;

  const toggleAllVisible = () => {
    if (locked) return;
    if (allVisibleSelected) {
      setSelectedSiteNames(
        selectedSiteNames.filter((n) => !eligibleVisible.some((f) => f.site.name === n)),
      );
    } else {
      const merged = new Set(selectedSiteNames);
      eligibleVisible.forEach((f) => merged.add(f.site.name));
      setSelectedSiteNames([...merged]);
    }
  };

  const isBehindTarget = (name: string) => {
    if (!targetReleaseId) return false;
    const src = sourceReleaseBySite[name];
    if (!src) return false;
    return Number(src) < Number(targetReleaseId);
  };

  const behindTargetNames = useMemo(
    () => visible.map((f) => f.site.name).filter(isBehindTarget),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, targetReleaseId, sourceReleaseBySite],
  );

  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">Sites</h2>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          {selectorText.trim()
            ? `${visible.length} of ${fleet.length} match selector`
            : `${fleet.length} fleet sites`}
        </span>
      </header>

      <div className="overflow-hidden rounded border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-3 py-1.5 text-[12px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllVisible}
            disabled={locked || visible.length === 0}
          >
            {allVisibleSelected ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {allVisibleSelected ? "Clear visible" : "Select all visible"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={locked || behindTargetNames.length === 0}
            onClick={() => {
              const merged = new Set(selectedSiteNames);
              behindTargetNames.forEach((n) => merged.add(n));
              setSelectedSiteNames([...merged]);
            }}
            title="Add every visible site whose AIO release is older than the target"
          >
            Suggest: behind target ({behindTargetNames.length})
          </Button>
          <span className="ml-auto text-[12px] text-fg-muted">
            <span className="font-semibold text-fg">{selectedSiteNames.length}</span> selected
          </span>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-left text-fg-muted">
              <th className="w-8 px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  disabled={locked}
                  aria-label="Toggle all visible"
                />
              </th>
              <th className="px-2 py-1.5 font-semibold">Name</th>
              <th className="px-2 py-1.5 font-semibold">Env</th>
              <th className="px-2 py-1.5 font-semibold">Current release</th>
              <th className="px-2 py-1.5 font-semibold">Region</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((fs) => {
              const checked = selectedSiteNames.includes(fs.site.name);
              const behind = isBehindTarget(fs.site.name);
              const ahead = isAheadOfTarget(fs.site.name);
              const atTarget = isAtTarget(fs.site.name);
              const rowDisabled = locked || ahead || atTarget;
              return (
                <tr
                  key={fs.site.name}
                  className={cn(
                    "border-b border-border-subtle last:border-b-0",
                    !rowDisabled && "cursor-pointer hover:bg-bg-subtle/60",
                    checked && "bg-accent-subtle/60",
                    locked && "opacity-80",
                    (ahead || atTarget) && "opacity-60",
                  )}
                  onClick={() => !rowDisabled && toggleSiteSelected(fs.site.name)}
                  title={
                    ahead
                      ? "Already newer than target release — downgrades are not allowed"
                      : atTarget
                        ? "Already at target release — nothing to upgrade"
                        : undefined
                  }
                >
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSiteSelected(fs.site.name)}
                      disabled={rowDisabled}
                      aria-label={`Select ${fs.site.name}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium text-fg">
                          {fs.runtime.environment === "prod"
                            ? (FACTORY_DISPLAY[fs.resolvedLabels.plant] ?? fs.site.name)
                            : "Shared dev environment"}
                        </span>
                        <span className="text-[11px] text-fg-subtle">
                          {siteDisplayName(
                            fs.resolvedLabels.factorySite,
                            fs.resolvedLabels.country,
                          )}
                          <span className="mx-1 opacity-60">·</span>
                          <span className="font-mono">{fs.site.name}</span>
                        </span>
                      </div>
                      {behind && (
                        <Badge tone="warning" className="ml-auto">
                          Behind target
                        </Badge>
                      )}
                      {ahead && (
                        <Badge tone="neutral" className="ml-auto">
                          Newer than target
                        </Badge>
                      )}
                      {atTarget && (
                        <Badge tone="success" className="ml-auto">
                          Already at target
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <EnvPill env={fs.runtime.environment} />
                  </td>
                  <td className="px-2 py-1.5">
                    <VersionBadge id={sourceReleaseBySite[fs.site.name] ?? fs.runtime.resolvedRelease} />
                  </td>
                  <td className="px-2 py-1.5 text-fg-muted">{fs.resolvedLocation}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-fg-subtle">
                  No sites match the current selector.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
