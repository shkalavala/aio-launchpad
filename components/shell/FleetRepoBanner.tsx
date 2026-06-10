// Persistent banner shown above page content when no fleet repo is connected.
// Hidden on pages that don't depend on the repo (the landing/marketing pages
// and the /connect screen itself).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

// Routes that don't depend on a configured fleet repo.
const HIDE_ON: ReadonlyArray<string | RegExp> = [
  "/",
  "/before",
  "/preflight",
  "/fleet",
  "/connect",
  "/developer",
  /^\/sites/,
];

function shouldHide(path: string): boolean {
  const stripped = path.replace(/\/+$/, "") || "/";
  return HIDE_ON.some((p) =>
    typeof p === "string" ? stripped === p : p.test(stripped),
  );
}

export function FleetRepoBanner() {
  const pathname = usePathname() ?? "/";
  const fleetRepo = useAppStore((s) => s.fleetRepo);

  // The v2 experiment supplies its own shell and git widget.
  if (pathname.startsWith("/v2")) return null;
  if (fleetRepo.selectedRepo) return null;
  if (shouldHide(pathname)) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/40 bg-warning/10 px-4 py-2 text-[12px] text-warning">
      <div className="inline-flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>
          No fleet repo connected — this screen will read from the bundled
          Scale Kit fixtures. Connect a repo to push or deploy.
        </span>
      </div>
      <Link
        href="/connect"
        className="rounded-md border border-warning/60 px-2 py-0.5 text-[11px] font-semibold text-warning hover:bg-warning/15"
      >
        Connect repo →
      </Link>
    </div>
  );
}
