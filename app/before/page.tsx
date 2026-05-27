"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Terminal,
  ListChecks,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Screen 0 — "Before" walkthrough. Frames why Launchpad exists, grounded in
 * context/before-flow/current-aio-deploy-commands.md. Pure narrative — the
 * actionable per-tenant pre-flight checklist lives at /preflight. The final
 * step CTA routes into /fleet.
 */
export default function BeforePage() {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const current = STEPS[step];

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Header strip */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Why · what AIO deployment looks like today, and the gaps Scale Kit and Launchpad fill
            </p>
            <h1 className="mt-1 text-[20px] font-semibold leading-tight text-fg">
              {current.title}
            </h1>
            <p className="mt-1 text-[13px] text-fg-muted">{current.subtitle}</p>
          </div>
          <StepDots count={total} active={step} onPick={setStep} />
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-6">
          {current.render()}
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t border-border bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prev} disabled={step === 0}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>

          <span className="text-[12px] text-fg-subtle">
            Step <span className="font-semibold text-fg">{step + 1}</span> of {total}
          </span>

          {step < total - 1 ? (
            <Button variant="primary" size="sm" onClick={next}>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Link href="/fleet">
              <Button variant="primary" size="sm">
                Enter the Launchpad
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className={cn(
            "h-2 rounded-full transition-all",
            i === active ? "w-8 bg-accent" : "w-2 bg-border-strong hover:bg-fg-subtle",
          )}
          aria-label={`Go to step ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step content
// ---------------------------------------------------------------------------

interface Step {
  title: string;
  subtitle: string;
  render: () => JSX.Element;
}

const STEPS: Step[] = [
  {
    title: "Step 1 — Prepare the cluster",
    subtitle:
      "Before any AIO command runs, the cluster and subscription have to be in a very specific shape. The list isn't long — it's just precise, undocumented in one place, and easy to get wrong.",
    render: () => <PrereqStep />,
  },
  {
    title: "Step 2 — Install AIO via the CLI",
    subtitle:
      "Once prereqs are in place, the core install is about 14 az commands per cluster plus a per-secret loop. Identity wiring, federation, and role assignments are largely abstracted inside `az iot ops init` / `create` / `secretsync enable` — the pain is ordering them, threading the right IDs through, and repeating it per site. (Post-install per-site config — dataflow profiles, asset endpoints, OPC UA — is its own surface, not counted here.)",
    render: () => <CommandStep />,
  },
  {
    title: "Step 3 — Now do it 28 times. Then upgrade them next quarter.",
    subtitle:
      "Per-cluster work multiplies linearly with the fleet. Decisions made today get re-litigated on every release. There's no rollup, no diff, no rings — just more clusters and more terminals.",
    render: () => <MathStep />,
  },
];

// ---------------------------------------------------------------------------
// Step 1 — Prereqs
// ---------------------------------------------------------------------------

// Ordered chronologically: subscription RPs -> operator tooling -> cluster ->
// identity -> secrets infra -> schema registry. Each block is what you'd do
// before the next can succeed.
const PREREQS: { label: string; pain: string; group: string }[] = [
  // 1. Subscription-level RP registrations (one-time per subscription)
  { group: "Subscription RPs", label: "Microsoft.ExtendedLocation RP registered (custom locations)", pain: "Silent 'resource not found' downstream if missing" },
  { group: "Subscription RPs", label: "Microsoft.IoTOperations RP registered", pain: "Per-subscription one-time, easy to miss in new subs" },
  { group: "Subscription RPs", label: "Microsoft.DeviceRegistry RP registered", pain: "Same" },
  { group: "Subscription RPs", label: "Microsoft.SecretSyncController RP registered", pain: "Same" },

  // 2. Laptop / operator tooling
  { group: "Operator tooling", label: "Azure CLI + azure-iot-ops extension installed", pain: "Version drift across operators causes silent flag differences" },
  { group: "Operator tooling", label: "Azure CLI connectedk8s extension installed", pain: "Required before any Arc connect command runs" },
  { group: "Operator tooling", label: "kubectl + helm installed, kubeconfig pointed at the cluster", pain: "Per-laptop setup; no central enforcement" },

  // 3. Cluster
  { group: "Cluster", label: "Kubernetes cluster (AKS EE / K3s / RKE2)", pain: "Distro choice not obvious; some break on AIO updates" },
  { group: "Cluster", label: "Connected to Azure Arc with custom locations enabled", pain: "Two-step enable; easy to forget --enable-custom-locations" },
  { group: "Cluster", label: "OIDC issuer enabled on the cluster", pain: "Required before identity federation works" },
  { group: "Cluster", label: "Workload identity federation enabled", pain: "Same az connectedk8s update — but separate flag" },

  // 4. Identities + secrets infra
  { group: "Identity & secrets", label: "User-assigned managed identity for AIO components", pain: "Two MIs needed, often confused" },
  { group: "Identity & secrets", label: "User-assigned managed identity for AIO secrets", pain: "Distinct from the components MI" },
  { group: "Identity & secrets", label: "Azure Key Vault in the same tenant (RBAC mode)", pain: "Access-policy mode silently breaks secret sync" },

  // 5. Schema Registry + backing storage
  { group: "Schema Registry", label: "Storage account with hierarchical namespace", pain: "Schema Registry create fails without HNS enabled" },
  { group: "Schema Registry", label: "Schema Registry resource", pain: "Resource ID feeds into az iot ops create later" },
];

function PrereqStep() {
  // Group while preserving insertion order.
  const groups = PREREQS.reduce<Record<string, typeof PREREQS>>((acc, p) => {
    (acc[p.group] ||= []).push(p);
    return acc;
  }, {});
  const groupOrder = Array.from(new Set(PREREQS.map((p) => p.group)));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded border border-border bg-surface">
        <header className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <ListChecks className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-fg">
            Per-cluster prerequisites · in the order you actually do them
          </h2>
          <span className="ml-auto text-[12px] text-fg-muted">{PREREQS.length} items</span>
        </header>
        <div className="divide-y divide-border-subtle">
          {groupOrder.map((groupName, gi) => (
            <div key={groupName}>
              <div className="flex items-baseline gap-2 bg-bg-subtle px-4 py-1.5">
                <span className="font-mono text-[11px] text-fg-subtle">{gi + 1}.</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                  {groupName}
                </span>
              </div>
              <ul>
                {groups[groupName].map((p) => (
                  <li key={p.label} className="flex items-start gap-3 px-4 py-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-fg">{p.label}</p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">{p.pain}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-3">
        <div className="rounded border border-warning/30 bg-warning-subtle p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-fg" />
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-warning-fg">
              At fleet scale
            </h3>
          </div>
          <p className="text-[13px] text-fg">
            A mid-size manufacturer typically runs <span className="font-semibold">25–30 factories</span>.
            Subscription RPs are a one-time setup — the <span className="font-semibold">per-cluster</span> work
            (tooling, cluster, Arc, identities, KV, Schema Registry) is what multiplies, and it's where
            coordination breaks down.
          </p>
        </div>

        <div className="rounded border border-border bg-bg-subtle p-4">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-fg-muted">
            Why the order matters
          </h3>
          <ul className="space-y-1.5 text-[12px] text-fg-muted">
            <li>• RPs are <span className="text-fg">subscription</span>-scoped — registered once at the tenant level, before any operator starts</li>
            <li>• Without the CLI extensions, you can’t run step 1</li>
            <li>• OIDC must exist <span className="text-fg">before</span> identity federation</li>
            <li>• Schema Registry needs the storage account, not the other way around</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Commands
// ---------------------------------------------------------------------------

interface CmdLine {
  step: number;
  desc: string;
  cmd: string;
  note?: string;
  /**
   * Who owns this step today.
   * - `manual`: prereq / one-off you still do by hand even when Scale Kit is in play.
   * - `scale-kit`: collapsed into a Scale Kit manifest (aio-install / secretsync / sync-secrets).
   */
  owner: "manual" | "scale-kit";
}

const COMMANDS: CmdLine[] = [
  { owner: "manual",    step: 1,  desc: "Connect cluster to Arc", cmd: "az connectedk8s connect --name myCluster --resource-group myRg --location eastus2", note: "Scale Kit prereq: cluster must already be Arc-connected" },
  { owner: "manual",    step: 2,  desc: "Enable OIDC + workload identity", cmd: "az connectedk8s update --name myCluster --resource-group myRg --enable-oidc-issuer --enable-workload-identity", note: "Scale Kit prereq: OIDC issuer + workload identity must be on" },
  { owner: "manual",    step: 3,  desc: "Get OIDC issuer URL", cmd: "az connectedk8s show --name myCluster --resource-group myRg --query oidcIssuerProfile.issuerUrl -o tsv", note: "Manual path only — Scale Kit reads this from the cluster" },
  { owner: "scale-kit", step: 4,  desc: "Create AIO managed identity", cmd: "az identity create --name aio-identity --resource-group myRg", note: "Scale Kit: enablement.bicep (aio-enablement step)" },
  { owner: "scale-kit", step: 5,  desc: "Create secrets managed identity", cmd: "az identity create --name aio-secrets-identity --resource-group myRg", note: "Scale Kit: _secretsync.yaml — created or BYO" },
  { owner: "scale-kit", step: 6,  desc: "Federate identity with OIDC issuer", cmd: "az identity federated-credential create --name aio-fed --identity-name aio-identity --resource-group myRg --issuer <OIDC_ISSUER_URL> --subject system:serviceaccount:azure-iot-operations:aio-default", note: "Scale Kit: _secretsync.yaml — federation wired automatically" },
  { owner: "scale-kit", step: 7,  desc: "Create the Key Vault", cmd: "az keyvault create --name aioKv$RANDOM --resource-group myRg --enable-rbac-authorization true", note: "Scale Kit: _secretsync.yaml — creates or accepts existingKeyVaultResourceId" },
  { owner: "scale-kit", step: 8,  desc: "Grant the MI Key Vault access", cmd: 'az role assignment create --role "Key Vault Secrets User" --assignee <MI_PRINCIPAL_ID> --scope <KV_RESOURCE_ID>', note: "Scale Kit: _secretsync.yaml — role assignment baked in" },
  { owner: "scale-kit", step: 9,  desc: "Create Schema Registry storage", cmd: "az storage account create --name aiosa$RANDOM --resource-group myRg --enable-hierarchical-namespace true", note: "Scale Kit: schema-registry.bicep (schema-registry step)" },
  { owner: "scale-kit", step: 10, desc: "Create Schema Registry", cmd: "az iot ops schema registry create --name aioSchemaRegistry --resource-group myRg --registry-namespace aio --sa-resource-id <SA_ID>", note: "Scale Kit: schema-registry.bicep — same step" },
  { owner: "scale-kit", step: 11, desc: "Initialize AIO platform deps", cmd: "az iot ops init --cluster myCluster --resource-group myRg", note: "Scale Kit: aio-enablement step — cert-manager, secret-store, custom location" },
  { owner: "scale-kit", step: 12, desc: "Create the AIO instance", cmd: "az iot ops create --cluster myCluster --resource-group myRg --name myAioInstance --sr-resource-id <SCHEMA_REGISTRY_ID>", note: "Scale Kit: aio-instance step — inputs fan in from schema-registry / adr-ns / aio-enablement" },
  { owner: "scale-kit", step: 13, desc: "Enable secret sync on instance", cmd: "az iot ops secretsync enable --instance myAioInstance --resource-group myRg --kv-resource-id <KV_ID> --mi-user-assigned <MI_ID>", note: "Scale Kit: _secretsync.yaml or standalone secretsync.yaml" },
  { owner: "scale-kit", step: 14, desc: "Sync each secret (loop)", cmd: "for s in $SECRETS; do az iot ops secretsync apply --name $s ...; done", note: "Scale Kit: sync-secrets step + input-sync-secrets.yaml — declarative list reconciles" },
];

function CommandStep() {
  const manualCount = COMMANDS.filter((c) => c.owner === "manual").length;
  const skCount = COMMANDS.filter((c) => c.owner === "scale-kit").length;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <section className="overflow-hidden rounded border border-border bg-[#0d1117]">
        <header className="flex items-center gap-2 border-b border-border-subtle bg-[#161b22] px-4 py-2">
          <Terminal className="h-3.5 w-3.5 text-[#7d8590]" />
          <span className="text-[12px] font-mono text-[#7d8590]">
            operator@laptop — az iot ops install (one cluster)
          </span>
          <span className="ml-auto flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-[#f85149]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f85149]" /> {manualCount} cluster prereq
            </span>
            <span className="inline-flex items-center gap-1 text-[#7ee787]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7ee787]" /> {skCount} Scale Kit
            </span>
          </span>
        </header>
        <ol className="divide-y divide-[#21262d]">
          {COMMANDS.map((c) => {
            const stripe = c.owner === "manual" ? "bg-[#f85149]" : "bg-[#7ee787]";
            const noteColor = c.owner === "manual" ? "text-[#d29922]" : "text-[#7ee787]";
            return (
              <li
                key={c.step}
                className="grid grid-cols-[3px_40px_1fr] gap-3 px-0 py-2 font-mono text-[12px]"
              >
                <span className={cn("block w-[3px]", stripe)} aria-hidden />
                <span className="text-right text-[#6e7681]">{String(c.step).padStart(2, "0")}</span>
                <div className="min-w-0 pr-4">
                  <p className="text-[#8b949e]"># {c.desc}</p>
                  <pre className="mt-0.5 whitespace-pre-wrap break-all text-[#c9d1d9]">
                    <span className="text-[#7ee787]">$</span> {c.cmd}
                  </pre>
                  {c.note && (
                    <p className={cn("mt-0.5 text-[11px] italic", noteColor)}>↳ {c.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <aside className="flex flex-col gap-3">
        <div className="rounded border border-success/30 bg-success-subtle p-4">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success-fg" />
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-success-fg">
              What Scale Kit actually collapses
            </h3>
          </div>
          <p className="text-[13px] text-fg">
            Commands <span className="font-mono">4–14</span> are Bicep steps inside Scale Kit’s{" "}
            <span className="font-mono text-[12px]">_aio-fundamentals.yaml</span> +{" "}
            <span className="font-mono text-[12px]">_secretsync.yaml</span>: the MIs, OIDC federation,
            Key Vault (or BYO), Schema Registry + storage account, Arc extensions, AIO instance.
            Versions are pinned per release; sites run in parallel by selector.
          </p>
        </div>

        <div className="rounded border border-warning/30 bg-warning-subtle p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-fg" />
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-warning-fg">
              What’s still on you (even with Scale Kit)
            </h3>
          </div>
          <ul className="space-y-1.5 text-[12px] text-fg">
            <li>• Cluster prereqs: Arc-connect, OIDC + workload identity (cmds 1–2) — Scale Kit assumes these are on</li>
            <li>• Subscription RPs + operator tooling + the k8s distro itself</li>
            <li>• No fleet rollup — sites still run one selector at a time, no cross-site view</li>
            <li>• No upgrade rings, blast-radius preview, pause/continue, or health gates</li>
            <li>• Secret values + drift surfaced only via YAML diffs and CI logs</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Math + tier comparison
// ---------------------------------------------------------------------------

function MathStep() {
  return (
    <div className="flex flex-col gap-4">
      {/* The math equation */}
      <section className="rounded border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-fg-muted">
            The math
          </h2>
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 font-mono text-fg">
          <Cell value="28" label="factories" />
          <span className="text-fg-subtle">×</span>
          <Cell value="11" label="per-cluster prereqs" />
          <span className="text-fg-subtle">×</span>
          <Cell value="~14" label="az commands" />
          <span className="text-fg-subtle">=</span>
          <div className="rounded bg-danger-subtle px-3 py-1.5 text-[18px] font-semibold text-danger-fg">
            a multi-week project
          </div>
        </div>
        <p className="mt-4 text-[13px] text-fg-muted">
          Subscription RPs are excluded — those are a one-time setup per subscription, not
          fleet-multiplied. Scale Kit takes most of the rest on — commands 4–14 are Bicep, sites
          deploy in parallel by selector, versions are pinned per release. What it doesn’t do:
          stand up the cluster or Arc-connect it, give you a fleet rollup, or wrap upgrades in rings
          / blast-radius / pause-continue / health gates. Those are the gaps Launchpad fills.
        </p>
      </section>

      {/* Three-tier ownership comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TierCard
          tone="danger"
          tag="Today"
          title="Manual CLI"
          summary="~14 az commands per cluster, plus per-secret loops. Identity wiring is abstracted by the CLI, but ordering, IDs, and repetition are still on you. No rollup, no rings, no gates."
          owns={[
            "Everything — prereqs, install, upgrade, secrets, config",
          ]}
          leaves={[]}
        />
        <TierCard
          tone="warning"
          tag="Scale Kit"
          title="Bicep + manifests for the AIO stack"
          summary="Composes the Bicep steps for the entire install + upgrade + secretsync surface; sites deploy in parallel by selector."
          owns={[
            "AIO + secrets managed identities, OIDC federation",
            "Key Vault (or BYO via existingKeyVaultResourceId)",
            "Schema Registry + its storage account + role assignment",
            "Arc extensions (cert-manager, secret-store), custom location, AIO instance",
            "sync-secrets reconcile loop with declarative secret list",
            "Release pinning + parallel execution across sites",
          ]}
          leaves={[
            "Subscription RPs, operator tooling, the k8s distro",
            "Cluster Arc-connect + OIDC / workload-identity enable",
            "Fleet rollup / drift visibility across sites",
            "Upgrade rings, blast radius, pause / continue, health gates",
            "Secrets UX — still YAML + CI logs",
          ]}
        />
        <TierCard
          tone="accent"
          tag="AIO Launchpad"
          title="Fleet UI on top of Scale Kit"
          summary="Same Scale Kit manifests underneath — Launchpad adds the surfaces that aren’t in the CLI or the kit."
          owns={[
            "Fleet rollup view across sites + releases + drift",
            "Add-a-site with prereq status + template inheritance",
            "Upgrade plan with rings, blast radius, pause / continue",
            "Per-site secrets UI backed by central KV (sync-secrets manifest)",
          ]}
          leaves={[
            "Subscription-level prereqs (RPs, k8s distro, cluster Arc-connect) — surfaced as status, not auto-provisioned",
          ]}
        />
      </div>
    </div>
  );
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[28px] font-semibold leading-none text-fg">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</div>
    </div>
  );
}

interface TierCardProps {
  tone: "danger" | "warning" | "accent";
  tag: string;
  title: string;
  summary: string;
  owns: string[];
  leaves: string[];
}

function TierCard({ tone, tag, title, summary, owns, leaves }: TierCardProps) {
  const toneClasses =
    tone === "danger"
      ? "border-danger/30 bg-danger-subtle"
      : tone === "warning"
        ? "border-warning/30 bg-warning-subtle"
        : "border-accent/30 bg-accent-subtle";
  const tagColor =
    tone === "danger" ? "text-danger-fg" : tone === "warning" ? "text-warning-fg" : "text-accent";
  return (
    <section className={cn("flex flex-col rounded border p-4", toneClasses)}>
      <div className={cn("text-[10px] font-semibold uppercase tracking-wider", tagColor)}>
        {tag}
      </div>
      <h3 className="mt-0.5 text-[14px] font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-[12px] text-fg-muted">{summary}</p>

      {owns.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            Owns
          </div>
          <ul className="mt-1 space-y-1 text-[12px] text-fg">
            {owns.map((o) => (
              <li key={o} className="flex items-start gap-2">
                <CheckCircle2 className={cn("mt-0.5 h-3 w-3 shrink-0", tagColor)} />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leaves.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            Still on you
          </div>
          <ul className="mt-1 space-y-1 text-[12px] text-fg-muted">
            {leaves.map((l) => (
              <li key={l} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning-fg" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
