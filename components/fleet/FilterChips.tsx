"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { parseSelector, removeSelectorClause, buildLabelIndex } from "@/lib/selector";
import { useFleet } from "@/lib/useFleet";
import { cn } from "@/lib/utils";

interface Chip {
  kind: "selector" | "env" | "release";
  key: string;
  value: string;
  onRemove: () => void;
}

export function FilterChips() {
  const selectorText = useAppStore((s) => s.selectorText);
  const setSelectorText = useAppStore((s) => s.setSelectorText);
  const filterEnv = useAppStore((s) => s.filterEnv);
  const setFilterEnv = useAppStore((s) => s.setFilterEnv);
  const filterRelease = useAppStore((s) => s.filterRelease);
  const setFilterRelease = useAppStore((s) => s.setFilterRelease);

  const fleet = useFleet();
  const labelIndex = useMemo(() => buildLabelIndex(fleet), [fleet]);

  const selectorChips: Chip[] = parseSelector(selectorText, labelIndex).map((c) => ({
    kind: "selector",
    key: c.key,
    value: c.value,
    onRemove: () => setSelectorText(removeSelectorClause(selectorText, c.key, c.value, labelIndex)),
  }));

  const dropdownChips: Chip[] = [];
  if (filterEnv !== "all") {
    dropdownChips.push({
      kind: "env",
      key: "env",
      value: filterEnv,
      onRemove: () => setFilterEnv("all"),
    });
  }
  if (filterRelease !== "all") {
    dropdownChips.push({
      kind: "release",
      key: "release",
      value: filterRelease,
      onRemove: () => setFilterRelease("all"),
    });
  }

  const chips = [...selectorChips, ...dropdownChips];
  if (chips.length === 0) return null;

  const clearAll = () => {
    setSelectorText("");
    setFilterEnv("all");
    setFilterRelease("all");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-bg-subtle px-3 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
        Filters
      </span>
      {chips.map((chip, i) => (
        <Chip key={`${chip.kind}:${chip.key}:${chip.value}:${i}`} chip={chip} />
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-1 text-[11px] font-medium text-fg-muted hover:text-accent"
      >
        Clear all
      </button>
      <span className="ml-auto text-[11px] text-fg-subtle">
        Equivalent to <span className="font-mono">siteops -l {selectorChips.map((c) => `${c.key}=${c.value}`).join(",") || "…"}</span>
      </span>
    </div>
  );
}

function Chip({ chip }: { chip: Chip }) {
  // Selector chips get accent treatment (they're the Scale Kit -l language);
  // dropdown chips are neutral.
  const isSelector = chip.kind === "selector";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm border pl-2 pr-1 text-[12px]",
        isSelector
          ? "border-accent/30 bg-accent-subtle text-accent"
          : "border-border bg-surface text-fg",
      )}
    >
      <span className="font-mono">
        <span className="opacity-70">{chip.key}=</span>
        <span className="font-semibold">{chip.value}</span>
      </span>
      <button
        type="button"
        onClick={chip.onRemove}
        aria-label={`Remove ${chip.key}=${chip.value}`}
        className={cn(
          "ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm",
          isSelector ? "hover:bg-accent/20" : "hover:bg-bg-muted",
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
