"use client";

// Connect screen — conceptual mock of the GitHub/Azure connection flow.
//
// Mirrors the DoEGit "Connect GitHub" pattern (Select Existing vs. Create New)
// adapted to AIO Launchpad's domain: the target is a *fleet manifests* repo
// — either an existing fork of Scale Kit, or a newly-forked one. The Create-
// New mode explicitly forks from `SCALE_KIT_UPSTREAM` so the customer's repo
// inherits the canonical site/release templates.
//
// No real GitHub or Azure calls. Every button just toggles state in the
// `fleetRepo` slice so the IA, copy, and journey can be reviewed.

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Cloud,
  Github,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  type AuthMethod,
  MOCK_EXISTING_REPOS,
  SCALE_KIT_UPSTREAM,
  useAppStore,
} from "@/store/useAppStore";

export default function ConnectPage() {
  const fleetRepo = useAppStore((s) => s.fleetRepo);
  const setFleetRepo = useAppStore((s) => s.setFleetRepo);
  const connectGithub = useAppStore((s) => s.connectGithub);
  const disconnectGithub = useAppStore((s) => s.disconnectGithub);
  const createFleetRepo = useAppStore((s) => s.createFleetRepo);

  const [justSaved, setJustSaved] = useState(false);
  const [justCreated, setJustCreated] = useState(false);

  function handleSave() {
    setFleetRepo({ saved: true });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1800);
  }

  function handleCreate() {
    createFleetRepo();
    setJustCreated(true);
    window.setTimeout(() => setJustCreated(false), 2400);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <header>
        <h1 className="text-[18px] font-semibold text-fg">Connect GitHub</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
          Link your GitHub account to enable GitOps workflows. Sites, releases,
          and secrets configured in Launchpad will be committed as manifest
          YAML to your fleet repository. Conceptual prototype — no real
          GitHub or Azure calls are made.
        </p>
      </header>

      <ConnectionCard
        connected={fleetRepo.connected}
        account={fleetRepo.account}
        auth={fleetRepo.auth}
        pendingAuth={fleetRepo.pendingAuth}
        onPickMethod={(m) => setFleetRepo({ pendingAuth: m })}
        onBackToMethods={() => setFleetRepo({ pendingAuth: null })}
        onConnect={(method) => connectGithub("contoso-ops", method)}
        onDisconnect={disconnectGithub}
      />

      <TargetRepoCard
        disabled={!fleetRepo.connected}
        mode={fleetRepo.mode}
        onModeChange={(mode) => setFleetRepo({ mode })}
        selectedRepo={fleetRepo.selectedRepo}
        onSelectedRepoChange={(r) => setFleetRepo({ selectedRepo: r })}
        branch={fleetRepo.branch}
        onBranchChange={(branch) => setFleetRepo({ branch })}
        manifestsPath={fleetRepo.manifestsPath}
        onManifestsPathChange={(manifestsPath) => setFleetRepo({ manifestsPath })}
        bicepPath={fleetRepo.bicepPath}
        onBicepPathChange={(bicepPath) => setFleetRepo({ bicepPath })}
        newRepoName={fleetRepo.newRepoName}
        onNewRepoNameChange={(newRepoName) => setFleetRepo({ newRepoName })}
        newRepoDescription={fleetRepo.newRepoDescription}
        onNewRepoDescriptionChange={(newRepoDescription) =>
          setFleetRepo({ newRepoDescription })
        }
        newRepoPrivate={fleetRepo.newRepoPrivate}
        onNewRepoPrivateChange={(newRepoPrivate) => setFleetRepo({ newRepoPrivate })}
        saved={fleetRepo.saved}
        justSaved={justSaved}
        justCreated={justCreated}
        onSave={handleSave}
        onCreate={handleCreate}
        account={fleetRepo.account}
      />

      <AzureCard />

      <NoteCard />
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────────────────

function Card({
  title,
  children,
  icon,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-4">
      {title && (
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-fg">
          {icon}
          {title}
        </div>
      )}
      {children}
    </section>
  );
}

function ConnectionCard({
  connected,
  account,
  auth,
  pendingAuth,
  onPickMethod,
  onBackToMethods,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  account: string | null;
  auth: AuthMethod | null;
  pendingAuth: AuthMethod | null;
  onPickMethod: (m: AuthMethod) => void;
  onBackToMethods: () => void;
  onConnect: (m: AuthMethod) => void;
  onDisconnect: () => void;
}) {
  if (connected) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[12px] font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected as @{account}
            </span>
            <span className="text-[12px] text-fg-muted">
              Auth: {authLabel(auth)}
            </span>
          </div>
          <Button variant="default" onClick={onDisconnect}>
            <Unlink className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </Card>
    );
  }

  if (pendingAuth === "pat") {
    return (
      <Card>
        <BackLink onClick={onBackToMethods} />
        <div className="mt-2 mb-1 text-[13px] font-semibold text-fg">
          Authenticate with Personal Access Token
        </div>
        <p className="mb-3 text-[12px] text-fg-muted">
          Create a fine-grained or classic token with <span className="font-mono">repo</span> scope and paste it below.
        </p>
        <Field label="GitHub PAT">
          <Input placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
        </Field>
        <div className="mt-3">
          <Button variant="primary" onClick={() => onConnect("pat")}>Connect</Button>
        </div>
      </Card>
    );
  }

  if (pendingAuth === "device") {
    return (
      <Card>
        <BackLink onClick={onBackToMethods} />
        <div className="mt-2 mb-1 text-[13px] font-semibold text-fg">
          GitHub Device Flow
        </div>
        <p className="mb-3 text-[12px] text-fg-muted">
          Click below to start. You&apos;ll get a code to enter on GitHub&apos;s authorization page — no token to copy or store.
        </p>
        <Button variant="primary" onClick={() => onConnect("device")}>
          Start Authorization
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 text-[13px] font-medium text-fg">Choose how to connect</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MethodCard
          icon={<KeyRound className="h-5 w-5 text-accent" />}
          title="Personal Access Token"
          body={<>Paste a GitHub PAT with <span className="font-mono">repo</span> scope. Simple setup, good for personal use.</>}
          badge="Quick Setup"
          badgeTone="subtle"
          onClick={() => onPickMethod("pat")}
        />
        <MethodCard
          icon={<Github className="h-5 w-5 text-fg" />}
          title="GitHub Device Flow (OAuth)"
          body="Authorize via browser — no token to copy. More secure, supports org policies."
          badge="Recommended"
          badgeTone="accent"
          onClick={() => onPickMethod("device")}
        />
        <MethodCard
          icon={<ShieldCheck className="h-5 w-5 text-fg-muted" />}
          title="Entra ID (SSO)"
          body="Enterprise SSO via federated identity. Ideal for org-wide deployments."
          badge="Coming Soon"
          badgeTone="muted"
          disabled
        />
      </div>
    </Card>
  );
}

