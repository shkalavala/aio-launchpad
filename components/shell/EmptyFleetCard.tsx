"use client";

import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";

/**
 * Shared "no sites in fleet yet" placeholder, used by surfaces that are
 * meaningless without at least one site (Fleet, Upgrade, Secrets). Renders a
 * centered card with the standard onboarding CTAs (pre-flight, add first
 * site, load demo).
 *
 * The copy is parameterised per surface so each page can frame the empty
 * state in its own vocabulary.
 */
export function EmptyFleetCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="max-w-[520px] rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-accent">
          <Plus className="h-5 w-5" />
        </div>
        <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
        <p className="mx-auto mt-2 max-w-[420px] text-[13px] text-fg-muted">{body}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/preflight">
            <Button variant="default" size="sm">Pre-flight checks</Button>
          </Link>
          <Link href="/sites/new">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add your first site
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setDemoMode(true)}
          className="mx-auto mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-subtle hover:text-accent"
        >
          <Sparkles className="h-3 w-3" />
          Or load the demo fleet
        </button>
      </div>
    </div>
  );
}
