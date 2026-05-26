"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CommandBar } from "@/components/shell/CommandBar";
import { useAppStore } from "@/store/useAppStore";
import {
  buildPendingFleetSite,
  deriveSiteName,
  validateNewSite,
  type NewSiteInput,
} from "@/lib/newsite";
import { DEFAULT_RELEASE } from "@/lib/fixtures/releases";
import { AddSiteForm, DEFAULT_NEW_SITE } from "@/components/newsite/AddSiteForm";
import { InheritancePreview } from "@/components/newsite/InheritancePreview";
import { NewSiteYamlBlock } from "@/components/newsite/NewSiteYamlBlock";
import { AddSiteProgress } from "@/components/newsite/AddSiteProgress";
import {
  SitePrereqsPanel,
  DEFAULT_SITE_PREREQS,
  type SitePrereqsState,
} from "@/components/newsite/SitePrereqsPanel";

/**
 * Screen 2 — Add a site.
 *
 * Scope discipline (screen-recommendation.md §3 + persona-map.md §3.2):
 *   - Form is intentionally small: pick a geo, an environment, optionally a
 *     plant. Everything else is derived from the manifest ancestry.
 *   - No Day-1 prereq editor. UAMI / Key Vault / VNet / Arc onboarding were
 *     settled by Central IT before this site arrived in Launchpad.
 *   - No component-version pins. One AIO release per site.
 *   - On "Deploy", a mock progress sequence runs (validate → provision →
 *     install → verify) and the site is added to the pendingSites overlay so
 *     /fleet shows it immediately afterwards.
 */
export default function NewSitePage() {
  const router = useRouter();
  const pendingSites = useAppStore((s) => s.pendingSites);
  const addPendingSite = useAppStore((s) => s.addPendingSite);
  const setRolloutKind = useAppStore((s) => s.setRolloutKind);

  const [input, setInput] = useState<NewSiteInput>(DEFAULT_NEW_SITE);
  const [prereqs, setPrereqs] = useState<SitePrereqsState>(DEFAULT_SITE_PREREQS);
  const [runToken, setRunToken] = useState(0);
  const [completed, setCompleted] = useState(false);

  const pendingNames = useMemo(() => pendingSites.map((p) => p.site.name), [pendingSites]);
  const validation = useMemo(
    () => validateNewSite(input, pendingNames),
    [input, pendingNames],
  );

  const locked = runToken > 0 && !completed;
  const derivedName = deriveSiteName(input);

  const onDeploy = () => {
    if (!validation.ok) return;
    setCompleted(false);
    setRunToken((t) => t + 1);
  };

  const onComplete = () => {
    addPendingSite(buildPendingFleetSite(input));
    setCompleted(true);
  };

  const onReset = () => {
    setInput(DEFAULT_NEW_SITE);
    setPrereqs(DEFAULT_SITE_PREREQS);
    setRunToken(0);
    setCompleted(false);
  };

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
        <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
          <Link href="/fleet" className="hover:text-accent">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/fleet" className="hover:text-accent">Fleet</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-fg">New AIO instance</span>
        </nav>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight text-fg">Add an AIO instance</h1>
            <p className="text-[12px] text-fg-muted">
              Connect a new AIO instance — one instance per Arc-connected cluster. The factory
              site, plant, and environment scope this instance under an existing geo so it
              inherits the right manifest defaults. Identity, networking, and Key Vault wiring
              are tenant-scoped — pick existing references or have them created as part of deploy.
            </p>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Scope: this flow adds one leaf manifest. You can introduce a new geo or plant slug
              inline — it ships standalone (or inherits whichever ancestor templates already exist).
              To get true shared defaults at the geo / plant tier, add the corresponding
              <span className="font-mono"> shared/&lt;geo&gt;.yaml</span> /
              <span className="font-mono"> shared/&lt;geo&gt;-&lt;plant&gt;.yaml</span> in your Scale Kit repo first.
            </p>
          </div>
        </div>
      </div>

      <CommandBar>
        <Button
          variant="primary"
          size="sm"
          onClick={onDeploy}
          disabled={!validation.ok || locked}
          title={
            validation.collision
              ? `${validation.collision.name} already exists — open it from the form or pick a different combination`
              : !validation.ok
                ? validation.errors[0] ?? "Resolve form errors"
                : locked
                  ? "Deploy in progress"
                  : `Deploy ${derivedName} to AIO ${input.aioRelease}`
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Deploy instance
        </Button>
        {validation.collision && (
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/fleet?site=${encodeURIComponent(validation.collision!.name)}`)}
            disabled={locked}
            title={`Open ${validation.collision.name} in the fleet view`}
          >
            Open {validation.collision.name}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onReset} disabled={locked}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <span className="text-[12px] text-fg-muted">
          Target release{" "}
          <span className="font-mono text-fg">
            {input.aioRelease}
            {input.aioRelease === DEFAULT_RELEASE.id ? " (current)" : ""}
          </span>
        </span>
        <div className="ml-auto flex items-center gap-3 text-[12px] text-fg-muted">
          {completed && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRolloutKind("install");
                  router.push("/rollout");
                }}
                title="Open Rollout pre-set to the install kind"
              >
                Install AIO on more sites
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/fleet")}
                title="See the new site in the fleet view"
              >
                View in fleet
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <span>
            <span className="font-semibold text-fg">{pendingSites.length}</span> pending this session
          </span>
        </div>
      </CommandBar>

      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
          <AddSiteForm
            value={input}
            onChange={setInput}
            pendingNames={pendingNames}
            locked={locked}
          />
          <SitePrereqsPanel value={prereqs} onChange={setPrereqs} locked={locked} />
          <InheritancePreview input={input} />
          {validation.ok && <NewSiteYamlBlock input={input} />}
          <AddSiteProgress runToken={runToken} onComplete={onComplete} />
        </div>
      </div>
    </section>
  );
}
