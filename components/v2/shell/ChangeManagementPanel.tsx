"use client";

import { useState, useRef, useEffect } from "react";
import { GitBranch, ChevronDown } from "lucide-react";
import { useV2Store, selectChangeState } from "@/store/useV2Store";
import { shortSha } from "@/lib/git/fixtures";
import { ChangeStatePill } from "./ChangeStatePill";
import { ChangeManagementFlyout } from "./ChangeManagementFlyout";
import { cn } from "@/lib/utils";

/**
 * Header git widget: branch, last commit, and the repo change-state pill.
 * Opens the full change-management flyout (pending / incoming / drift).
 */
export function ChangeManagementPanel() {
  const repo = useV2Store((s) => s.repo);
  const state = useV2Store(selectChangeState);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-bg-subtle px-2.5 text-[12px] transition-colors hover:border-border-strong",
          open && "border-border-strong",
        )}
        title="Change management — Git is the source of truth for this fleet."
      >
        <GitBranch className="h-3.5 w-3.5 text-fg-muted" />
        <span className="font-medium text-fg">{repo.branch}</span>
        <span className="font-mono text-fg-subtle">{shortSha(repo.lastCommit.sha)}</span>
        <ChangeStatePill state={state} />
        <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 rounded-lg border border-border bg-surface shadow-depth16">
          <ChangeManagementFlyout />
        </div>
      )}
    </div>
  );
}
