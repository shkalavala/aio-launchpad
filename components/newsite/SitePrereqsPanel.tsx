"use client";

import { useMemo, useState } from "react";
import { ChevronDown, CircleCheck, Plus, ExternalLink, Code } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Vanilla-AIO pre-flight panel on /sites/new.
 *
 * Each Day-1 prereq for a brand-new site is one of two things:
 *   - "Use existing"   — Central IT (or a prior tenant project) already
 *                        owns this resource; paste the name / resource ID.
 *   - "Created by the deploy" — the deploy provisions this resource from the
 *                        parameters Launchpad authors; no manual step. The
 *                        underlying command stays available behind a
 *                        "view as code" escape hatch. (UI stub — the prototype
 *                        does not yet wire to a real deployment workflow.)
 *
 * This panel is *not* the tenant-wide /preflight gate (which is one-time,
 * tenant-scoped). It's the per-site pick of where each underlying Azure
 * dependency comes from for this specific greenfield site.
 *
 * Mirrors the "what survives reinstall" inventory in day2-reality.md §4 —
 * those are the bits that need explicit per-site provenance.
 */
export interface SitePrereqsState {
  arcCluster: PrereqChoice;
  uamiComponents: PrereqChoice;
  uamiSecrets: PrereqChoice;
  keyVault: PrereqChoice;
  storageAccount: PrereqChoice;
}

export interface PrereqChoice {
  source: "existing" | "create";
  existingRef?: string;
}

interface PrereqDef {
  id: keyof SitePrereqsState;
  label: string;
  why: string;
  examplePlaceholder: string;
  /** If true, the Create-as-part-of-deploy column is hidden (must pre-exist). */
  pickOnly?: boolean;
  /** Inline `az` snippet shown in the Create column for copy/paste. */
  createCmd?: string;
  docsHref: string;
  docsLabel: string;
}

const PREREQS: PrereqDef[] = [
  {
    id: "arcCluster",
    label: "Arc-connected cluster",
    why: "AIO installs onto an existing Arc-enabled Kubernetes cluster (with OIDC issuer + workload identity enabled). The cluster itself is what brings on-prem hardware into Azure — it can’t be provisioned from this UI. Onboard it via Arc, then come back.",
    examplePlaceholder: "/subscriptions/…/connectedClusters/hamburg-edge-cluster",
    pickOnly: true,
    docsHref: "https://learn.microsoft.com/azure/azure-arc/kubernetes/quickstart-connect-cluster",
    docsLabel: "Arc connect quickstart",
  },
  {
    id: "uamiComponents",
    label: "UAMI · components",
    why: "Federated managed identity used by AIO core components (broker, dataflow runtime). One per site or shared across sites in the same Key Vault tenancy.",
    examplePlaceholder: "id-aio-components-prod",
    createCmd: "az identity create -g <rg> -n id-aio-components",
    docsHref: "https://learn.microsoft.com/azure/iot-operations/secure-iot-ops/howto-secret-sync",
    docsLabel: "Secret sync setup",
  },
  {
    id: "uamiSecrets",
    label: "UAMI · secrets",
    why: "Federated managed identity used by the secret-sync controller to read this site's secrets from the central Key Vault.",
    examplePlaceholder: "id-aio-secrets-prod",
    createCmd: "az identity create -g <rg> -n id-aio-secrets",
    docsHref: "https://learn.microsoft.com/azure/iot-operations/secure-iot-ops/howto-secret-sync",
    docsLabel: "Secret sync setup",
  },
  {
    id: "keyVault",
    label: "Key Vault (RBAC mode)",
    why: "Backs the site's secret-sync source. One central KV usually serves the whole tenant; only pick Create if this site is the first one.",
    examplePlaceholder: "kv-aio-central",
    createCmd: "az keyvault create -g <rg> -n kv-aio-<site> --enable-rbac-authorization",
    docsHref: "https://learn.microsoft.com/azure/key-vault/general/rbac-guide",
    docsLabel: "Key Vault RBAC docs",
  },
  {
    id: "storageAccount",
    label: "Storage account (HNS)",
    why: "Hierarchical-namespace storage account backs the Schema Registry. Required for every AIO deployment.",
    examplePlaceholder: "staioschemas01",
    createCmd: "az storage account create -g <rg> -n staioschemas<n> --hns true --sku Standard_LRS",
    docsHref: "https://learn.microsoft.com/azure/iot-operations/deploy-iot-ops/howto-prepare-cluster",
    docsLabel: "AIO cluster prep",
  },
];