function authLabel(a: AuthMethod | null): string {
  switch (a) {
    case "pat":
      return "Personal Access Token";
    case "device":
      return "GitHub Device Flow";
    case "sso":
      return "Entra ID (SSO)";
    default:
      return "—";
  }
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
    >
      <ArrowLeft className="h-3 w-3" />
      Back to options
    </button>
  );
}

function MethodCard({
  icon,
  title,
  body,
  badge,
  badgeTone,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  badge: string;
  badgeTone: "accent" | "subtle" | "muted";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const badgeClass =
    badgeTone === "accent"
      ? "bg-accent text-accent-fg"
      : badgeTone === "subtle"
        ? "bg-accent-subtle text-accent"
        : "bg-bg-muted text-fg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 rounded-md border p-4 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-bg-subtle opacity-60"
          : "border-border-strong bg-surface hover:border-accent hover:bg-accent-subtle/40"
      }`}
    >
      <div className="mt-1">{icon}</div>
      <div className="text-[13px] font-semibold text-fg">{title}</div>
      <div className="text-[12px] leading-snug text-fg-muted">{body}</div>
      <span className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
        {badge}
      </span>
    </button>
  );
}

function TargetRepoCard(props: {
  disabled: boolean;
  mode: "select" | "create";
  onModeChange: (m: "select" | "create") => void;
  selectedRepo: string | null;
  onSelectedRepoChange: (r: string) => void;
  branch: string;
  onBranchChange: (b: string) => void;
  manifestsPath: string;
  onManifestsPathChange: (p: string) => void;
  bicepPath: string;
  onBicepPathChange: (p: string) => void;
  newRepoName: string;
  onNewRepoNameChange: (n: string) => void;
  newRepoDescription: string;
  onNewRepoDescriptionChange: (d: string) => void;
  newRepoPrivate: boolean;
  onNewRepoPrivateChange: (v: boolean) => void;
  saved: boolean;
  justSaved: boolean;
  justCreated: boolean;
  onSave: () => void;
  onCreate: () => void;
  account: string | null;
}) {
  const {
    disabled,
    mode,
    onModeChange,
    selectedRepo,
    onSelectedRepoChange,
    branch,
    onBranchChange,
    manifestsPath,
    onManifestsPathChange,
    bicepPath,
    onBicepPathChange,
    newRepoName,
    onNewRepoNameChange,
    newRepoDescription,
    onNewRepoDescriptionChange,
    newRepoPrivate,
    onNewRepoPrivateChange,
    saved,
    justSaved,
    justCreated,
    onSave,
    onCreate,
    account,
  } = props;

  return (
    <Card title="Target Repository">
      {disabled && (
        <p className="mb-3 rounded border border-border bg-bg-subtle px-3 py-2 text-[12px] text-fg-muted">
          Connect GitHub above to configure a fleet repository.
        </p>
      )}

      <div className="mb-3 inline-flex rounded border border-border-strong bg-bg-subtle p-0.5">
        <ModeTab
          active={mode === "select"}
          onClick={() => onModeChange("select")}
          disabled={disabled}
        >
          Select Existing
        </ModeTab>
        <ModeTab
          active={mode === "create"}
          onClick={() => onModeChange("create")}
          disabled={disabled}
        >
          Create New (fork Scale Kit)
        </ModeTab>
      </div>

      {mode === "select" ? (
        <div className="flex flex-col gap-3">
          <Field label="Repository">
            <select
              className="h-8 w-full rounded border border-border-strong bg-surface px-2 text-[13px] text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              value={selectedRepo ?? ""}
              onChange={(e) => onSelectedRepoChange(e.target.value)}
              disabled={disabled}
            >
              <option value="" disabled>
                Choose a repository…
              </option>
              {MOCK_EXISTING_REPOS.map((r) => (
                <option key={r.fullName} value={r.fullName}>
                  {r.fullName}
                  {r.private ? " 🔒" : ""}
                  {r.isFork ? "  (fork of Scale Kit)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <CommonTargetFields
            disabled={disabled}
            branch={branch}
            onBranchChange={onBranchChange}
            manifestsPath={manifestsPath}
            onManifestsPathChange={onManifestsPathChange}
            bicepPath={bicepPath}
            onBicepPathChange={onBicepPathChange}
          />
          <div>
            <Button
              variant="primary"
              onClick={onSave}
              disabled={disabled || !selectedRepo}
            >
              {justSaved || saved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Configuration Saved
                </>
              ) : (
                "Save configuration"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded border border-accent/30 bg-accent-subtle px-3 py-2 text-[12px] text-accent">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                Forks <span className="font-mono font-semibold">{SCALE_KIT_UPSTREAM}</span> into your account
                {account ? <> as <span className="font-mono font-semibold">@{account}</span></> : null}.
                Your fork inherits the canonical site templates and release
                manifests so you can override only what your fleet needs.
              </div>
            </div>
          </div>
          <Field label="Repository Name">
            <Input
              value={newRepoName}
              onChange={(e) => onNewRepoNameChange(e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="Description">
            <Input
              value={newRepoDescription}
              onChange={(e) => onNewRepoDescriptionChange(e.target.value)}
              disabled={disabled}
            />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-fg">
            <input
              type="checkbox"
              checked={newRepoPrivate}
              onChange={(e) => onNewRepoPrivateChange(e.target.checked)}
              disabled={disabled}
              className="h-3.5 w-3.5 rounded border-border-strong"
            />
            <Lock className="h-3.5 w-3.5 text-fg-muted" />
            Private repository
          </label>
          <Button
            variant="primary"
            onClick={onCreate}
            disabled={disabled || !newRepoName.trim()}
          >
            {justCreated ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Repository created (mock)
              </>
            ) : (
              "Fork & create repository"
            )}
          </Button>
          <div className="mt-2 border-t border-border pt-3">
            <CommonTargetFields
              disabled={disabled}
              branch={branch}
              onBranchChange={onBranchChange}
              manifestsPath={manifestsPath}
              onManifestsPathChange={onManifestsPathChange}
              bicepPath={bicepPath}
              onBicepPathChange={onBicepPathChange}
            />
            <div className="mt-3">
              <Button
                variant="default"
                onClick={onSave}
                disabled={disabled || !selectedRepo}
              >
                {justSaved ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Configuration Saved
                  </>
                ) : (
                  "Save configuration"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function CommonTargetFields({
  disabled,
  branch,
  onBranchChange,
  manifestsPath,
  onManifestsPathChange,
  bicepPath,
  onBicepPathChange,
}: {
  disabled: boolean;
  branch: string;
  onBranchChange: (b: string) => void;
  manifestsPath: string;
  onManifestsPathChange: (p: string) => void;
  bicepPath: string;
  onBicepPathChange: (p: string) => void;
}) {
  return (
    <>
      <Field label="Target Branch">
        <Input
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field
        label="Manifests Path"
        hint="Folder for site / release / input YAML (Scale Kit manifests)."
      >
        <Input
          value={manifestsPath}
          onChange={(e) => onManifestsPathChange(e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field
        label="Bicep / ARM Path"
        hint="Folder for AIO ARM resources (Instance, Assets, Endpoints, Dataflows, Schemas)."
      >
        <Input
          value={bicepPath}
          onChange={(e) => onBicepPathChange(e.target.value)}
          disabled={disabled}
        />
      </Field>
    </>
  );
}

function AzureCard() {
  return (
    <Card
      icon={<Cloud className="h-4 w-4 text-accent" />}
      title="Azure Subscription"
    >
      <p className="mb-3 text-[12px] text-fg-muted">
        Connect to Azure to load IoT Operations resources from ARM. Requires
        Azure CLI login (<span className="font-mono">az login</span>).
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Subscription">
          <select
            disabled
            className="h-8 w-full rounded border border-border-strong bg-bg-subtle px-2 text-[13px] text-fg-muted disabled:opacity-70"
          >
            <option>Select a subscription…</option>
          </select>
        </Field>
        <Field label="Resource Group (optional — leave empty for all)">
          <select
            disabled
            className="h-8 w-full rounded border border-border-strong bg-bg-subtle px-2 text-[13px] text-fg-muted disabled:opacity-70"
          >
            <option>All resource groups</option>
          </select>
        </Field>
        <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
          <Building2 className="h-3 w-3" />
          Out of scope for this prototype — ARM / Azure CLI wiring not implemented.
        </div>
        <div>
          <Button variant="default" disabled>
            Connect Azure
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NoteCard() {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-subtle p-4 text-[12px] leading-relaxed text-fg-muted">
      <div className="mb-1 font-semibold text-fg">Why a separate fleet repo?</div>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          Permissions: Site OT teams need PR rights on <em>their</em> manifests, not on the Launchpad app code.
        </li>
        <li>
          Cadence: fleet changes ship per site/env; the app ships per UI feature.
        </li>
        <li>
          Lineage: forking from <span className="font-mono">{SCALE_KIT_UPSTREAM}</span> keeps you on the canonical site templates with a clear upstream-merge path.
        </li>
        <li>
          Multi-tenant: every customer org points Launchpad at their own fork — the Source screen ({" "}
          <Link href="/developer" className="text-accent underline">
            /developer
          </Link>
          ) reads from whatever repo is configured here.
        </li>
      </ul>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
    </label>
  );
}

function ModeTab({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-1 text-[12px] font-medium transition-colors disabled:opacity-50 ${
        active
          ? "bg-accent text-accent-fg"
          : "bg-transparent text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
