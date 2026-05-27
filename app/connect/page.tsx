"use client";

// Connect screen — conceptual mock of the GitHub connection flow.
//
// IA: three-step stepper (Sign in -> Fleet repo -> Ready). Steps render
// inline below the header; once configured, step 3 shows a summary panel
// with a single Edit affordance. No real GitHub or Azure calls; everything
// toggles the `fleetRepo` slice.
//
// Differentiated from generic "connect-to-source" patterns by surfacing the
// upstream-fork relationship as a lineage diagram (Scale Kit -> your fork
// -> branch) and by treating Azure / ARM access as out-of-scope here (it
// belongs next to where it's consumed, not on the connection landing).

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  GitBranch,
  GitFork,
  Github,
  HardDrive,
  KeyRound,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
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

type Step = 1 | 2 | 3;

/**
 * The four ways an operator can wire Launchpad to a fleet source. Choosing
 * the source is the actual first decision — auth is a consequence of it,
 * not the inverse.
 */
type SourceMode = "existing-fork" | "fresh-fork" | "local" | "demo";

export default function ConnectPage() {
  const fleetRepo = useAppStore((s) => s.fleetRepo);
  const setFleetRepo = useAppStore((s) => s.setFleetRepo);
  const connectGithub = useAppStore((s) => s.connectGithub);
  const disconnectGithub = useAppStore((s) => s.disconnectGithub);
  const createFleetRepo = useAppStore((s) => s.createFleetRepo);

  const [flash, setFlash] = useState<"" | "saved" | "created">("");
  const [sourceMode, setSourceMode] = useState<SourceMode | null>(null);
  const [localPath, setLocalPath] = useState(
    "C:/factory/fleet-repo",
  );

  const currentStep: Step = !fleetRepo.connected
    ? 1
    : !fleetRepo.saved
      ? 2
      : 3;

  function handleSave() {
    setFleetRepo({ saved: true });
    setFlash("saved");
    window.setTimeout(() => setFlash(""), 1800);
  }

  function handleCreate() {
    createFleetRepo();
    setFlash("created");
    window.setTimeout(() => setFlash(""), 2400);
  }

  function handleResetSource() {
    setSourceMode(null);
    setFleetRepo({ pendingAuth: null });
  }

  function handleConnectDemo() {
    // Demo mode: synthetic in-memory fleet, no auth, no network.
    setFleetRepo({
      connected: true,
      account: "demo",
      auth: null,
      pendingAuth: null,
      selectedRepo: "launchpad/sample-fleet (built-in)",
      mode: "select",
      branch: "main",
      saved: true,
    });
  }

  function handleConnectLocal() {
    // Local checkout: filesystem path, no auth, no network.
    setFleetRepo({
      connected: true,
      account: "local",
      auth: null,
      pendingAuth: null,
      selectedRepo: localPath,
      mode: "select",
      saved: true,
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[18px] font-semibold text-fg">
              Connect a fleet source
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-fg-muted">
              Launchpad is a thin control surface over a fleet repository — the
              manifests, releases, secrets and ARM resources for your AIO
              instances. Pick where that fleet lives. Some paths need GitHub;
              others (local checkout, demo) need nothing at all.
            </p>
          </div>
          {currentStep === 3 && (
            <Button variant="default" onClick={() => { disconnectGithub(); setSourceMode(null); }}>
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          )}
        </header>

        <Stepper current={currentStep} />

        {currentStep === 1 && (
          <StepSource
            sourceMode={sourceMode}
            onPickSource={setSourceMode}
            onBackToSource={handleResetSource}
            pendingAuth={fleetRepo.pendingAuth}
            onPickAuth={(m) => setFleetRepo({ pendingAuth: m })}
            onConnect={(method) => {
              // After GitHub connect, default mode-2 view based on source-mode.
              setFleetRepo({
                mode: sourceMode === "fresh-fork" ? "create" : "select",
              });
              connectGithub("contoso-ops", method);
            }}
            localPath={localPath}
            onLocalPathChange={setLocalPath}
            onConnectLocal={handleConnectLocal}
            onConnectDemo={handleConnectDemo}
          />
        )}

        {currentStep === 2 && (
          <StepFleetRepo
            account={fleetRepo.account ?? "you"}
            mode={fleetRepo.mode}
            onModeChange={(mode) => setFleetRepo({ mode })}
            selectedRepo={fleetRepo.selectedRepo}
            onSelectedRepoChange={(r) => setFleetRepo({ selectedRepo: r })}
            branch={fleetRepo.branch}
            onBranchChange={(branch) => setFleetRepo({ branch })}
            manifestsPath={fleetRepo.manifestsPath}
            onManifestsPathChange={(manifestsPath) =>
              setFleetRepo({ manifestsPath })
            }
            bicepPath={fleetRepo.bicepPath}
            onBicepPathChange={(bicepPath) => setFleetRepo({ bicepPath })}
            newRepoName={fleetRepo.newRepoName}
            onNewRepoNameChange={(newRepoName) =>
              setFleetRepo({ newRepoName })
            }
            newRepoDescription={fleetRepo.newRepoDescription}
            onNewRepoDescriptionChange={(newRepoDescription) =>
              setFleetRepo({ newRepoDescription })
            }
            newRepoPrivate={fleetRepo.newRepoPrivate}
            onNewRepoPrivateChange={(newRepoPrivate) =>
              setFleetRepo({ newRepoPrivate })
            }
            flash={flash}
            onSave={handleSave}
            onCreate={handleCreate}
          />
        )}

        {currentStep === 3 && (
          <StepReady
            account={fleetRepo.account ?? ""}
            auth={fleetRepo.auth}
            selectedRepo={fleetRepo.selectedRepo ?? ""}
            branch={fleetRepo.branch}
            manifestsPath={fleetRepo.manifestsPath}
            bicepPath={fleetRepo.bicepPath}
            onEdit={() => setFleetRepo({ saved: false })}
          />
        )}

        <InlineRationale />
      </div>
    </div>
  );
}

// ── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 1, label: "Sign in" },
    { id: 2, label: "Fleet repository" },
    { id: 3, label: "Ready" },
  ];
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                active
                  ? "border-accent bg-accent text-accent-fg"
                  : done
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-bg-subtle text-fg-muted"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] font-semibold ${
                    active
                      ? "bg-accent-fg/20 text-accent-fg"
                      : "bg-border text-fg-muted"
                  }`}
                >
                  {s.id}
                </span>
              )}
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Step 1: Source mode ──────────────────────────────────────────────────────

function StepSource({
  sourceMode,
  onPickSource,
  onBackToSource,
  pendingAuth,
  onPickAuth,
  onConnect,
  localPath,
  onLocalPathChange,
  onConnectLocal,
  onConnectDemo,
}: {
  sourceMode: SourceMode | null;
  onPickSource: (m: SourceMode) => void;
  onBackToSource: () => void;
  pendingAuth: AuthMethod | null;
  onPickAuth: (m: AuthMethod | null) => void;
  onConnect: (m: AuthMethod) => void;
  localPath: string;
  onLocalPathChange: (p: string) => void;
  onConnectLocal: () => void;
  onConnectDemo: () => void;
}) {
  if (sourceMode === null) {
    return (
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-fg">
            Where does your fleet live?
          </div>
          <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
            Step 1 of 3
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SourceCard
            icon={<Github className="h-4 w-4" />}
            title="Existing fleet repo"
            body="You already have a Scale Kit fork (or a repo with compatible structure)."
            authTag="GitHub auth"
            authTone="accent"
            onClick={() => onPickSource("existing-fork")}
          />
          <SourceCard
            icon={<GitFork className="h-4 w-4" />}
            title="Fork Scale Kit now"
            body={
              <>
                Create a fresh fork of{" "}
                <span className="font-mono text-[11px]">{SCALE_KIT_UPSTREAM}</span>{" "}
                into your account or org.
              </>
            }
            authTag="GitHub auth"
            authTone="accent"
            onClick={() => onPickSource("fresh-fork")}
          />
          <SourceCard
            icon={<HardDrive className="h-4 w-4" />}
            title="Local checkout"
            body="Point Launchpad at a folder on disk. For air-gapped sites or local previews before pushing."
            authTag="No auth"
            authTone="muted"
            onClick={() => onPickSource("local")}
          />
          <SourceCard
            icon={<PlayCircle className="h-4 w-4" />}
            title="Demo fleet"
            body="Built-in sample fleet. Throwaway in-memory state. Try Launchpad without wiring anything."
            authTag="No auth"
            authTone="muted"
            tag="Recommended for first run"
            tagTone="accent"
            onClick={() => onPickSource("demo")}
          />
        </div>
      </Panel>
    );
  }

  if (sourceMode === "demo") {
    return (
      <Panel>
        <PanelHeader
          onBack={onBackToSource}
          icon={<PlayCircle className="h-4 w-4 text-accent" />}
          title="Demo fleet"
          subtitle="Built-in sample fleet. No GitHub calls, no Azure calls, no persistence beyond this browser session."
        />
        <ul className="mt-3 space-y-1 rounded-md border border-border bg-bg-subtle p-3 text-[12px] text-fg-muted">
          <li>• You can edit manifests in-memory; nothing leaves this browser.</li>
          <li>• Disconnect any time to switch to a real repo.</li>
          <li>• Drift detection runs against the bundled fixture, not live ARM.</li>
        </ul>
        <div className="mt-4">
          <Button variant="primary" onClick={onConnectDemo}>
            Use demo fleet
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Panel>
    );
  }

  if (sourceMode === "local") {
    return (
      <Panel>
        <PanelHeader
          onBack={onBackToSource}
          icon={<HardDrive className="h-4 w-4 text-accent" />}
          title="Local checkout"
          subtitle="Launchpad reads and writes the folder as-is. Use your usual git client to push when you're ready."
        />
        <div className="mt-4 max-w-lg">
          <Field
            label="Folder path"
            hint="Must contain a Scale-Kit-shaped tree (sites/, releases/, infra/)."
          >
            <div className="relative">
              <Folder className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-subtle" />
              <Input
                value={localPath}
                onChange={(e) => onLocalPathChange(e.target.value)}
                placeholder="C:/factory/fleet-repo"
                className="pl-7"
              />
            </div>
          </Field>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="primary"
              onClick={onConnectLocal}
              disabled={!localPath.trim()}
            >
              Use this folder
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] text-fg-subtle">
              Filesystem access is mocked; the path is stored as-is.
            </span>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <StepGithubAuth
      sourceMode={sourceMode}
      pendingAuth={pendingAuth}
      onPickAuth={onPickAuth}
      onBackToSource={onBackToSource}
      onConnect={onConnect}
    />
  );
}

function SourceCard({
  icon,
  title,
  body,
  authTag,
  authTone,
  tag,
  tagTone,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  authTag: string;
  authTone: "accent" | "muted";
  tag?: string;
  tagTone?: "accent";
  onClick: () => void;
}) {
  const authClass =
    authTone === "accent"
      ? "border-accent/40 bg-accent-subtle text-accent"
      : "border-border bg-bg-muted text-fg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-2 rounded-md border border-border bg-surface p-4 text-left transition-all hover:border-accent hover:shadow-depth8"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-bg-subtle text-fg group-hover:text-accent">
          {icon}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${authClass}`}
        >
          {authTag}
        </span>
      </div>
      <div className="text-[13px] font-semibold text-fg">{title}</div>
      <div className="text-[12px] leading-relaxed text-fg-muted">{body}</div>
      {tag && (
        <div className="mt-1">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              tagTone === "accent" ? "bg-accent text-accent-fg" : "bg-bg-muted text-fg-muted"
            }`}
          >
            {tag}
          </span>
        </div>
      )}
      <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
        Continue
        <ChevronRight className="h-3 w-3" />
      </span>
    </button>
  );
}

// ── Step 1b: GitHub auth picker (only for fork modes) ───────────────────────

function StepGithubAuth({
  sourceMode,
  pendingAuth,
  onPickAuth,
  onBackToSource,
  onConnect,
}: {
  sourceMode: "existing-fork" | "fresh-fork";
  pendingAuth: AuthMethod | null;
  onPickAuth: (m: AuthMethod | null) => void;
  onBackToSource: () => void;
  onConnect: (m: AuthMethod) => void;
}) {
  const sourceLabel =
    sourceMode === "existing-fork" ? "Existing fleet repo" : "Fork Scale Kit now";

  if (pendingAuth === "pat") {
    return (
      <Panel>
        <PanelHeader
          onBack={() => onPickAuth(null)}
          icon={<KeyRound className="h-4 w-4 text-accent" />}
          title="Personal access token"
          subtitle={
            <>
              Fine-grained or classic token with{" "}
              <code className="font-mono text-[11px]">repo</code> scope.
            </>
          }
        />
        <div className="mt-4 max-w-md">
          <Field label="GitHub PAT">
            <PasswordInput placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
          </Field>
          <div className="mt-3">
            <Button variant="primary" onClick={() => onConnect("pat")}>
              Connect
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  if (pendingAuth === "device") {
    return (
      <Panel>
        <PanelHeader
          onBack={() => onPickAuth(null)}
          icon={<Github className="h-4 w-4 text-fg" />}
          title="GitHub device flow"
          subtitle="Authorize via browser — no token to copy or store."
        />
        <div className="mt-4">
          <Button variant="primary" onClick={() => onConnect("device")}>
            Start authorization
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <button
        type="button"
        onClick={onBackToSource}
        className="mb-2 inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
      >
        <ChevronRight className="h-3 w-3 rotate-180" />
        Back to fleet source
      </button>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-fg">
            How should we sign in to GitHub?
          </div>
          <div className="text-[11px] text-fg-subtle">
            For: <span className="font-medium text-fg-muted">{sourceLabel}</span>
          </div>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          Step 1 of 3 · Auth
        </span>
      </div>
      <div className="divide-y divide-border rounded-md border border-border bg-surface">
        <AuthRow
          icon={<Github className="h-4 w-4 text-fg" />}
          title="GitHub device flow"
          body="Authorize via browser. Supports org SSO. Recommended."
          tag="Recommended"
          tagTone="accent"
          onClick={() => onPickAuth("device")}
        />
        <AuthRow
          icon={<KeyRound className="h-4 w-4 text-accent" />}
          title="Personal access token"
          body="Paste a token with repo scope. Fastest for individual use."
          tag="Quick"
          tagTone="subtle"
          onClick={() => onPickAuth("pat")}
        />
        <AuthRow
          icon={<ShieldCheck className="h-4 w-4 text-fg-muted" />}
          title="Entra ID (SSO)"
          body="Federated identity. Org-wide deployments."
          tag="Coming soon"
          tagTone="muted"
          disabled
        />
      </div>
    </Panel>
  );
}

function AuthRow({
  icon,
  title,
  body,
  tag,
  tagTone,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  tag: string;
  tagTone: "accent" | "subtle" | "muted";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const tagClass =
    tagTone === "accent"
      ? "bg-accent text-accent-fg"
      : tagTone === "subtle"
        ? "bg-accent-subtle text-accent"
        : "bg-bg-muted text-fg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:bg-accent-subtle/30"
      }`}
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-bg-subtle">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-fg">{title}</span>
        <span className="block text-[12px] text-fg-muted">{body}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tagClass}`}
      >
        {tag}
      </span>
      {!disabled && (
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
      )}
    </button>
  );
}

function PasswordInput({ placeholder }: { placeholder: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input type={shown ? "text" : "password"} placeholder={placeholder} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
        aria-label={shown ? "Hide token" : "Show token"}
      >
        {shown ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ── Step 2: Fleet repository ─────────────────────────────────────────────────

function StepFleetRepo(props: {
  account: string;
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
  flash: "" | "saved" | "created";
  onSave: () => void;
  onCreate: () => void;
}) {
  const {
    account,
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
    flash,
    onSave,
    onCreate,
  } = props;

  const targetRepoName =
    mode === "select"
      ? selectedRepo ?? "—"
      : `${account}/${newRepoName || "…"}`;

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-fg">Fleet repository</div>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          Step 2 of 3
        </span>
      </div>

      <LineageDiagram
        upstream={SCALE_KIT_UPSTREAM}
        fork={targetRepoName}
        branch={branch}
        forkIsExisting={mode === "select"}
      />

      <div className="mt-5 grid grid-cols-[180px_1fr] gap-5">
        <nav className="flex flex-col gap-1 border-r border-border pr-4">
          <SideTab
            active={mode === "select"}
            onClick={() => onModeChange("select")}
            label="Use existing"
            sub="Pick from your repos"
          />
          <SideTab
            active={mode === "create"}
            onClick={() => onModeChange("create")}
            label="Fork Scale Kit"
            sub="New repo from upstream"
          />
        </nav>

        <div className="min-w-0">
          {mode === "select" ? (
            <div className="flex flex-col gap-3">
              <Field label="Repository">
                <RepoList
                  selected={selectedRepo}
                  onSelect={onSelectedRepoChange}
                />
              </Field>
              <PathFields
                branch={branch}
                onBranchChange={onBranchChange}
                manifestsPath={manifestsPath}
                onManifestsPathChange={onManifestsPathChange}
                bicepPath={bicepPath}
                onBicepPathChange={onBicepPathChange}
              />
              <div className="mt-1">
                <Button
                  variant="primary"
                  onClick={onSave}
                  disabled={!selectedRepo}
                >
                  {flash === "saved" ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    <>
                      Save & continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Repository name">
                <Input
                  value={newRepoName}
                  onChange={(e) => onNewRepoNameChange(e.target.value)}
                  placeholder="aio-fleet-config"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={newRepoDescription}
                  onChange={(e) => onNewRepoDescriptionChange(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 text-[12px] text-fg">
                <input
                  type="checkbox"
                  checked={newRepoPrivate}
                  onChange={(e) => onNewRepoPrivateChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border-strong"
                />
                <Lock className="h-3.5 w-3.5 text-fg-muted" />
                Private repository
              </label>
              <Button
                variant="default"
                onClick={onCreate}
                disabled={!newRepoName.trim()}
              >
                {flash === "created" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Fork created (mock)
                  </>
                ) : (
                  "Fork into my account"
                )}
              </Button>
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Then point Launchpad at
                </div>
                <PathFields
                  branch={branch}
                  onBranchChange={onBranchChange}
                  manifestsPath={manifestsPath}
                  onManifestsPathChange={onManifestsPathChange}
                  bicepPath={bicepPath}
                  onBicepPathChange={onBicepPathChange}
                />
                <div className="mt-3">
                  <Button variant="primary" onClick={onSave}>
                    {flash === "saved" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Saved
                      </>
                    ) : (
                      <>
                        Save & continue
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function SideTab({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 rounded px-3 py-2 text-left transition-colors ${
        active
          ? "bg-accent-subtle text-accent"
          : "text-fg-muted hover:bg-bg-muted hover:text-fg"
      }`}
    >
      <span className="text-[13px] font-semibold">{label}</span>
      <span
        className={`text-[11px] ${active ? "text-accent/80" : "text-fg-subtle"}`}
      >
        {sub}
      </span>
    </button>
  );
}

