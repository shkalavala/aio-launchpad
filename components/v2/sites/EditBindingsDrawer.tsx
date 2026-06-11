"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Layers,
  Loader2,
  RotateCcw,
  CornerDownRight,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRepoConnection } from "@/store/useRepoConnection";
import { useBindingStage } from "@/store/useBindingStage";
import { fetchFile } from "@/lib/github/client";
import { newSitePath } from "@/lib/v2/authorSite";
import {
  readLeafBindings,
  inheritedSubscription,
  bindingDeltas,
  isMeaningfulEdit,
  patchSiteYaml,
  type BindingEdit,
  type LeafBindings,
} from "@/lib/v2/bindings";
import type { FleetSite } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Edit an existing site's Azure bindings (subscription / resource group / Arc
 * cluster name) and STAGE the change. Staging accumulates edits across multiple
 * sites in the batch area; one PR for the whole set is opened from the
 * change-management flyout. Mirrors the Add/Remove site drawer pattern.
 *
 * We read the file's exact bytes on open and patch only the edited nodes at PR
 * time, so the leaf YAML's comments and formatting survive untouched.
 */
export function EditBindingsDrawer({
  fs,
  onClose,
}: {
  fs: FleetSite;
  onClose: () => void;
}) {
  const connection = useRepoConnection((s) => s.connection);
  const stage = useBindingStage((s) => s.stage);
  const alreadyStaged = useBindingStage((s) => s.staged[fs.site.name]);

  const filePath = connection ? newSitePath(connection.workspace, fs.site.name) : "";
  const inheritedSub = useMemo(() => inheritedSubscription(fs.ancestry), [fs.ancestry]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [before, setBefore] = useState<LeafBindings>({});

  // Form fields. Empty subscription = inherit (no leaf override).
  const [subscription, setSubscription] = useState("");
  const [resourceGroup, setResourceGroup] = useState("");
  const [clusterName, setClusterName] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!connection) {
      setLoading(false);
      setLoadError("Connect a repository first to edit bindings.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchFile(
      { owner: connection.owner, repo: connection.repo, branch: connection.branch, token: connection.token },
      filePath,
    )
      .then(({ text }) => {
        if (cancelled) return;
        const leaf = readLeafBindings(text);
        setOriginalText(text);
        setBefore(leaf);
        setSubscription(leaf.subscription ?? "");
        setResourceGroup(leaf.resourceGroup ?? "");
        setClusterName(leaf.clusterName ?? "");
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to read the site file.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, filePath]);

  // Build the binding edit from the current form vs the leaf's original values.
  const edit = useMemo<BindingEdit>(() => {
    const e: BindingEdit = {};
    const subTrim = subscription.trim();
    if (subTrim === "" && before.subscription !== undefined) {
      e.subscription = null; // reset-to-inherited (remove the leaf key)
    } else if (subTrim !== "" && subTrim !== (before.subscription ?? "")) {
      e.subscription = subTrim;
    }
    const rgTrim = resourceGroup.trim();
    if (rgTrim !== "" && rgTrim !== (before.resourceGroup ?? "")) {
      e.resourceGroup = rgTrim;
    }
    const clusterTrim = clusterName.trim();
    if (clusterTrim !== "" && clusterTrim !== (before.clusterName ?? "")) {
      e.clusterName = clusterTrim;
    }
    return e;
  }, [subscription, resourceGroup, clusterName, before]);

  const hasChange = isMeaningfulEdit(before, edit);
  const deltas = useMemo(() => bindingDeltas(before, edit, inheritedSub), [before, edit, inheritedSub]);
  const preview = useMemo(
    () => (hasChange ? patchSiteYaml(originalText, edit) : originalText),
    [hasChange, originalText, edit],
  );

  // Subscription state for the field note.
  const subOverridden = subscription.trim() !== "";
  const canResetSub = inheritedSub !== undefined && subOverridden;

  function onStage() {
    if (!hasChange) return;
    stage({
      siteName: fs.site.name,
      filePath,
      originalText,
      before,
      edit,
      deltas,
      inheritedSubscription: inheritedSub,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-[560px] flex-col bg-surface shadow-depth16">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <Layers className="h-4 w-4 text-accent" />
            Edit Azure bindings
            <span className="font-mono text-[12px] font-normal text-fg-subtle">{fs.site.name}</span>
          </h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-fg-subtle">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading {fs.site.name} from the repository…
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[12px] text-fg">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {loadError}
            </div>
          ) : (
            <div className="space-y-5">
              {alreadyStaged && (
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-[12px] text-fg">
                  This site already has staged edits. Saving again replaces them in the batch.
                </div>
              )}

              {/* Subscription */}
              <Field
                label="Azure subscription"
                hint={
                  subOverridden ? (
                    <span className="text-warning">Overriding the inherited subscription on this site.</span>
                  ) : inheritedSub ? (
                    <>
                      Inheriting <span className="font-mono">{inheritedSub}</span> from the region template. Leave
                      empty to keep inheriting.
                    </>
                  ) : (
                    "No inherited subscription — set one explicitly."
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={subscription}
                    onChange={(e) => setSubscription(e.target.value)}
                    placeholder={inheritedSub ?? "00000000-0000-0000-0000-000000000000"}
                    className="font-mono text-[12px]"
                  />
                  {canResetSub && (
                    <button
                      type="button"
                      onClick={() => setSubscription("")}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded border border-border px-2 text-[11px] font-medium text-fg-subtle hover:bg-bg-subtle hover:text-fg"
                      title="Reset to inherited"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Inherit
                    </button>
                  )}
                </div>
              </Field>

              {/* Resource group */}
              <Field label="Resource group" hint="Leaf-owned. The resource group the AIO instance deploys into.">
                <Input
                  value={resourceGroup}
                  onChange={(e) => setResourceGroup(e.target.value)}
                  placeholder="rg-iot-…"
                  className="font-mono text-[12px]"
                />
              </Field>

              {/* Cluster name */}
              <Field label="Arc cluster name" hint="Leaf-owned (parameters.clusterName). The connected Arc cluster.">
                <Input
                  value={clusterName}
                  onChange={(e) => setClusterName(e.target.value)}
                  placeholder="…-arc"
                  className="font-mono text-[12px]"
                />
              </Field>

              {/* Change summary */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Staged changes
                </div>
                {deltas.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[12px] text-fg-subtle">
                    No changes yet. Edit a field above to stage a binding change.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {deltas.map((d) => (
                      <div
                        key={d.field}
                        className="flex items-start gap-2 rounded-md border border-border bg-bg-subtle/40 px-3 py-2 text-[12px]"
                      >
                        <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        <div>
                          <div className="font-medium text-fg">{d.label}</div>
                          <div className="font-mono text-[11px] text-fg-subtle">
                            <span className="line-through">{d.before}</span>
                            <span className="mx-1 text-fg-muted">→</span>
                            <span className="text-fg">{d.after}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* YAML preview */}
              {hasChange && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    Patched file preview
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-md border border-border bg-bg-subtle/60 p-3 font-mono text-[11px] leading-relaxed text-fg">
                    {preview}
                  </pre>
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    Comments and key order are preserved — only the edited values change.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={onStage} disabled={!hasChange || loading}>
            <PlusCircle className="h-3.5 w-3.5" />
            {alreadyStaged ? "Update staged edit" : "Stage edit"}
          </Button>
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
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-fg">{label}</label>
      {children}
      {hint && <p className={cn("mt-1 text-[11px] text-fg-subtle")}>{hint}</p>}
    </div>
  );
}
