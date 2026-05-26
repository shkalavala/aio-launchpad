"use client";

import { KeyRound, Link2 } from "lucide-react";
import { CENTRAL_KV } from "@/lib/fixtures/secrets";

/**
 * Central Key Vault status panel. The KV resource itself is configured once
 * by Central IT and shared across the fleet — sites just sync secrets from
 * it. The panel communicates "the wiring is healthy" without offering an
 * edit button (wrong persona / wrong surface for that).
 */
export function CentralKVPanel() {
  return (
    <section className="rounded border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-fg">Central Key Vault</h2>
          <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success-subtle px-1.5 py-[1px] text-[11px] text-success-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-success-fg" aria-hidden />
            {CENTRAL_KV.connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          Source of truth for secret values
        </span>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] md:grid-cols-2">
        <div className="flex items-baseline gap-2">
          <span className="w-24 shrink-0 text-fg-subtle">Vault</span>
          <code className="font-mono text-fg">{CENTRAL_KV.name}</code>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="w-24 shrink-0 text-fg-subtle">Resource ID</span>
          <code className="truncate font-mono text-fg-muted" title={CENTRAL_KV.resourceId}>
            {CENTRAL_KV.resourceId}
          </code>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-subtle">
        <Link2 className="h-3 w-3" />
        Per-site secret entries below pull values from this vault via the Secret Store CSI driver.
        Values are never stored in git.
      </p>
    </section>
  );
}
