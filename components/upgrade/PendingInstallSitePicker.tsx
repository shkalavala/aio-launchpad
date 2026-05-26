"use client";

import { useMemo } from "react";
import { Sprout, Check, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PENDING_INSTALL_FLEET } from "@/lib/fixtures/sites";
import { cn } from "@/lib/utils";

interface Props {
  locked: boolean;
}

/**
 * Picker for the Rollout "install" kind. Source: sites that have been
 * declared in the manifest (lib/fixtures/sites.ts → PENDING_INSTALL_FLEET)
 * but where AIO has not yet been installed on the underlying Arc cluster.
 *
 * Architecture A: modeling lives in /sites/new (single) or in the IaC repo
 * (bulk, future). Rollout-install consumes "modeled-but-not-installed" sites
 * and runs them through the same ring/gate/verify pipeline as upgrades.
 *
 * Each row shows site identity (name, env), inheritance chain (so the
 * operator can see which template will provide defaults), and the resolved
 * Azure binding (subscription / RG / location).
 */
export function PendingInstallSitePicker({ locked }: Props) {
  const selectedSiteNames = useAppStore((s) => s.selectedSiteNames);
  const setSelectedSiteNames = useAppStore((s) => s.setSelectedSiteNames);
  const installedPendingSiteNames = useAppStore((s) => s.installedPendingSiteNames);
  const demoMode = useAppStore((s) => s.demoMode);

  const candidates = useMemo(() => {
    if (!demoMode) return [];
    if (installedPendingSiteNames.length === 0) return PENDING_INSTALL_FLEET;
    const installed = new Set(installedPendingSiteNames);
    return PENDING_INSTALL_FLEET.filter((f) => !installed.has(f.site.name));
  }, [demoMode, installedPendingSiteNames]);

  const selectedSet = useMemo(() => new Set(selectedSiteNames), [selectedSiteNames]);

  function toggle(name: string) {
    if (locked) return;
    if (selectedSet.has(name)) {
      setSelectedSiteNames(selectedSiteNames.filter((n) => n !== name));
    } else {
      setSelectedSiteNames([...selectedSiteNames, name]);
    }
  }
  function selectAll() {
    if (locked) return;
    setSelectedSiteNames(candidates.map((c) => c.site.name));
  }
  function clearAll() {
    if (locked) return;
    setSelectedSiteNames([]);
  }

  const allSelected =
    candidates.length > 0 && selectedSiteNames.length === candidates.length;

  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Sprout className="h-3.5 w-3.5 text-accent" />
          <h2 className="text-[13px] font-semibold text-fg">
            Sites declared but not yet installed
          </h2>
          <span className="text-[11px] text-fg-muted">
            ({candidates.length} candidates · {selectedSiteNames.length} selected)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={allSelected ? clearAll : selectAll}
            disabled={locked}
            className="rounded-sm border border-border bg-bg px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>
      </header>

      <div className="divide-y divide-border-subtle">
        {candidates.length === 0 && (
          <p className="px-3 py-4 text-center text-[11px] text-fg-muted">
            All declared sites have AIO installed. Declare more via{" "}
            <a href="/sites/new" className="text-accent hover:underline">/sites/new</a>.
          </p>
        )}
        {candidates.map((fs) => {
          const checked = selectedSet.has(fs.site.name);
          const env = fs.runtime.environment;
          return (
            <button
              key={fs.site.name}
              onClick={() => toggle(fs.site.name)}
              disabled={locked}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors disabled:cursor-default",
                checked ? "bg-accent-subtle/30" : "hover:bg-bg-subtle",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                  checked
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-bg",
                )}
              >
                {checked && <Check className="h-3 w-3" />}
              </span>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-mono text-[12px] text-fg">
                    {fs.site.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-[10px] font-medium uppercase tracking-wide",
                      env === "prod"
                        ? "bg-warning-subtle text-warning-fg"
                        : "bg-bg-subtle text-fg-muted",
                    )}
                  >
                    {env}
                  </span>
                </div>

                {/* Ancestry chain — parent-most first → site */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
                  <span className="text-fg-subtle">inherits</span>
                  {fs.ancestry.map((t, i) => (
                    <span key={t.name} className="flex items-center gap-1">
                      <span className="font-mono text-fg">{t.name}</span>
                      {i < fs.ancestry.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-fg-subtle" />
                      )}
                    </span>
                  ))}
                  {fs.ancestry.length === 0 && (
                    <span className="italic text-fg-subtle">no template</span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-3 text-[11px] text-fg-muted">
                  <span>
                    <span className="text-fg-subtle">region</span> {fs.resolvedLocation}
                  </span>
                  <span className="font-mono text-[10px] text-fg-subtle">
                    {fs.site.resourceGroup}
                  </span>
                  {Object.entries(fs.resolvedLabels).slice(0, 3).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-sm border border-border-subtle bg-bg-subtle px-1 py-px font-mono text-[10px] text-fg-subtle"
                    >
                      {k}={v}
                    </span>
                  ))}
                </div>
              </div>

              <span className="mt-0.5 shrink-0 rounded-full border border-border-subtle bg-bg-subtle px-1.5 py-px text-[10px] uppercase tracking-wide text-fg-subtle">
                no AIO
              </span>
            </button>
          );
        })}
      </div>

      <footer className="border-t border-border-subtle bg-bg-subtle px-3 py-2 text-[11px] text-fg-muted">
        Declare more sites via{" "}
        <a href="/sites/new" className="text-accent hover:underline">
          /sites/new
        </a>{" "}
        — or, in production, sync them from your IaC repo. Each one inherits
        defaults from its template ancestry above.
      </footer>
    </section>
  );
}
