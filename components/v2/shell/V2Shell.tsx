"use client";

import Link from "next/link";
import { Cloud, ArrowLeft } from "lucide-react";
import { V2Nav } from "./V2Nav";
import { ChangeManagementPanel } from "./ChangeManagementPanel";
import { BasicAdvancedToggle } from "./BasicAdvancedToggle";

/**
 * Full-screen shell for the v2 experiment. Renders its own header (logo, lens
 * toggle, change-management widget, back-to-classic link) and a left nav. The
 * classic TopNav/FleetRepoBanner suppress themselves on /v2 routes, so this is
 * the only chrome shown here.
 */
export function V2Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
        <div className="flex items-center gap-2 font-semibold text-fg">
          <Cloud className="h-4 w-4 text-accent" />
          <span>AIO Launchpad</span>
          <span className="ml-1 rounded-sm bg-accent-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            v2 Preview
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <BasicAdvancedToggle />
          <ChangeManagementPanel />
          <Link
            href="/fleet"
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            title="Return to the current (classic) experience. Nothing here has changed it."
          >
            <ArrowLeft className="h-3 w-3" />
            Back to classic
          </Link>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <V2Nav />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
