"use client";

import { cn } from "@/lib/utils";

interface SiteFiltersProps {
  regions: { slug: string; label: string }[];
  environments: string[];
  activeRegion: string | null;
  activeEnv: string | null;
  onRegion: (slug: string | null) => void;
  onEnv: (env: string | null) => void;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-3 text-[12px] font-medium transition-colors",
        active
          ? "border-accent bg-accent-subtle text-accent"
          : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/** Label-based filtering for the sites view: region and environment. */
export function SiteFilters({
  regions,
  environments,
  activeRegion,
  activeEnv,
  onRegion,
  onEnv,
}: SiteFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Region</span>
        <Chip active={activeRegion === null} onClick={() => onRegion(null)}>
          All
        </Chip>
        {regions.map((r) => (
          <Chip key={r.slug} active={activeRegion === r.slug} onClick={() => onRegion(r.slug)}>
            {r.label}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          Environment
        </span>
        <Chip active={activeEnv === null} onClick={() => onEnv(null)}>
          All
        </Chip>
        {environments.map((e) => (
          <Chip key={e} active={activeEnv === e} onClick={() => onEnv(e)}>
            {e}
          </Chip>
        ))}
      </div>
    </div>
  );
}
