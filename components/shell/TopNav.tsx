"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const NAV = [
  { href: "/before", label: "Why" },
  { href: "/preflight", label: "Pre-flight" },
  { href: "/fleet", label: "Fleet" },
  { href: "/releases", label: "Releases" },
  { href: "/apps", label: "Apps & Modules" },
  { href: "/rollout", label: "Rollout" },
  { href: "/secrets", label: "Secrets" },
  { href: "/developer", label: "Source" },
];

/**
 * Sub-routes that should highlight a different nav item than their literal
 * URL prefix. Keeps the active page indicator honest when a flow lives
 * under one IA parent.
 */
const SUBROUTE_PARENT: Array<{ match: RegExp; parent: string }> = [
  { match: /^\/sites(\/|$)/, parent: "/fleet" },
];

export function TopNav() {
  const pathname = usePathname();
  const demoMode = useAppStore((s) => s.demoMode);
  const toggleDemoMode = useAppStore((s) => s.toggleDemoMode);
  return (
    <header className="flex h-12 items-center gap-6 border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2 font-semibold text-fg">
        <Cloud className="h-4 w-4 text-accent" />
        <span>AIO Launchpad</span>
        <span className="ml-2 text-[11px] font-normal uppercase tracking-wide text-fg-subtle">
          Preview
        </span>
      </div>
      <nav className="flex h-full items-center gap-1">
        {NAV.map((item) => {
          const subParent = SUBROUTE_PARENT.find((s) => pathname && s.match.test(pathname));
          const active = subParent
            ? subParent.parent === item.href
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-full items-center px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-fg-muted hover:bg-bg-muted hover:text-fg",
              )}
            >
              {item.label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={toggleDemoMode}
          title={
            demoMode
              ? "Demo data is on — the demo fleet is loaded across surfaces. Click to switch to empty tenant."
              : "Demo data is off — surfaces render as a fresh tenant. Click to load the demo fleet."
          }
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
            demoMode
              ? "border-accent/40 bg-accent-subtle text-accent hover:border-accent"
              : "border-border bg-bg-subtle text-fg-muted hover:border-accent hover:text-accent",
          )}
        >
          <Sparkles className="h-3 w-3" />
          Demo data
          <span
            className={cn(
              "ml-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
              demoMode ? "bg-accent text-white" : "bg-border-strong text-fg-muted",
            )}
          >
            {demoMode ? "on" : "off"}
          </span>
        </button>
        <span className="text-[12px] text-fg-muted">
          contoso-industries · sub <span className="font-mono">0000…0000</span>
        </span>
      </div>
    </header>
  );
}
