"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Plane,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Pre-flight — one-time, per-tenant Day-0 checklist. Confirms the four
 * tenant-scoped prerequisites Launchpad relies on (Arc cluster, Scale Kit
 * repo, Storage account, optional Key Vault + UAMIs for federated mode).
 *
 * Click-to-confirm stub. In the real prototype these checks will call
 * Azure Resource Graph + the GitHub Contents API.
 */
export default function PreflightPage() {
  const [mode, setMode] = useState<DeployMode>("central");
  const [preflight, setPreflight] = useState<Record<string, PreflightChoice>>({});

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Header strip */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
            Pre-flight · one-time per tenant
          </p>
          <h1 className="mt-1 text-[20px] font-semibold leading-tight text-fg">
            Confirm tenant-scoped prerequisites
          </h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Before you create your first site, four things have to exist somewhere in your
            tenant. Launchpad doesn&apos;t provision them — it confirms they&apos;re there and
            tells you where to go if they aren&apos;t.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-6">
          <PreflightPanel
            mode={mode}
            setMode={setMode}
            preflight={preflight}
            setPreflight={setPreflight}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-flight model
// ---------------------------------------------------------------------------

interface PreflightCheck {
  id: string;
  label: string;
  why: string;
  owner: "central-it" | "operations-it";
  /** Which deployment modes require this item. */
  modes: DeployMode[];
  /** Can the resource be created as part of the deploy workflow, or must it exist already? */
  provisionable: boolean;
  docsHref: string;
  docsLabel: string;
}

type DeployMode = "lightweight" | "central";
type PreflightChoice = "byo" | "create" | null;

const PREFLIGHT: PreflightCheck[] = [
  {
    id: "arc-cluster",
    label: "Arc-connected cluster with OIDC + workload identity",
    why: "AIO runs on top of an Arc-connected Kubernetes cluster with OIDC issuer + workload identity enabled. The cluster itself has to exist before any deploy runs.",
    owner: "central-it",
    modes: ["lightweight", "central"],
    provisionable: false,
    docsHref:
      "https://learn.microsoft.com/azure/azure-arc/kubernetes/quickstart-connect-cluster",
    docsLabel: "Arc connect quickstart",
  },
  {
    id: "scale-kit-repo",
    label: "Scale Kit repo in your GitHub org",
    why: "Launchpad reads and writes manifests against your copy of the IoT Operations Scale Kit (created from the template repo, or forked). Releases, sites, and secrets all live in this repo.",
    owner: "operations-it",
    modes: ["lightweight", "central"],
    provisionable: false,
    docsHref: "https://github.com/Azure/iot-operations-scale-kit",
    docsLabel: "iot-operations-scale-kit on GitHub",
  },
  {
    id: "storage-account",
    label: "Storage account (HNS) for Schema Registry",
    why: "An HNS-enabled storage account backs the Schema Registry. Required for every AIO deployment regardless of mode.",
    owner: "central-it",
    modes: ["lightweight", "central"],
    provisionable: true,
    docsHref:
      "https://learn.microsoft.com/azure/iot-operations/deploy-iot-ops/howto-prepare-cluster",
    docsLabel: "AIO cluster prep docs",
  },
  {
    id: "key-vault",
    label: "Key Vault (RBAC mode)",
    why: "Backs sync-secrets as the central source of truth. One Key Vault usually serves the whole tenant — if one already exists, point at it. If this is your first federated tenancy, create one now.",
    owner: "central-it",
    modes: ["central"],
    provisionable: true,
    docsHref: "https://learn.microsoft.com/azure/key-vault/general/rbac-guide",
    docsLabel: "Key Vault RBAC docs",
  },
  {
    id: "uami-components",
    label: "UAMI · components",
    why: "Federated managed identity used by AIO core components (broker, dataflow runtime). Usually created per tenancy.",
    owner: "central-it",
    modes: ["central"],
    provisionable: true,
    docsHref:
      "https://learn.microsoft.com/azure/iot-operations/secure-iot-ops/howto-secret-sync",
    docsLabel: "Secret sync setup",
  },
  {
    id: "uami-secrets",
    label: "UAMI · secrets",
    why: "Federated managed identity used by the secret-sync controller to read site secrets from the Key Vault above. Usually created per tenancy.",
    owner: "central-it",
    modes: ["central"],
    provisionable: true,
    docsHref:
      "https://learn.microsoft.com/azure/iot-operations/secure-iot-ops/howto-secret-sync",
    docsLabel: "Secret sync setup",
  },
];

function PreflightPanel({
  mode,
  setMode,
  preflight,
  setPreflight,
}: {
  mode: DeployMode;
  setMode: (m: DeployMode) => void;
  preflight: Record<string, PreflightChoice>;
  setPreflight: (v: Record<string, PreflightChoice>) => void;
}) {
  const visible = useMemo(
    () => PREFLIGHT.filter((c) => c.modes.includes(mode)),
    [mode],
  );
  const greenCount = visible.filter((c) => preflight[c.id]).length;
  const allGreen = greenCount === visible.length;
  const setChoice = (id: string, choice: PreflightChoice) =>
    setPreflight({ ...preflight, [id]: choice });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded border border-border bg-surface">
        <header className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <Plane className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-fg">Pre-flight checks</h2>
          <span className="ml-2 rounded-full border border-warning/30 bg-warning-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-fg">
            stub for demo
          </span>
          <span className="ml-auto text-[12px] text-fg-muted">
            <span className="font-semibold text-fg">{greenCount}</span> of {visible.length}{" "}
            confirmed
          </span>
        </header>

        {/* Mode picker */}
        <div className="grid grid-cols-1 gap-2 border-b border-border-subtle bg-bg-subtle p-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "lightweight"}
            onClick={() => setMode("lightweight")}
            title="Lightweight"
            tag="system-managed identities"
            summary="AIO components use built-in system-managed identities. No central Key Vault, no UAMI sprawl — scales to hundreds of clusters with a smaller Azure footprint to operate."
            needs={["Arc-connected cluster", "Scale Kit repo", "Storage account"]}
          />
          <ModeCard
            active={mode === "central"}
            onClick={() => setMode("central")}
            title="Federated"
            tag="shared Key Vault + UAMIs"
            summary="Adds a shared Key Vault + 2 UAMIs per site that back sync-secrets, so every site reconciles its secrets from one central source of truth. Higher Azure footprint, stricter governance."
            needs={[
              "Arc-connected cluster",
              "Scale Kit repo",
              "Storage account",
              "Key Vault",
              "UAMI · components",
              "UAMI · secrets",
            ]}
          />
        </div>

        <ul className="divide-y divide-border-subtle">
          {visible.map((c) => {
            const choice = preflight[c.id] ?? null;
            const green = choice !== null;
            return (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    green
                      ? "border-success bg-success text-white"
                      : "border-border-strong bg-bg",
                  )}
                  aria-hidden
                >
                  {green && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-fg">{c.label}</p>
                  <p className="mt-0.5 text-[12px] text-fg-muted">{c.why}</p>

                  {/* Choice control */}
                  <div className="mt-2 flex items-center gap-1.5">
                    {c.provisionable ? (
                      <>
                        <ChoiceButton
                          active={choice === "byo"}
                          onClick={() =>
                            setChoice(c.id, choice === "byo" ? null : "byo")
                          }
                        >
                          Already exists
                        </ChoiceButton>
                        <ChoiceButton
                          active={choice === "create"}
                          onClick={() =>
                            setChoice(c.id, choice === "create" ? null : "create")
                          }
                        >
                          Create during deploy
                        </ChoiceButton>
                      </>
                    ) : (
                      <ChoiceButton
                        active={choice === "byo"}
                        onClick={() =>
                          setChoice(c.id, choice === "byo" ? null : "byo")
                        }
                      >
                        {choice === "byo" ? "Confirmed" : "Confirm it exists"}
                      </ChoiceButton>
                    )}
                    <a
                      href={c.docsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                    >
                      {c.docsLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="flex items-center justify-between border-t border-border-subtle bg-bg-subtle px-4 py-3">
          <p className="text-[12px] text-fg-muted">
            {allGreen
              ? `All clear for a ${mode === "lightweight" ? "lightweight" : "federated"} deployment. Scaffold your first site whenever you're ready.`
              : "Pick a choice for each item to unlock the first-site flow."}
          </p>
          <Link href={allGreen ? "/sites/new" : "/preflight"}>
            <Button variant={allGreen ? "primary" : "ghost"} size="sm" disabled={!allGreen}>
              <Plus className="h-3.5 w-3.5" />
              Add your first site
            </Button>
          </Link>
        </footer>
      </section>

      <aside className="flex flex-col gap-3">
        <div className="rounded border border-accent/30 bg-accent-subtle p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-accent">
            What this screen will become
          </h3>
          <p className="mt-2 text-[12px] text-fg">
            In the real prototype these checks call Azure Resource Graph and the GitHub
            Contents API. &ldquo;Create during deploy&rdquo; will hand off to the same
            Bicep parameters Scale Kit already supports. For now it&apos;s click-to-confirm
            so the rest of the flow stays demoable without live credentials.
          </p>
        </div>
        <div className="rounded border border-border bg-bg-subtle p-4">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-fg-muted">
            Want the narrative first?
          </h3>
          <p className="text-[12px] text-fg-muted">
            See <Link href="/before" className="text-accent hover:underline">/before</Link>{" "}
            for why this checklist exists — the per-cluster ritual it replaces.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  tag,
  summary,
  needs,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  tag: string;
  summary: string;
  needs: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded border p-3 text-left transition-colors",
        active
          ? "border-accent bg-accent-subtle"
          : "border-border bg-surface hover:border-accent/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
            active ? "border-accent bg-accent" : "border-border-strong bg-bg",
          )}
          aria-hidden
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-[13px] font-semibold text-fg">{title}</span>
        <span className="rounded-full border border-border bg-bg-subtle px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-fg-muted">
          {tag}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] text-fg-muted">{summary}</p>
      <ul className="mt-2 flex flex-wrap gap-1">
        {needs.map((n) => (
          <li
            key={n}
            className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
          >
            {n}
          </li>
        ))}
      </ul>
    </button>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm border px-2 text-[11px] font-medium transition-colors",
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-surface text-fg-muted hover:border-accent hover:text-accent",
      )}
    >
      {active && <CheckCircle2 className="h-3 w-3" />}
      {children}
    </button>
  );
}
