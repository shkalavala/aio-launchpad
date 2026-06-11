"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Layers,
  MapPin,
  Loader2,
  AlertTriangle,
  CornerDownRight,
  PlusCircle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useRepoConnection } from "@/store/useRepoConnection";
import { useChangeStage, stagedTemplateKey } from "@/store/useChangeStage";
import { fetchFile } from "@/lib/github/client";
import { resolveWriteToken } from "@/lib/github/writeClient";
import {
  templateFields,
  readTemplateValues,
  patchTemplateYaml,
  templateDeltas,
  blastRadius,
} from "@/lib/v2/templateEdit";
import { templateRole } from "@/lib/v2/format";
import type { FleetSite, SiteTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Edit a TEMPLATE's defaults — the riskiest tier, because the change cascades
 * to every site that inherits the field. We show the BLAST RADIUS (which fleet
 * sites would actually change) before staging, then surgically patch the
 * template YAML and stage it into the same batch PR as site edits.
 */
export function TemplateEditDrawer({
  template,
  relPath,
  fleet,
  onClose,
}: {
  template: SiteTemplate;
  /** Template path relative to the sites/ dir, e.g. "shared/sweden.yaml". */
  relPath: string;
  fleet: FleetSite[];
  onClose: () => void;
}) {
  const connection = useRepoConnection((s) => s.connection);
  const stage = useChangeStage((s) => s.stage);
  const alreadyStaged = useChangeStage((s) => s.staged[stagedTemplateKey(template.name)]);

  const fields = useMemo(() => templateFields(template), [template]);
  const role = useMemo(
    () =>
      templateRole({
        inherits: template.inherits,
        subscription: (template as unknown as { subscription?: string }).subscription,
        location: template.location,
      }),
    [template],
  );
  const filePath = connection
    ? `${connection.workspace.replace(/\/$/, "")}/sites/${relPath}`
    : "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [before, setBefore] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (!connection) {
      setLoading(false);
      setLoadError("Connect a repository first to edit template defaults.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchFile(
      {
        owner: connection.owner,
        repo: connection.repo,
        branch: connection.branch,
        token: resolveWriteToken(connection.token),
      },
      filePath,
    )
      .then(({ text }) => {
        if (cancelled) return;
        const current = readTemplateValues(text, fields);
        setOriginalText(text);
        setBefore(current);
        setValues(current);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to read the template file.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, filePath, fields]);

  const deltas = useMemo(() => templateDeltas(fields, before, values), [fields, before, values]);
  const hasChange = deltas.length > 0;
  const affected = useMemo(
    () => (hasChange ? blastRadius(template.name, deltas.map((d) => d.field), fleet, fields) : []),
    [hasChange, template.name, deltas, fleet, fields],
  );
  const preview = useMemo(
    () => (hasChange ? patchTemplateYaml(originalText, fields, values) : originalText),
    [hasChange, originalText, fields, values],
  );

  function onStage() {
    if (!hasChange) return;
    stage({
      key: stagedTemplateKey(template.name),
      kind: "template-default",
      title: template.name,
      subtitle: `${role.label} template`,
      filePath,
      patchedText: patchTemplateYaml(originalText, fields, values),
      deltas,
      affectedSites: affected,
    });
    onClose();
  }

  const TierIcon = role.tier === "subscription" ? MapPin : Layers;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-[560px] flex-col bg-surface shadow-depth16">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <TierIcon className="h-4 w-4 text-accent" />
            Edit template defaults
            <span className="font-mono text-[12px] font-normal text-fg-subtle">{template.name}</span>
          </h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-fg-subtle">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading {template.name} from the repository…
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[12px] text-fg">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {loadError}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 text-[12px] text-fg-muted">
                <span className="font-medium text-fg">{role.label}</span> template — supplies{" "}
                {role.supplies} to inheriting sites. Edits cascade to every site that doesn&apos;t
                override the field.
              </div>

              {alreadyStaged && (
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-[12px] text-fg">
                  This template already has staged edits. Saving again replaces them in the batch.
                </div>
              )}

              {fields.map((f) => (
                <div key={f.id}>
                  <label className="mb-1 block text-[12px] font-semibold text-fg">{f.label}</label>
                  {f.kind === "select" ? (
                    <Select
                      className="w-full"
                      value={values[f.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                    >
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={values[f.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                      className="font-mono text-[12px]"
                    />
                  )}
                  {f.hint && <p className="mt-1 text-[11px] text-fg-subtle">{f.hint}</p>}
                </div>
              ))}

              {/* Blast radius */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  <Target className="h-3.5 w-3.5" />
                  Blast radius
                </div>
                {!hasChange ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[12px] text-fg-subtle">
                    Edit a field to see which sites would inherit the change.
                  </p>
                ) : affected.length === 0 ? (
                  <p className="rounded-md border border-border bg-bg-subtle/40 px-3 py-2.5 text-[12px] text-fg-muted">
                    No sites inherit these fields from this template — every site overrides them.
                  </p>
                ) : (
                  <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[12px]">
                    <div className="font-medium text-fg">
                      {affected.length} site{affected.length === 1 ? "" : "s"} would change
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {affected.map((name) => (
                        <span
                          key={name}
                          className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Change summary */}
              {hasChange && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    Staged changes
                  </div>
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
                </div>
              )}

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
