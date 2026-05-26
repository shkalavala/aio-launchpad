"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SecretEntry } from "@/lib/types";
import {
  effectiveK8sKey,
  effectiveK8sName,
  validateSecretName,
  type SecretStatus,
} from "@/lib/secrets";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Props {
  siteName: string;
  entries: SecretEntry[];
  /** Set of secretNames that came from the original fixture (used for status display). */
  fixtureNames: Set<string>;
  /** Whether this site has been edited (i.e. entries differ from fixture). */
  hasOverlay: boolean;
  onChange: (next: SecretEntry[]) => void;
}

/**
 * Per-site secrets table. Renders the SecretEntry array as rows + an inline
 * "+ Add secret" affordance. Each row exposes a `createInKv` toggle whose
 * polarity matches Scale Kit: on (default) = pipeline creates the secret in
 * the central KV; off = the secret already exists in the KV and we only
 * reference it.
 *
 * Status semantics are intentionally simple: synced = same as fixture,
 * pending = added or edited this session, error = metadata fails validation
 * (e.g. invalid secretName).
 */
export function SecretsTable({ siteName, entries, fixtureNames, hasOverlay, onChange }: Props) {
  const [draftName, setDraftName] = useState("");
  const [draftK8sName, setDraftK8sName] = useState("");
  const [draftK8sKey, setDraftK8sKey] = useState("");
  const [draftCreateInKv, setDraftCreateInKv] = useState(true);
  const [draftError, setDraftError] = useState<string | undefined>();

  const existingNames = useMemo(() => new Set(entries.map((e) => e.secretName)), [entries]);

  const addRow = () => {
    const err = validateSecretName(draftName);
    if (err) {
      setDraftError(err);
      return;
    }
    const name = draftName.trim();
    if (existingNames.has(name)) {
      setDraftError(`Secret "${name}" already exists for this site.`);
      return;
    }
    const next: SecretEntry = {
      secretName: name,
      ...(draftK8sName.trim() ? { kubernetesSecretName: draftK8sName.trim() } : {}),
      ...(draftK8sKey.trim() ? { kubernetesSecretKey: draftK8sKey.trim() } : {}),
      // Only persist `createInKv` when overriding the default (true).
      ...(draftCreateInKv === false ? { createInKv: false } : {}),
    };
    onChange([...entries, next]);
    setDraftName("");
    setDraftK8sName("");
    setDraftK8sKey("");
    setDraftCreateInKv(true);
    setDraftError(undefined);
  };

  const removeAt = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    onChange(next);
  };

  const toggleCreateInKv = (idx: number) => {
    const next = entries.map((e, i) => {
      if (i !== idx) return e;
      // Treat undefined as the default (true). Toggle flips between true and false.
      const current = e.createInKv !== false;
      return { ...e, createInKv: !current };
    });
    onChange(next);
  };

  const statusFor = (entry: SecretEntry): SecretStatus => {
    if (validateSecretName(entry.secretName)) return "error";
    // If this row has been edited this session (overlay), prioritise that signal.
    if (hasOverlay && !fixtureNames.has(entry.secretName)) return "pending";
    // Otherwise surface the actual sync status from the fixture (drift / error /
    // missing-in-kv / syncing all need to be visible to the operator). The
    // fixture-only "never" state (declared but never synced) renders as
    // pending in the UI — the SecretStatus union doesn't carry it through.
    if (entry.syncStatus === "never") return "pending";
    if (entry.syncStatus) return entry.syncStatus;
    return "synced";
  };

  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex items-baseline justify-between border-b border-border-subtle px-3 py-2">
        <div>
          <h2 className="text-[13px] font-semibold text-fg">Secrets for {siteName}</h2>
          <p className="text-[11px] text-fg-subtle">
            Metadata only. Values live in the central Key Vault and sync to the
            cluster via the Secret Store CSI driver.
          </p>
        </div>
        <span className="text-[12px] text-fg-muted">
          <span className="font-semibold text-fg">{entries.length}</span> entries
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-subtle">
              <Th>Secret name (in Key Vault)</Th>
              <Th>Kubernetes Secret</Th>
              <Th>Key</Th>
              <Th>Vault state</Th>
              <Th>Create in KV</Th>
              <Th>Status</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[12px] text-fg-subtle">
                  No secrets declared for this site. Add one below.
                </td>
              </tr>
            )}
            {entries.map((entry, idx) => {
              const status = statusFor(entry);
              const willCreate = entry.createInKv !== false;
              return (
                <tr
                  key={`${entry.secretName}-${idx}`}
                  className="border-b border-border-subtle last:border-0"
                >
                  <Td>
                    <code className="font-mono text-fg">{entry.secretName}</code>
                  </Td>
                  <Td>
                    <code className="font-mono text-fg-muted">{effectiveK8sName(entry)}</code>
                  </Td>
                  <Td>
                    <code className="font-mono text-fg-muted">{effectiveK8sKey(entry)}</code>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-fg-muted">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          willCreate ? "bg-accent" : "bg-success-fg",
                        )}
                        aria-hidden
                      />
                      {willCreate ? "Create new" : "Already in KV"}
                    </span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => toggleCreateInKv(idx)}
                      className={cn(
                        "inline-flex h-5 w-9 items-center rounded-full border transition",
                        willCreate
                          ? "border-accent bg-accent justify-end"
                          : "border-border bg-bg justify-start",
                      )}
                      title={willCreate
                        ? "On (default): pipeline creates this secret in the central KV"
                        : "Off: secret already exists in the KV — we only reference it"}
                    >
                      <span className="m-[2px] block h-3 w-3 rounded-full bg-bg" />
                    </button>
                  </Td>
                  <Td>
                    <StatusBadge status={status} />
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      className="rounded-sm border border-border bg-bg p-1 text-fg-subtle hover:bg-bg-subtle hover:text-danger-fg"
                      title="Remove this secret entry"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Td>
                </tr>
              );
            })}

            <tr className="bg-bg-subtle">
              <Td>
                <input
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    setDraftError(undefined);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && addRow()}
                  placeholder="secret-name-in-kv"
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px]"
                />
              </Td>
              <Td>
                <input
                  value={draftK8sName}
                  onChange={(e) => setDraftK8sName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRow()}
                  placeholder="(defaults to secret name)"
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px]"
                />
              </Td>
              <Td>
                <input
                  value={draftK8sKey}
                  onChange={(e) => setDraftK8sKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRow()}
                  placeholder="(defaults to secret name)"
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px]"
                />
              </Td>
              <Td>
                <span className="text-fg-subtle">{draftCreateInKv ? "Create new" : "Already in KV"}</span>
              </Td>
              <Td>
                <button
                  type="button"
                  onClick={() => setDraftCreateInKv((v) => !v)}
                  className={cn(
                    "inline-flex h-5 w-9 items-center rounded-full border transition",
                    draftCreateInKv
                      ? "border-accent bg-accent justify-end"
                      : "border-border bg-bg justify-start",
                  )}
                  title="On (default): pipeline creates this secret in the KV. Off: already exists in KV."
                >
                  <span className="m-[2px] block h-3 w-3 rounded-full bg-bg" />
                </button>
              </Td>
              <Td>
                <span className="text-fg-subtle">draft</span>
              </Td>
              <Td>
                <button
                  type="button"
                  onClick={addRow}
                  disabled={!draftName.trim()}
                  className="inline-flex items-center gap-1 rounded-sm border border-accent bg-accent-subtle px-2 py-1 text-[12px] text-accent disabled:opacity-50"
                  title="Add secret entry"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </Td>
            </tr>
          </tbody>
        </table>
      </div>
      {draftError && (
        <div className="border-t border-border-subtle px-3 py-2 text-[12px] text-danger-fg">
          {draftError}
        </div>
      )}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-1.5 font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function StatusBadge({ status }: { status: SecretStatus }) {
  if (status === "synced") return <Badge tone="success">Synced</Badge>;
  if (status === "pending") return <Badge tone="warning">Pending</Badge>;
  if (status === "syncing") return <Badge tone="accent">Syncing</Badge>;
  if (status === "drift") return <Badge tone="warning">Drift</Badge>;
  if (status === "missing-in-kv") return <Badge tone="danger">Missing in KV</Badge>;
  return <Badge tone="danger">Error</Badge>;
}
