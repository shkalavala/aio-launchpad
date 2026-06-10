"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Network, Rocket, SlidersHorizontal, KeyRound, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the active item even when on a deeper sub-route. */
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  {
    href: "/v2",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/v2" || p === "/v2/",
  },
  {
    href: "/v2/sites",
    label: "Sites",
    icon: Network,
    match: (p) => p.startsWith("/v2/sites"),
  },
  {
    href: "/v2/deployments",
    label: "Deployments",
    icon: Rocket,
    match: (p) => p.startsWith("/v2/deployments"),
  },
  {
    href: "/v2/operations",
    label: "Operations",
    icon: Activity,
    match: (p) => p.startsWith("/v2/operations"),
  },
  {
    href: "/v2/configurations",
    label: "Configurations",
    icon: SlidersHorizontal,
    match: (p) => p.startsWith("/v2/configurations"),
  },
  {
    href: "/v2/secrets",
    label: "Secrets",
    icon: KeyRound,
    match: (p) => p.startsWith("/v2/secrets"),
  },
];

export function V2Nav() {
  const pathname = usePathname() ?? "/v2";
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-border bg-surface px-2 py-3">
      {NAV.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent-subtle text-accent"
                : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
