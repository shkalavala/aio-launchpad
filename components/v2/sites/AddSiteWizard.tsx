"use client";

import { useMemo, useState } from "react";
import {
  X,
  GitPullRequestArrow,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useRepoConnection } from "@/store/useRepoConnection";
import { writerFromConnection } from "@/lib/github/writeClient";
import {
  buildSiteYaml,
  buildSiteFileChange,
  defaultClusterName,
  defaultResourceGroup,
  isValidSiteName,
  newSiteBranch,
  newSitePath,
  type BrokerProfile,
  type NewSiteInput,
} from "@/lib/v2/authorSite";

/**
 * Author a new kind:Site and open a real pull request against the connected
 * repo. Requires a write-scoped token; if the connection has none, the
 * operator can supply one here (held in memory for this submit only).
 *
 * On success we DO NOT mutate the local fleet: the site lives on a PR branch
 * and only appears once that PR is merged into the connected branch. We link
 * straight to the PR so the operator can review/merge it.
 */
export function AddSiteWizard({ onClose }: { onClose: () => void }) {
  const connection = useRepoConnection((s) => s.connection);
  const templates = useRepoConnection((s) => s.templates);
  const templatePaths = useRepoConnection((s) => s.templatePaths);

  const inheritOptions = useMemo(
    () =>
      templates
        .map((t) => ({ name: t.name, path: templatePaths[t.name], location: t.location }))
        .filter((o) => !!o.path)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [templates, templatePaths],
  );

  const [name, setName] = useState("");
  const [inherits, setInherits] = useState(inheritOptions[0]?.path ?? "");
  const [environment, setEnvironment] = useState("dev");
  const [city, setCity] = useState("");
  const [rgTouched, setRgTouched] = useState(false);
  const [resourceGroup, setResourceGroup] = useState("");
  const [clusterTouched, setClusterTouched] = useState(false);
  const [clusterName, setClusterName] = useState("");
  const [brokerProfile, setBrokerProfile] = useState<BrokerProfile>("Low");
  const [token, setToken] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ number: number; url: string } | null>(null);

  // Resource group / cluster name auto-fill from the site name until the
  // operator edits them directly.
  const effectiveRg = rgTouched ? resourceGroup : defaultResourceGroup(name);
  const effectiveCluster = clusterTouched ? clusterName : defaultClusterName(name);

  const nameValid = isValidSiteName(name);
  const effectiveToken = (token.trim() || connection?.token || "").trim();
  const canSubmit =
    !!connection && nameValid && !!inherits && !!environment.trim() && !!effectiveToken && !submitting;

  const input: NewSiteInput = {
    name: nameValid ? name : "<site-name>",
    inherits: inherits || "<shared-default>",
    environment: environment.trim() || "dev",
    city,
    resourceGroup: effectiveRg || "<resource-group>",
    clusterName: effectiveCluster || "<cluster-name>",
    brokerProfile,
  };

  const yaml = useMemo(() => buildSiteYaml(input), [input]);
  const filePath = connection ? newSitePath(connection.workspace, input.name) : "";

  async function onCreatePr() {
    if (!connection) return;
    setSubmitting(true);
    setError(null);
    try {
      const writer = writerFromConnection({ ...connection, token: effectiveToken });
      if (!writer) {
        throw new Error("A write-scoped token is required to open a pull request.");
      }
      const realInput: NewSiteInput = {
        name,
        inherits,
        environment: environment.trim(),
        city,
        resourceGroup: effectiveRg,
        clusterName: effectiveCluster,
        brokerProfile,
      };
      const change = buildSiteFileChange(connection.workspace, realInput);
      const branch = newSiteBranch(name);
      const pr = await writer.authorChange({
        branch,
        changes: [change],
        commitMessage: `Add site ${name}`,
        prTitle: `Add site ${name}`,
        prBody: [
          `Adds a new site \`${name}\` authored via AIO Launchpad.`,
          "",
          `- Inherits: \`${inherits}\``,
          `- Environment: \`${environment.trim()}\``,
          `- Resource group: \`${effectiveRg}\``,
          `- Broker profile: ${brokerProfile}`,
        ].join("\n"),
      });
      setResult({ number: pr.number, url: pr.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open the pull request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-[520px] flex-col bg-surface shadow-depth16">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <GitPullRequestArrow className="h-4 w-4 text-accent" />
            Add a site
          </h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div className="text-[12px] text-fg">
                  <p className="font-semibold">Pull request #{result.number} opened</p>
                  <p className="mt-1 text-fg-muted">
                    The site will appear in the fleet once this PR is reviewed and merged into{" "}
                    <span className="font-mono">{connection?.branch}</span>.
                  </p>
                </div>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded border border-border-strong bg-surface px-3 text-[13px] font-semibold text-fg hover:bg-bg-subtle"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Review pull request on GitHub
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {!connection && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-[12px] text-fg">
                  Connect a repository first (Change management - Repository) to author a site.
                </div>
              )}

              <Field label="Site name" hint="lowercase, hyphens, e.g. berlin-dev">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase())}
                  placeholder="berlin-dev"
                  spellCheck={false}
                />
                {name.length > 0 && !nameValid && (
                  <p className="mt-1 text-[11px] text-danger">
                    Use lowercase letters, digits, and hyphens (3-50 chars).
                  </p>
                )}
              </Field>

              <Field label="Inherits from" hint="a shared default supplies subscription + location">
                <Select value={inherits} onChange={(e) => setInherits(e.target.value)} className="w-full">
                  {inheritOptions.length === 0 && <option value="">No templates found</option>}
                  {inheritOptions.map((o) => (
                    <option key={o.path} value={o.path}>
                      {o.name}
                      {o.location ? ` (${o.location})` : ""} - {o.path}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Environment">
                  <Input
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="dev"
                    spellCheck={false}
                  />
                </Field>
                <Field label="City" hint="optional label">
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Berlin"
                    spellCheck={false}
                  />
                </Field>
              </div>

              <Field label="Resource group">
                <Input
                  value={effectiveRg}
                  onChange={(e) => {
                    setRgTouched(true);
                    setResourceGroup(e.target.value);
                  }}
                  placeholder="rg-iot-berlin-dev"
                  spellCheck={false}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Arc cluster name">
                  <Input
                    value={effectiveCluster}
                    onChange={(e) => {
                      setClusterTouched(true);
                      setClusterName(e.target.value);
                    }}
                    placeholder="berlin-dev-arc"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Broker profile">
                  <Select
                    value={brokerProfile}
                    onChange={(e) => setBrokerProfile(e.target.value as BrokerProfile)}
                    className="w-full"
                  >
                    <option value="Low">Low (single replica)</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (prod scale)</option>
                  </Select>
                </Field>
              </div>

              {/* YAML preview */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    Preview
                  </span>
                  {filePath && <span className="font-mono text-[11px] text-fg-subtle">{filePath}</span>}
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-bg-subtle p-3 text-[11px] leading-relaxed text-fg">
                  {yaml}
                </pre>
              </div>

              {/* Write token */}
              {connection && !connection.token && (
                <Field
                  label="Write token"
                  hint="needs Contents + Pull requests: read & write. Held in memory for this submit only."
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                    <Input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="github_pat_..."
                      spellCheck={false}
                    />
                  </div>
                </Field>
              )}

              {connection?.token && (
                <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
                  <KeyRound className="h-3 w-3" />
                  Using the connected token for this write.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-[12px] text-fg">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button variant="primary" onClick={onCreatePr} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Opening PR...
                </>
              ) : (
                <>
                  <GitPullRequestArrow className="h-3.5 w-3.5" />
                  Create pull request
                </>
              )}
            </Button>
          )}
        </footer>
      </div>
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
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-[12px] font-medium text-fg">
        {label}
        {hint && <span className="font-normal text-fg-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
