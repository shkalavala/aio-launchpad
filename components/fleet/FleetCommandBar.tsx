"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Rocket, KeyRound, Code2, Search } from "lucide-react";
import { CommandBar } from "@/components/shell/CommandBar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAppStore } from "@/store/useAppStore";
import { RELEASES } from "@/lib/fixtures/releases";
import { useFleet } from "@/lib/useFleet";
import { buildLabelIndex, filterBySelector } from "@/lib/selector";
import { cn } from "@/lib/utils";

export function FleetCommandBar() {
  const router = useRouter();
  const selectedCount = useAppStore((s) => s.selectedSiteNames.length);
  const selectorText = useAppStore((s) => s.selectorText);
  const setSelectorText = useAppStore((s) => s.setSelectorText);
  const filterEnv = useAppStore((s) => s.filterEnv);
  const setFilterEnv = useAppStore((s) => s.setFilterEnv);
  const filterRelease = useAppStore((s) => s.filterRelease);
  const setFilterRelease = useAppStore((s) => s.setFilterRelease);
  const clearSelection = useAppStore((s) => s.clearSelection);

  const fleet = useFleet();

  // Build a list of suggestion tokens from the fleet's real labels, grouped by key.
  const suggestions = useMemo(() => {
    const labelIndex = buildLabelIndex(fleet);
    const byKey = new Map<string, string[]>();
    for (const [value, key] of Object.entries(labelIndex)) {
      const list = byKey.get(key) ?? [];
      list.push(value);
      byKey.set(key, list);
    }
    return [...byKey.entries()].map(([key, values]) => ({
      key,
      values: values.sort(),
    }));
  }, [fleet]);

  const appendToken = (token: string) => {
    const current = selectorText.trim();
    if (!current) return setSelectorText(token);
    if (current.endsWith(",")) return setSelectorText(current + token);
    return setSelectorText(current + "," + token);
  };

  // Selector-derived match count (used when no explicit row selection exists).
  const selectorMatchCount = useMemo(() => {
    if (!selectorText.trim()) return 0;
    const labelIndex = buildLabelIndex(fleet);
    return filterBySelector(fleet, selectorText, labelIndex).length;
  }, [selectorText, fleet]);
  const rolloutTargetCount = selectedCount > 0 ? selectedCount : selectorMatchCount;

  return (
    <>
      <CommandBar>
        <Button variant="primary" size="sm" onClick={() => router.push("/sites/new")} title="Connect a new AIO instance — one instance per Arc cluster">
          <Plus className="h-3.5 w-3.5" />
          New AIO instance
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push("/rollout")}
          title={
            rolloutTargetCount === 0
              ? "Open Rollout (will suggest sites behind target release)"
              : `Roll out to ${rolloutTargetCount} site${rolloutTargetCount === 1 ? "" : "s"}`
          }
        >
          <Rocket className="h-3.5 w-3.5" />
          Roll out…
        </Button>
        <Button variant="default" size="sm">
          <KeyRound className="h-3.5 w-3.5" />
          Manage secrets
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        <Button variant="ghost" size="sm">
          <Code2 className="h-3.5 w-3.5" />
          View as code
        </Button>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-fg-muted">
          {selectedCount > 0 ? (
            <>
              <span>
                <span className="font-semibold text-fg">{selectedCount}</span> selected
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </>
          ) : (
            <span>No selection</span>
          )}
        </div>
      </CommandBar>

      <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-3">
        <span className="text-[12px] font-medium text-fg-muted">Filter</span>
        <div className="relative w-96">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            value={selectorText}
            onChange={(e) => setSelectorText(e.target.value)}
            placeholder="Try: prod   SE   stockholm   plant=assembly"
            list="aio-selector-suggestions"
            className={cn(
              "h-7 w-full rounded-sm border border-border bg-bg pl-7 pr-2 font-mono text-[12px]",
              "outline-none placeholder:text-fg-subtle/70",
              "focus:border-accent focus:ring-1 focus:ring-accent/40",
            )}
          />
          <datalist id="aio-selector-suggestions">
            {suggestions.flatMap((g) =>
              g.values.map((v) => (
                <option key={`${g.key}:${v}`} value={v}>
                  {g.key}
                </option>
              )),
            )}
            {suggestions.flatMap((g) =>
              g.values.map((v) => (
                <option key={`exp:${g.key}:${v}`} value={`${g.key}=${v}`} />
              )),
            )}
          </datalist>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <span className="opacity-70">try</span>
          {["prod", "SE", "stockholm"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => appendToken(t)}
              className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono hover:border-accent hover:text-accent"
            >
              {t}
            </button>
          ))}
        </div>
        <span className="mx-2 h-5 w-px bg-border" />
        <span className="text-[12px] font-medium text-fg-muted">Env</span>
        <Select
          value={filterEnv}
          onChange={(e) => setFilterEnv(e.target.value as "all" | "dev" | "prod")}
        >
          <option value="all">All</option>
          <option value="dev">dev</option>
          <option value="prod">prod</option>
        </Select>
        <span className="text-[12px] font-medium text-fg-muted">Release</span>
        <Select value={filterRelease} onChange={(e) => setFilterRelease(e.target.value)}>
          <option value="all">All</option>
          {RELEASES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id}
            </option>
          ))}
        </Select>
      </div>
    </>
  );
}
