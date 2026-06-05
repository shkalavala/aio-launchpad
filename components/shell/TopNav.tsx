"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, Sparkles, Layers, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { TENANT } from "@/lib/fixtures/tenant";

/**
 * Top-level navigation. Each item carries a `focused` flag marking whether it
 * belongs to the curated "AIO fleet (focused)" lens. In the focused profile
 * the nav is trimmed to the core fleet motion; the "full" profile shows every
 * built surface. Nothing is removed from the app — focused only hides items
 * from this bar.
 */
const NAV: Array<{ href: string; label: string; focused: boolean }> = [
  { href: "/focus", label: "Focus", focused: true },
  { href: "/before", label: "Why", focused: false },
  { href: "/preflight", label: "Pre-flight", focused: false },
  { href: "/fleet", label: "Fleet", focused: true },
  { href: "/releases", label: "Releases", focused: false },
  { href: "/apps", label: "AIO Solutions", focused: true },
  { href: "/resources", label: "Resources", focused: false },
  { href: "/rollout", label: "Rollout", focused: true },
  { href: "/secrets", label: "Secrets", focused: true },
  { href: "/developer", label: "Source", focused: true },
  { href: "/connect", label: "Connect", focused: false },
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
  const manageInfra = useAppStore((s) => s.manageInfra);
  const toggleManageInfra = useAppStore((s) => s.toggleManageInfra);
  const scopeProfile = useAppStore((s) => s.scopeProfile);
  const setScopeProfile = useAppStore((s) => s.setScopeProfile);
  const focused = scopeProfile === "focused";
  const navItems = focused ? NAV.filter((item) => item.focused) : NAV;
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
        {navItems.map((item) => {
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
        <label
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-bg-subtle pl-2.5 pr-1.5 text-[11px] font-medium text-fg-muted"
          title={
            focused
              ? "Focused lens — nav is curated to the core AIO fleet motion. Switch to Full to see every built surface."
              : "Full lens — every built surface is shown, including infra scope and Olympus-style full-stack rollouts."
          }
        >
          <Compass className="h-3 w-3 text-accent" />
          <span className="sr-only">Scenario</span>
          <select
            value={scopeProfile}
            onChange={(e) => setScopeProfile(e.target.value as "focused" | "full")}
            className="h-full cursor-pointer bg-transparent pr-0.5 text-[11px] font-medium text-fg focus:outline-none"
          >
            <option value="focused">AIO fleet (focused)</option>
            <option value="full">Full</option>
          </select>
        </label>
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
        {!focused && (
          <button
            type="button"
            onClick={toggleManageInfra}
            title={
              manageInfra
                ? "Infra scope is on — Launchpad exposes cluster + Arc-agent layers and infra rollout kinds. Click to scope back to AIO only."
                : "Infra scope is off — Launchpad manages AIO only. Click to also expose cluster (e.g. AKS-EE) and Arc-for-servers agent on layered sites."
            }
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
              manageInfra
                ? "border-accent/40 bg-accent-subtle text-accent hover:border-accent"
                : "border-border bg-bg-subtle text-fg-muted hover:border-accent hover:text-accent",
            )}
          >
            <Layers className="h-3 w-3" />
            Manage infra
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                manageInfra ? "bg-accent text-white" : "bg-border-strong text-fg-muted",
              )}
            >
              {manageInfra ? "on" : "off"}
            </span>
          </button>
        )}
        <span
          className="text-[12px] text-fg-muted"
          title="Tenant slug + truncated Azure subscription id. Distro chip (when shown) is a tenant-level fact — the entire fleet runs one Kubernetes distribution. See lib/fixtures/tenant.ts."
        >
          {TENANT.slug} · sub <span className="font-mono">{TENANT.subscriptionLabel}</span>
          {manageInfra && (
            <span className="ml-1.5 rounded-sm border border-border bg-bg-subtle px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-fg-muted">
              {TENANT.distroLabel}
            </span>
          )}
        </span>
      </div>
    </header>
  );
}
