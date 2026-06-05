"use client";

import Link from "next/link";
import {
  Server,
  Boxes,
  Rocket,
  KeyRound,
  GitBranch,
  MapPinPlus,
  ArrowRight,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

/**
 * /focus — the curated landing for the "AIO fleet (focused)" lens.
 *
 * Additive surface: it deep-links the existing screens that make up the core
 * AIO fleet motion and frames them against the combined-product spine
 * (DOE captures, Launchpad propagates, Scale Kit applies, git is the seam).
 * Nothing here is new functionality — it is a guided entry point. The full
 * app, including pre-flight, releases, resources, and connect, stays one
 * click away via the Full lens in the top bar.
 */
const TOUR: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  stage: string;
}> = [
  {
    href: "/fleet",
    label: "Fleet",
    icon: Server,
    blurb:
      "Every site in one pane, with the ISA-95 hierarchy, the release each site pins to, and live health.",
    stage: "See the estate",
  },
  {
    href: "/apps",
    label: "AIO Solutions",
    icon: Boxes,
    blurb:
      "The catalog of what you can deploy — sample apps, ARM modules, and customer-authored solutions.",
    stage: "Pick what to deploy",
  },
  {
    href: "/rollout",
    label: "Rollout",
    icon: Rocket,
    blurb:
      "Propagate a change through rings with gates, pause, health verification, and blast-radius control.",
    stage: "Roll out safely",
  },
  {
    href: "/secrets",
    label: "Secrets",
    icon: KeyRound,
    blurb:
      "Fleet-wide secret sync — declare once, reconcile to every targeted site from the central Key Vault.",
    stage: "Wire the secrets",
  },
  {
    href: "/developer",
    label: "Source",
    icon: GitBranch,
    blurb:
      "Git as the source of truth — browse the manifests and Bicep the siteops engine consumes and applies.",
    stage: "Git is the seam",
  },
  {
    href: "/sites/new",
    label: "Add a site",
    icon: MapPinPlus,
    blurb:
      "Stand up a new factory: pick existing Azure dependencies or let the deploy create them, then onboard.",
    stage: "Onboard a factory",
  },
];

export default function FocusPage() {
  const setScopeProfile = useAppStore((s) => s.setScopeProfile);
  return (
    <section className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-accent">
          <Compass className="h-3.5 w-3.5" />
          AIO fleet — focused lens
        </div>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight text-fg">
          Stand up, configure, upgrade, and roll back AIO across the fleet.
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-fg-muted">
          The combined product is one pipeline:{" "}
          <span className="font-medium text-fg">DOE captures</span> operator intent as git artifacts,{" "}
          <span className="font-medium text-fg">Launchpad propagates</span> changes through rings with
          day-2 safety, and <span className="font-medium text-fg">Scale Kit applies</span> them by
          resolving the ISA-95 hierarchy. Git is the seam. Start at any surface below.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOUR.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={cn(
                  "group flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors",
                  "hover:border-accent hover:bg-accent-subtle/30",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent-subtle text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {card.stage}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <h2 className="text-[15px] font-semibold text-fg">{card.label}</h2>
                  <ArrowRight className="h-3.5 w-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{card.blurb}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-7 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-subtle px-4 py-3 text-[12px] text-fg-muted">
          <span>
            Looking for pre-flight, releases, resources, or connect? They are preserved under the{" "}
            <span className="font-medium text-fg">Full</span> lens.
          </span>
          <button
            type="button"
            onClick={() => setScopeProfile("full")}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Switch to Full
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