export const DEFAULT_SITE_PREREQS: SitePrereqsState = {
  arcCluster: { source: "existing", existingRef: "" },
  uamiComponents: { source: "existing", existingRef: "" },
  uamiSecrets: { source: "existing", existingRef: "" },
  keyVault: { source: "existing", existingRef: "" },
  storageAccount: { source: "existing", existingRef: "" },
};

interface Props {
  value: SitePrereqsState;
  onChange: (next: SitePrereqsState) => void;
  locked: boolean;
}

export function SitePrereqsPanel({ value, onChange, locked }: Props) {
  const [open, setOpen] = useState(true);

  const counts = useMemo(() => {
    let existing = 0;
    let create = 0;
    for (const def of PREREQS) {
      const choice = value[def.id];
      if (choice.source === "existing") existing++;
      else create++;
    }
    return { existing, create };
  }, [value]);

  const set = (id: keyof SitePrereqsState, patch: Partial<PrereqChoice>) =>
    onChange({ ...value, [id]: { ...value[id], ...patch } });

  return (
    <section className="rounded border border-border bg-surface">
      <header
        className="flex cursor-pointer items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-baseline gap-2">
          <h2 className="text-[14px] font-semibold text-fg">Site prerequisites</h2>
          <span className="text-[11px] text-fg-muted">
            For each Azure dependency, use existing or let the deploy create it.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-fg-muted">
          <span>
            <span className="font-semibold text-fg">{counts.existing}</span> existing
            <span className="mx-1 text-fg-subtle">·</span>
            <span className="font-semibold text-fg">{counts.create}</span> create
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-fg-muted transition-transform", open && "rotate-180")}
          />
        </div>
      </header>

      {open && (
        <div className="divide-y divide-border-subtle">
          {PREREQS.map((def) => {
            const choice = value[def.id];
            return (
              <div
                key={def.id}
                className={cn(
                  "grid gap-3 px-4 py-3",
                  def.pickOnly
                    ? "md:grid-cols-[220px_1fr]"
                    : "md:grid-cols-[220px_1fr_1fr]",
                )}
              >
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-fg">{def.label}</p>
                  <p className="text-[11px] leading-snug text-fg-subtle">{def.why}</p>
                  <a
                    href={def.docsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-accent hover:underline"
                  >
                    {def.docsLabel}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>

                <PrereqOption
                  active={choice.source === "existing"}
                  title={def.pickOnly ? "Pick existing" : "Use existing"}
                  subtitle={
                    def.pickOnly
                      ? "Only option — this prereq has to exist before AIO can install."
                      : "Already exists in this tenant — pick or paste a reference."
                  }
                  icon={<CircleCheck className="h-3.5 w-3.5" />}
                  onSelect={() => set(def.id, { source: "existing" })}
                  locked={locked}
                >
                  <input
                    value={choice.existingRef ?? ""}
                    placeholder={def.examplePlaceholder}
                    onChange={(e) => set(def.id, { existingRef: e.target.value })}
                    disabled={locked || choice.source !== "existing"}
                    className="mt-1.5 h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[11px] text-fg disabled:opacity-50"
                  />
                </PrereqOption>

                {!def.pickOnly && (
                  <div className="space-y-1.5">
                    <PrereqOption
                      active={choice.source === "create"}
                      title="Created by the deploy"
                      subtitle="The deploy provisions this for you from the parameters Launchpad authors — no manual step."
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onSelect={() => set(def.id, { source: "create" })}
                      locked={locked}
                    />
                    {def.createCmd && choice.source === "create" && (
                      <ViewAsCode cmd={def.createCmd} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PrereqOption({
  active,
  title,
  subtitle,
  icon,
  onSelect,
  locked,
  children,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onSelect: () => void;
  locked: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-accent bg-accent-subtle/40 ring-1 ring-accent/30"
          : "border-border bg-bg hover:border-accent/50",
      )}
    >
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-fg">
        <span className={active ? "text-accent" : "text-fg-muted"}>{icon}</span>
        {title}
      </div>
      <p className="text-[10px] leading-snug text-fg-subtle">{subtitle}</p>
      {children}
    </button>
  );
}

function ViewAsCode({ cmd }: { cmd: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pl-0.5">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-fg-muted transition-colors hover:text-accent"
      >
        <Code className="h-2.5 w-2.5" />
        {show ? "Hide code" : "View as code"}
      </button>
      {show && (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-border bg-bg-subtle p-1.5 font-mono text-[10px] text-fg-muted">
          {cmd}
        </pre>
      )}
    </div>
  );
}
