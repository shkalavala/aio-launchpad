"use client";

import { useState } from "react";
import { ChevronRight, Plus, Pencil, Minus } from "lucide-react";
import { objectDiff, lineDiff, toYamlish, type FieldDiff } from "@/lib/diff";
import { cn } from "@/lib/utils";

function fmt(v: unknown): string {
  if (v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const STATUS_META: Record<
  FieldDiff["status"],
  { tone: string; icon: typeof Plus | null; label: string }
> = {
  added: { tone: "text-success-fg", icon: Plus, label: "added" },
  modified: { tone: "text-warning-fg", icon: Pencil, label: "modified" },
  removed: { tone: "text-danger-fg", icon: Minus, label: "removed" },
  unchanged: { tone: "text-fg-muted", icon: null, label: "" },
};

interface DiffViewProps {
  base: Record<string, unknown>;
  override: Record<string, unknown>;
  baseLabel?: string;
  overrideLabel?: string;
  /** Show unchanged rows too (default false: changes only). */
  showUnchanged?: boolean;
}

/**
 * Side-by-side field diff between a global template and a site override.
 * Added / modified / removed are colour-coded. Raw YAML stays hidden behind an
 * expander per the v2 "avoid raw YAML unless asked" constraint.
 */
export function DiffView({
  base,
  override,
  baseLabel = "Global template",
  overrideLabel = "Site override",
  showUnchanged = false,
}: DiffViewProps) {
  const [showYaml, setShowYaml] = useState(false);
  const [showAll, setShowAll] = useState(showUnchanged);

  const all = objectDiff(base, override);
  const rows = showAll ? all : all.filter((d) => d.status !== "unchanged");
  const changeCount = all.filter((d) => d.status !== "unchanged").length;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          <span className="inline-flex items-center gap-1">
            <Plus className="h-3 w-3 text-success-fg" /> added
          </span>
          <span className="inline-flex items-center gap-1">
            <Pencil className="h-3 w-3 text-warning-fg" /> modified
          </span>
          <span className="inline-flex items-center gap-1">
            <Minus className="h-3 w-3 text-danger-fg" /> removed
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <label className="inline-flex cursor-pointer items-center gap-1 text-fg-muted">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-3 w-3"
            />
            Show unchanged
          </label>
          <button
            type="button"
            onClick={() => setShowYaml((v) => !v)}
            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", showYaml && "rotate-90")} />
            {showYaml ? "Hide" : "Expand"} YAML
          </button>
        </div>
      </div>

      {!showYaml ? (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-fg-subtle">
              <th className="px-3 py-1.5 font-medium">Field</th>
              <th className="px-3 py-1.5 font-medium">{baseLabel}</th>
              <th className="px-3 py-1.5 font-medium">{overrideLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const meta = STATUS_META[d.status];
              const Icon = meta.icon;
              return (
                <tr key={d.key} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-mono text-[11px] text-fg">{d.key}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-fg-muted">
                    {d.status === "added" ? <span className="text-fg-subtle">—</span> : fmt(d.before)}
                  </td>
                  <td className={cn("px-3 py-1.5 font-mono text-[11px]", meta.tone)}>
                    <span className="inline-flex items-center gap-1">
                      {Icon && <Icon className="h-3 w-3" />}
                      {d.status === "removed" ? <span className="text-fg-subtle">—</span> : fmt(d.after)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-[12px] text-fg-subtle">
                  No differences — the site matches the global template.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <pre className="overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
          {lineDiff(toYamlish(base), toYamlish(override)).map((l, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre",
                l.status === "added" && "bg-success-subtle text-success-fg",
                l.status === "removed" && "bg-danger-subtle text-danger-fg",
                l.status === "unchanged" && "text-fg-muted",
              )}
            >
              <span className="select-none pr-2 text-fg-subtle">
                {l.status === "added" ? "+" : l.status === "removed" ? "-" : " "}
              </span>
              {l.text}
            </div>
          ))}
        </pre>
      )}

      <div className="border-t border-border px-3 py-1.5 text-[11px] text-fg-subtle">
        {changeCount} field{changeCount === 1 ? "" : "s"} differ from the global template.
      </div>
    </div>
  );
}
