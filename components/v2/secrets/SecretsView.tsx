"use client";

import { useMemo } from "react";
import { KeyRound, ShieldCheck, AlertTriangle, RefreshCw, Vault } from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { useV2Fleet } from "@/lib/useV2Fleet";
import { useV2Store } from "@/store/useV2Store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SecretSyncStatus } from "@/lib/types";
import { fleetSecretRollup, rotatableCerts, buildCertRotation } from "@/lib/v2/secrets";
import type { Tone } from "@/lib/v2/format";

const STATUS_TONE: Record<SecretSyncStatus, Tone> = {
  synced: "success",
  syncing: "accent",
  drift: "warning",
  "missing-in-kv": "warning",
  error: "danger",
  never: "neutral",
};

const STATUS_LABEL: Record<SecretSyncStatus, string> = {
  synced: "Synced",
  syncing: "Syncing",
  drift: "Drift",
  "missing-in-kv": "Missing in KV",
  error: "Error",
  never: "Never synced",
};

export function SecretsView() {
  const fleet = useV2Fleet();
  const queueDeployment = useV2Store((s) => s.queueDeployment);
  const rollup = useMemo(() => fleetSecretRollup(fleet), [fleet]);
  const certs = useMemo(() => rotatableCerts(fleet), [fleet]);

  function rotate(secretName: string) {
    const target = certs.find((c) => c.secretName === secretName);
    if (!target) return;
    const commitSha = useV2Store.getState().repo.lastCommit.sha;
    queueDeployment(buildCertRotation(target, commitSha));
  }

  return (
    <div className="px-6 py-5">
      <PageHeader
        title="Secrets"
        description="Sync status across the fleet. Values live only in the central Key Vault — never in git, never here."
      />

      {/* Central Key Vaults */}
      <section className="mt-6">
        <SectionTitle icon={Vault}>Central Key Vaults</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rollup.vaults.map((kv) => (
            <div key={kv.name} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] text-fg">{kv.name}</span>
                <Badge tone={kv.connected ? "success" : "danger"}>
                  {kv.connected ? "connected" : "disconnected"}
                </Badge>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-fg-subtle">
                {kv.env} environment · source of truth
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet rollup */}
      <section className="mt-6">
        <SectionTitle icon={ShieldCheck}>Fleet sync status</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <StatCard label="Total" value={rollup.total} tone="neutral" />
          {(Object.keys(rollup.byStatus) as SecretSyncStatus[])
            .filter((s) => rollup.byStatus[s] > 0)
            .map((s) => (
              <StatCard key={s} label={STATUS_LABEL[s]} value={rollup.byStatus[s]} tone={STATUS_TONE[s]} />
            ))}
        </div>
      </section>

      {/* Needs attention */}
      {rollup.attention.length > 0 && (
        <section className="mt-6">
          <SectionTitle icon={AlertTriangle}>Needs attention</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 font-medium">Secret</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rollup.attention.map(({ siteName, secret }) => {
                  const status = secret.syncStatus ?? "synced";
                  return (
                    <tr key={`${siteName}-${secret.secretName}`} className="hover:bg-bg-subtle/60">
                      <td className="px-3 py-2 font-mono text-[11px] text-fg">{siteName}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">{secret.secretName}</td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-fg-subtle">
                        {secret.syncError ?? (status === "missing-in-kv" ? "Declared but absent from the Key Vault" : "KV has a newer version than the cluster")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Certificate rotation */}
      <section className="mt-6">
        <SectionTitle icon={RefreshCw}>Certificate rotation</SectionTitle>
        <p className="mb-2 text-[12px] text-fg-muted">
          Rotating a certificate lands a new version in the central Key Vault and rolls it across every
          site that declares it — as a single fleet patch, gated and tracked like any deployment.
        </p>
        {certs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-[12px] text-fg-subtle">
            No rotatable certificates declared across the fleet.
          </div>
        ) : (
          <div className="space-y-2">
            {certs.map((c) => (
              <div
                key={c.secretName}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-accent" />
                    <span className="font-mono text-[12px] text-fg">{c.secretName}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-subtle">
                    on {c.sites.length} site{c.sites.length === 1 ? "" : "s"}: {c.sites.join(", ")}
                  </div>
                </div>
                <Button size="sm" variant="default" onClick={() => rotate(c.secretName)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rotate across fleet
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-fg-subtle">
          Queues a fleet patch on the Deployments screen. Watch it run there.
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof KeyRound; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
      <Icon className="h-4 w-4 text-accent" />
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const ring: Record<Tone, string> = {
    neutral: "border-border",
    accent: "border-accent/40",
    success: "border-success/40",
    warning: "border-warning/40",
    danger: "border-danger/40",
  };
  return (
    <div className={cn("rounded-lg border bg-surface px-3 py-2", ring[tone])}>
      <div className="text-[18px] font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-[11px] text-fg-subtle">{label}</div>
    </div>
  );
}
