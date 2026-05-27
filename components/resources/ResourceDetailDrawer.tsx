// Slide-in detail drawer for a single AIO resource. Renders the resource as
// Bicep (best-effort, from the clone JSON) plus the suggested target path in
// the fleet repo. All actions are mocks — this is a concept preview.

"use client";

import { useState } from "react";
import { Copy, GitPullRequest, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  toBicep,
  targetBicepPath,
  type AioResource,
} from "@/lib/fixtures/aioResources";

interface Props {
  resource: AioResource | null;
  bicepRoot: string;
  fleetRepo: string | null;
  branch: string;
  onClose: () => void;
}

export function ResourceDetailDrawer({
  resource,
  bicepRoot,
  fleetRepo,
  branch,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!resource) return null;

  const bicep = toBicep(resource);
  const path = targetBicepPath(resource, bicepRoot);

  function copy() {
    navigator.clipboard.writeText(bicep).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  function flashAction(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2400);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent">
              {resource.displayType}
            </div>
            <h2 className="mt-2 truncate font-mono text-[15px] font-semibold text-fg">
              {resource.name}
            </h2>
            <div className="mt-1 truncate font-mono text-[11px] text-fg-subtle">
              {resource.armType}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Section label="Target path in fleet repo">
            <div className="flex items-center gap-2 font-mono text-[12px] text-fg">
              {fleetRepo ? (
                <>
                  <span className="text-fg-subtle">{fleetRepo}</span>
                  <span className="text-fg-subtle">·</span>
                  <span>{branch}</span>
                  <span className="text-fg-subtle">·</span>
                  <span className="text-accent">{path}</span>
                </>
              ) : (
                <span className="text-fg-muted">
                  No fleet repo connected — configure in /connect
                </span>
              )}
            </div>
          </Section>

          <Section
            label="Bicep preview"
            right={
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            }
          >
            <pre className="max-h-[55vh] overflow-auto rounded-md border border-border bg-bg-subtle p-3 font-mono text-[11px] leading-relaxed text-fg">
              <code>{bicep}</code>
            </pre>
            <p className="mt-2 text-[11px] text-fg-subtle">
              Best-effort emission from the clone JSON. ARM expressions like{" "}
              <span className="font-mono">parameters(&apos;instanceName&apos;)</span>{" "}
              are preserved verbatim — a real implementation would resolve
              parameters or convert to Bicep params.
            </p>
          </Section>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border bg-bg-subtle/50 px-5 py-3">
          <div className="text-[11px] text-fg-muted">
            {flash ?? (fleetRepo ? "Ready to push" : "Connect a fleet repo to push")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              size="sm"
              disabled={!fleetRepo}
              onClick={() =>
                flashAction(`Mock: opened PR adding ${path} to ${fleetRepo}`)
              }
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              Add via PR
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!fleetRepo}
              onClick={() =>
                flashAction(`Mock: committed ${path} to ${branch}`)
              }
            >
              <Upload className="h-3.5 w-3.5" />
              Commit direct
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          {label}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}
