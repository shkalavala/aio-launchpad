"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCommitHorizontal, RotateCcw, Save } from "lucide-react";
import type { FleetSite } from "@/lib/types";
import { useV2Store } from "@/store/useV2Store";
import {
  EDITABLE_FIELDS,
  buildConfigPair,
  getAtPath,
  siteConfigPath,
  type EditableField,
} from "@/lib/v2/config";
import { DiffView } from "@/components/v2/diff/DiffView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

/**
 * In-UI editor for a single site's configuration overrides.
 * Every edit resolves through a pending change → commit / PR; it never
 * writes directly to the cluster.
 */
export function ConfigEditor({ fs }: { fs: FleetSite }) {
  const siteName = fs.site.name;
  const staged = useV2Store((s) => s.configOverrides[siteName]);
  const stageConfigEdit = useV2Store((s) => s.stageConfigEdit);
  const discardPending = useV2Store((s) => s.discardPending);
  const pendingChange = useV2Store((s) =>
    s.pendingChanges.find((c) => c.path === siteConfigPath(siteName)),
  );

  // The committed baseline (no staged edits) — used to compute each field's `before`.
  const committed = useMemo(() => buildConfigPair(fs), [fs]);
  // The live pair, including staged edits, drives the controls + diff.
  const live = useMemo(() => buildConfigPair(fs, staged), [fs, staged]);

  const stagedKeys = staged ? Object.keys(staged) : [];

  function onEdit(field: EditableField, raw: unknown) {
    const before = getAtPath(committed.override, field.path);
    const nextStaged = { ...(staged ?? {}), [field.path]: raw };
    const afterConfig = buildConfigPair(fs, nextStaged).override;
    stageConfigEdit({
      siteName,
      path: siteConfigPath(siteName),
      key: field.path,
      before,
      after: raw,
      beforeConfig: committed.override,
      afterConfig,
    });
  }

  function discard() {
    if (pendingChange) discardPending(pendingChange.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/v2/sites/${siteName}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-fg-subtle hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {siteName}
        </Link>
        {stagedKeys.length > 0 && (
          <span className="text-[12px] text-warning">
            {stagedKeys.length} unsaved {stagedKeys.length === 1 ? "change" : "changes"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editable fields */}
        <section className="rounded-md border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-fg">Site overrides</h2>
            <p className="text-[12px] text-fg-subtle">
              Values set here override the inherited global template.
            </p>
          </header>
          <div className="divide-y divide-border">
            {EDITABLE_FIELDS.map((field) => {
              const value = getAtPath(live.override, field.path);
              const inherited = getAtPath(committed.base, field.path);
              const isStaged = stagedKeys.includes(field.path);
              return (
                <div key={field.path} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="text-[13px] text-fg">{field.label}</label>
                      {isStaged && (
                        <Badge tone="warning" className="text-[10px]">
                          edited
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-fg-subtle">
                      {field.path} · template {fmtVal(inherited)}
                    </p>
                  </div>
                  <FieldControl field={field} value={value} onChange={(v) => onEdit(field, v)} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Live diff */}
        <section className="space-y-2">
          <h2 className="text-[13px] font-semibold text-fg">Resulting diff</h2>
          <DiffView base={live.base} override={live.override} />
        </section>
      </div>

      {/* Pending change footer */}
      {pendingChange && (
        <div className="flex items-center justify-between rounded-md border border-accent/40 bg-accent/5 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-fg">
            <GitCommitHorizontal className="h-4 w-4 text-accent" />
            <span>
              Pending change staged on{" "}
              <span className="font-mono">{siteConfigPath(siteName)}</span> —{" "}
              {pendingChange.fields.length}{" "}
              {pendingChange.fields.length === 1 ? "field" : "fields"}. Review and commit in{" "}
              <span className="font-medium">Change management</span>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={discard}>
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </Button>
            <Button variant="subtle" size="sm" disabled title="Review in Change management">
              <Save className="h-3.5 w-3.5" />
              In Change management
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: EditableField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(value)}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          value ? "bg-accent" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    );
  }
  if (field.kind === "enum") {
    return (
      <Select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="w-36 shrink-0"
      >
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      type="number"
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => {
        const n = e.target.value === "" ? 0 : Number(e.target.value);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      className="w-24 shrink-0"
    />
  );
}

function fmtVal(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
