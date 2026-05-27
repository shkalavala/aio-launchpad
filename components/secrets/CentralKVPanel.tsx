"use client";

import { KeyRound, Link2, ShieldCheck } from "lucide-react";
import { CENTRAL_KVS, type CentralKeyVault } from "@/lib/fixtures/secrets";

/**
 * Central Key Vault status panel. There is one Key Vault per environment
 * (dev, prod) so a leaked dev-side identity cannot read prod secret values.
 * Sites pick their KV by environment label — the panel just communicates the
 * wiring; provisioning still lives in Central IT / the Scale Kit `secretsync`
 * step.
 */
export function CentralKVPanel() {
  return (
    <section className="rounded border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-fg">Central Key Vaults</h2>
          <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success-subtle px-1.5 py-[1px] text-[11px] text-success-fg">
            <ShieldCheck className="h-3 w-3" />
            Isolated by environment
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          Source of truth for secret values
        </span>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {CENTRAL_KVS.map((kv) => (
          <KvCard key={kv.env} kv={kv} />
        ))}
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-subtle">
        <Link2 className="h-3 w-3" />
        Each site reconciles from the vault that matches its environment (dev
        sites → dev vault, prod sites → prod vault) via the Secret Store CSI
        driver. Values are never stored in git.
      </p>
    </section>
  );
}

function KvCard({ kv }: { kv: CentralKeyVault }) {
  const tone =
    kv.env === "prod"
      ? "border-accent/40 bg-accent-subtle/40"
      : "border-border bg-bg-subtle";
  return (
    <div className={`rounded border px-2.5 py-2 ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-sm px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide ${
              kv.env === "prod"
                ? "bg-accent text-accent-fg"
                : "bg-bg-muted text-fg"
            }`}
          >
            {kv.env}
          </span>
          <code className="font-mono text-[12px] font-semibold text-fg">{kv.name}</code>
        </div>
        <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success-subtle px-1.5 py-[1px] text-[10px] text-success-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-success-fg" aria-hidden />
          {kv.connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div
        className="mt-1 truncate font-mono text-[10px] text-fg-subtle"
        title={kv.resourceId}
      >
        {kv.resourceId}
      </div>
    </div>
  );
}
