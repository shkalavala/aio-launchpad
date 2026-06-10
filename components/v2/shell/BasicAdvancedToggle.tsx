"use client";

import { useV2Store } from "@/store/useV2Store";
import { cn } from "@/lib/utils";

/**
 * Single Basic/Advanced lens toggle. Replaces the classic app's three-lens
 * model. Basic hides infrastructure detail (cluster/Arc) and advanced actions;
 * Advanced reveals them. The choice persists across reloads.
 */
export function BasicAdvancedToggle() {
  const mode = useV2Store((s) => s.mode);
  const setMode = useV2Store((s) => s.setMode);
  return (
    <div
      className="inline-flex items-center rounded-full border border-border bg-bg-subtle p-0.5 text-[11px] font-medium"
      role="group"
      aria-label="Detail level"
    >
      {(["basic", "advanced"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
          title={
            m === "basic"
              ? "Basic — the core fleet motion. Infrastructure detail stays out of the way."
              : "Advanced — reveals cluster + Arc detail and advanced deployment options."
          }
          className={cn(
            "h-6 rounded-full px-3 capitalize transition-colors",
            mode === m ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
