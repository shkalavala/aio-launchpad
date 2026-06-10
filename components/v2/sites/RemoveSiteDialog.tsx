"use client";

import { useState } from "react";
import {
  X,
  GitPullRequestArrow,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRepoConnection } from "@/store/useRepoConnection";
import { writerFromConnection, resolveWriteToken, envWriteToken } from "@/lib/github/writeClient";
import { buildSiteRemoval, newSitePath, removeSiteBranch } from "@/lib/v2/authorSite";

/**
 * Remove a site from the connected repo by opening a real pull request that
 * deletes its kind:Site YAML. Mirrors AddSiteWizard: PR-only, no local fleet
 * mutation — the site disappears from the fleet once the PR merges.
 *
 * Safety: the operator must type the site name to confirm, since a removal is
 * a destructive change to the fleet roster.
 */
export function RemoveSiteDialog({
  siteName,
  onClose,
}: {
  siteName: string;
  onClose: () => void;
}) {
  const connection = useRepoConnection((s) => s.connection);

  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ number: number; url: string } | null>(null);

  const effectiveToken = resolveWriteToken(token, connection?.token);
  const confirmed = confirm.trim() === siteName;
  const canSubmit = !!connection && confirmed && !!effectiveToken && !submitting;
  const filePath = connection ? newSitePath(connection.workspace, siteName) : "";

  async function onCreatePr() {
    if (!connection) return;
    setSubmitting(true);
    setError(null);
    try {
      const writer = writerFromConnection({ ...connection, token: effectiveToken });
      if (!writer) {
        throw new Error("A write-scoped token is required to open a pull request.");
      }
      const pr = await writer.authorChange({
        branch: removeSiteBranch(siteName),
        changes: [buildSiteRemoval(connection.workspace, siteName)],
        commitMessage: `Remove site ${siteName}`,
        prTitle: `Remove site ${siteName}`,
        prBody: [
          `Removes the site \`${siteName}\` from the fleet, authored via AIO Launchpad.`,
          "",
          `- Deletes: \`${filePath}\``,
          "",
          "The site leaves the fleet once this PR is reviewed and merged.",
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
            <Trash2 className="h-4 w-4 text-danger" />
            Remove site
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
                    <span className="font-mono">{siteName}</span> will leave the fleet once this PR is
                    reviewed and merged into{" "}
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
                  Connect a repository first (Change management - Repository) to remove a site.
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-[12px] text-fg">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <div>
                  <p className="font-semibold">This removes the site from the fleet roster.</p>
                  <p className="mt-1 text-fg-muted">
                    It deletes the site&apos;s desired-state YAML from git. It does not tear down the
                    cluster or Azure resources — decommission those separately.
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    File to delete
                  </span>
                </div>
                <pre className="overflow-auto rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] leading-relaxed text-fg">
                  {filePath || "(connect a repository)"}
                </pre>
              </div>

              <Field
                label="Confirm site name"
                hint={`type "${siteName}" to enable removal`}
              >
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={siteName}
                  spellCheck={false}
                  autoComplete="off"
                />
              </Field>

              {connection && !connection.token && !envWriteToken() && (
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

              {connection && !connection.token && envWriteToken() && (
                <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
                  <KeyRound className="h-3 w-3" />
                  Using the local dev token (NEXT_PUBLIC_GH_TOKEN) for this write.
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
            <Button variant="danger" onClick={onCreatePr} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Opening PR...
                </>
              ) : (
                <>
                  <GitPullRequestArrow className="h-3.5 w-3.5" />
                  Open removal PR
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
