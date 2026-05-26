"use client";

import { useMemo } from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import type { SecretSyncStatus } from "@/lib/types";
import { SECRETS_BY_SITE } from "@/lib/fixtures/secrets";
import { cn } from "@/lib/utils";

interface Props {
  sites: string[];
  selectedSite: string;
  onSelectSite: (name: string) => void;
}

type Counts = Record<SecretSyncStatus, number> & { total: number };

const PROBLEM_STATES: SecretSyncStatus[] = ["drift", "error", "missing-in-kv"];

function countsFor(siteName: string): Counts {
  const entries = SECRETS_BY_SITE[siteName] ?? [];
  const c: Counts = {
    total: entries.length,
    synced: 0,
    syncing: 0,
    drift: 0,
    "missing-in-kv": 0,
    error: 0,
    never: 0,
  };
  for (const e of entries) {
    const s = e.syncStatus ?? "synced";
    c[s] += 1;
  }
  return c;
}

/**
 * Fleet-wide rollup of per-site secret sync state. Closes the audit gap
 * (walkthrough-2026-05-26 §6 #3 / §8.3.2): per-site drift was invisible
 * until you flipped the site dropdown to the right name. This surface
 * lets Operations IT scan the fleet for any non-synced state in one
 * glance, and clicking a row focuses the per-site editor below.
 */
export function FleetSecretsRollup({ sites, selectedSite, onSelectSite }: Props) {
  const rows = useMemo(
    () =>
      sites.map((name) => ({ name, counts: countsFor(name) })),
    [sites],
  );

  const totals = useMemo(() => {
    const t = {
      sites: rows.length,
      siteProblem: 0,
      totalEntries: 0,
      synced: 0,
      drift: 0,
      error: 0,
      missing: 0,
      syncing: 0,
    };
    for (const { counts } of rows) {
      t.totalEntries += counts.total;
      t.synced += counts.synced;
      t.drift += counts.drift;
      t.error += counts.error;
      t.missing += counts["missing-in-kv"];
      t.syncing += counts.syncing;
      if (PROBLEM_STATES.some((s) => counts[s] > 0)) t.siteProblem += 1;
    }
    return t;
  }, [rows]);

  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex items-baseline justify-between border-b border-border-subtle px-3 py-2">
        <div>
          <h2 className="text-[13px] font-semibold text-fg">Fleet secret sync</h2>
          <p className="text-[11px] text-fg-subtle">
            One row per site. Click a row to focus the editor below.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-fg-muted">
          <Stat label="Sites" value={totals.sites} />
          <Stat label="Entries" value={totals.totalEntries} />
          {totals.siteProblem > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-warning/30 bg-warning-subtle px-1.5 py-0.5 text-[11px] font-semibold text-warning-fg">
              <ShieldAlert className="h-3 w-3" />
              {totals.siteProblem} sites need attention
            </span>
          ) : (
            <span className="rounded-sm border border-success/30 bg-success-subtle px-1.5 py-0.5 text-[11px] font-semibold text-success-fg">
              All sites in sync
            </span>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-subtle">
              <Th>Site</Th>
              <Th align="right">Entries</Th>
              <Th align="right">Synced</Th>
              <Th align="right">Syncing</Th>
              <Th align="right">Drift</Th>
              <Th align="right">Missing in KV</Th>
              <Th align="right">Error</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ name, counts }) => {
              const isSelected = name === selectedSite;
              const hasProblem = PROBLEM_STATES.some((s) => counts[s] > 0);
              return (
                <tr
                  key={name}
                  onClick={() => onSelectSite(name)}
                  className={cn(
                    "cursor-pointer border-b border-border-subtle last:border-0 hover:bg-bg-subtle",
                    isSelected && "bg-accent-subtle/40",
                  )}
                >
                  <Td>
                    <code className="font-mono text-fg">{name}</code>
                  </Td>
                  <Td align="right" muted>{counts.total}</Td>
                  <CountCell value={counts.synced} tone="success" />
                  <CountCell value={counts.syncing} tone="accent" />
                  <CountCell value={counts.drift} tone="warning" />
                  <CountCell value={counts["missing-in-kv"]} tone="danger" />
                  <CountCell value={counts.error} tone="danger" />
                  <Td align="right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px]",
                        hasProblem ? "text-warning-fg" : "text-fg-subtle",
                      )}
                    >
                      {isSelected ? "Editing" : "Open"}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[12px] text-fg-subtle">
                  No sites yet. Add a site to start managing its secrets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="font-semibold text-fg">{value}</span>{" "}
      <span className="text-fg-subtle">{label}</span>
    </span>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={cn(
        "px-3 py-1.5 font-semibold",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align,
  muted,
}: {
  children: React.ReactNode;
  align?: "right";
  muted?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-middle",
        align === "right" && "text-right",
        muted && "text-fg-muted",
      )}
    >
      {children}
    </td>
  );
}

function CountCell({
  value,
  tone,
}: {
  value: number;
  tone: "success" | "accent" | "warning" | "danger";
}) {
  if (value === 0) {
    return (
      <Td align="right">
        <span className="text-fg-subtle">·</span>
      </Td>
    );
  }
  const cls =
    tone === "success"
      ? "text-success-fg"
      : tone === "accent"
        ? "text-accent"
        : tone === "warning"
          ? "text-warning-fg"
          : "text-danger-fg";
  return (
    <Td align="right">
      <span className={cn("font-semibold", cls)}>{value}</span>
    </Td>
  );
}