function RepoList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (full: string) => void;
}) {
  return (
    <div className="divide-y divide-border rounded-md border border-border bg-surface">
      {MOCK_EXISTING_REPOS.map((r) => {
        const isSel = selected === r.fullName;
        return (
          <button
            key={r.fullName}
            type="button"
            onClick={() => onSelect(r.fullName)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
              isSel ? "bg-accent-subtle" : "hover:bg-bg-muted"
            }`}
          >
            <Github className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg">
              {r.fullName}
            </span>
            {r.private && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-1.5 py-0.5 text-[10px] text-fg-muted">
                <Lock className="h-2.5 w-2.5" />
                private
              </span>
            )}
            {r.isFork && (
              <span className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] font-medium text-accent">
                Scale Kit fork
              </span>
            )}
            {isSel && <CheckCircle2 className="h-3.5 w-3.5 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}

function PathFields({
  branch,
  onBranchChange,
  manifestsPath,
  onManifestsPathChange,
  bicepPath,
  onBicepPathChange,
}: {
  branch: string;
  onBranchChange: (b: string) => void;
  manifestsPath: string;
  onManifestsPathChange: (p: string) => void;
  bicepPath: string;
  onBicepPathChange: (p: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
      <Field label="Branch">
        <Input
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
        />
      </Field>
      <Field label="Manifests path" hint="Sites, releases, inputs">
        <Input
          value={manifestsPath}
          onChange={(e) => onManifestsPathChange(e.target.value)}
        />
      </Field>
      <Field label="ARM / Bicep path" hint="Instance, assets, dataflows">
        <Input
          value={bicepPath}
          onChange={(e) => onBicepPathChange(e.target.value)}
        />
      </Field>
    </div>
  );
}

// ── Step 3: Ready summary ────────────────────────────────────────────────────

function StepReady({
  account,
  auth,
  selectedRepo,
  branch,
  manifestsPath,
  bicepPath,
  onEdit,
}: {
  account: string;
  auth: AuthMethod | null;
  selectedRepo: string;
  branch: string;
  manifestsPath: string;
  bicepPath: string;
  onEdit: () => void;
}) {
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-fg">
          <Sparkles className="h-4 w-4 text-success" />
          Launchpad is wired to your fleet repository
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[12px] text-accent hover:underline"
        >
          Edit configuration
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] md:grid-cols-2">
        <SummaryRow label="Account" value={`@${account}`} />
        <SummaryRow label="Auth" value={authLabel(auth)} />
        <SummaryRow
          label="Repository"
          value={selectedRepo}
          mono
          icon={<Github className="h-3 w-3 text-fg-muted" />}
        />
        <SummaryRow
          label="Branch"
          value={branch}
          mono
          icon={<GitBranch className="h-3 w-3 text-fg-muted" />}
        />
        <SummaryRow label="Manifests" value={manifestsPath} mono />
        <SummaryRow label="ARM / Bicep" value={bicepPath} mono />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href="/fleet">
          <Button variant="primary">
            Open fleet
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link href="/developer">
          <Button variant="default">View source tree</Button>
        </Link>
      </div>
    </Panel>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border/60 py-1.5 last:border-0">
      <dt className="w-24 shrink-0 text-fg-muted">{label}</dt>
      <dd
        className={`inline-flex min-w-0 items-center gap-1.5 truncate text-fg ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {icon}
        {value || "—"}
      </dd>
    </div>
  );
}

function authLabel(a: AuthMethod | null): string {
  switch (a) {
    case "pat":
      return "Personal access token";
    case "device":
      return "Device flow";
    case "sso":
      return "Entra ID";
    default:
      return "—";
  }
}

// ── Lineage diagram ──────────────────────────────────────────────────────────

function LineageDiagram({
  upstream,
  fork,
  branch,
  forkIsExisting,
}: {
  upstream: string;
  fork: string;
  branch: string;
  forkIsExisting: boolean;
}) {
  return (
    <div className="flex items-stretch gap-2 rounded-md border border-border bg-bg-subtle p-3">
      <LineageNode
        label="Upstream"
        name={upstream}
        sub="Scale Kit"
        tone="muted"
      />
      <LineageArrow label={forkIsExisting ? "your fork" : "fork on save"} />
      <LineageNode
        label="Fleet repo"
        name={fork}
        sub={forkIsExisting ? "Selected" : "Will be created"}
        tone="accent"
      />
      <LineageArrow label="branch" />
      <LineageNode label="Branch" name={branch} sub="Tracked" tone="subtle" />
    </div>
  );
}

function LineageNode({
  label,
  name,
  sub,
  tone,
}: {
  label: string;
  name: string;
  sub: string;
  tone: "muted" | "accent" | "subtle";
}) {
  const toneClass =
    tone === "accent"
      ? "border-accent/40 bg-accent-subtle"
      : tone === "subtle"
        ? "border-border-strong bg-surface"
        : "border-border bg-surface";
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded border px-3 py-2 ${toneClass}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
      <span
        className="truncate font-mono text-[12px] font-semibold text-fg"
        title={name}
      >
        {name}
      </span>
      <span className="text-[11px] text-fg-muted">{sub}</span>
    </div>
  );
}

function LineageArrow({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-fg-subtle">
      <ArrowRight className="h-3.5 w-3.5" />
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Panel + small helpers ────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      {children}
    </section>
  );
}

function PanelHeader({
  icon,
  title,
  subtitle,
  onBack,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
        >
          <ChevronRight className="h-3 w-3 rotate-180" />
          Back to methods
        </button>
      )}
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-semibold text-fg">{title}</span>
      </div>
      {subtitle && (
        <p className="mt-1 text-[12px] text-fg-muted">{subtitle}</p>
      )}
    </div>
  );
}

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

function InlineRationale() {
  return (
    <p className="text-[11px] leading-relaxed text-fg-subtle">
      <strong className="font-semibold text-fg-muted">Why no Azure step here:</strong>{" "}
      Launchpad treats the fleet repo as source of truth, so basic operation
      needs no Azure subscription. Connecting Azure later — from the Resources
      page — unlocks <em>live</em> drift detection (live ARM vs repo) instead
      of the CI snapshot. Real deploys still run through your existing CI/CD
      pipeline against the repo, not from this app. See{" "}
      <Link href="/developer" className="text-accent underline">
        Source
      </Link>{" "}
      for the wired tree.
    </p>
  );
}
