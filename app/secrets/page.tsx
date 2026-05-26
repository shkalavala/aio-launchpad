"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CommandBar } from "@/components/shell/CommandBar";
import { useFleet } from "@/lib/useFleet";
import { SECRETS_BY_SITE } from "@/lib/fixtures/secrets";
import { useAppStore } from "@/store/useAppStore";
import type { SecretEntry } from "@/lib/types";
import { CentralKVPanel } from "@/components/secrets/CentralKVPanel";
import { FleetSecretsRollup } from "@/components/secrets/FleetSecretsRollup";
import { SecretsTable } from "@/components/secrets/SecretsTable";
import { SecretsYamlBlock } from "@/components/secrets/SecretsYamlBlock";
import { EmptyFleetCard } from "@/components/shell/EmptyFleetCard";

/**
 * Screen 4 — Secrets management.
 *
 * Per the recommendation order (3 → 2 → 4 → 0 → 5/7 → 6 stretch) this surface
 * is intentionally simpler than the upgrade screen. The point it has to make
 * is the *separation of concerns*: a central Key Vault (owned by Central IT)
 * is the source of truth for values; each site declares which secrets it
 * needs as metadata that the Scale Kit `sync-secrets` step reconciles.
 *
 * Day-1 KV provisioning, identity wiring, and access policy are explicitly
 * out of scope here — those belong to Central IT and the Scale Kit `secretsync`
 * step. See context/research/persona-map.md §3.2.
 */
export default function SecretsPage() {
  const fleet = useFleet();
  const allSites = useMemo(() => fleet.map((f) => f.site.name).sort(), [fleet]);
  const [siteName, setSiteName] = useState<string>(allSites[0] ?? "");
  const overlay = useAppStore((s) => s.secretsOverlay);
  const setSiteSecrets = useAppStore((s) => s.setSiteSecrets);
  const resetSiteSecrets = useAppStore((s) => s.resetSiteSecrets);

  const fixtureEntries: SecretEntry[] = SECRETS_BY_SITE[siteName] ?? [];
  const entries: SecretEntry[] = overlay[siteName] ?? fixtureEntries;
  const hasOverlay = siteName in overlay;
  const fixtureNames = useMemo(() => new Set(fixtureEntries.map((e) => e.secretName)), [fixtureEntries]);

  const pendingCount = entries.filter((e) => !fixtureNames.has(e.secretName)).length;
  const removedCount = fixtureEntries.filter((f) => !entries.some((e) => e.secretName === f.secretName)).length;

  const update = (next: SecretEntry[]) => setSiteSecrets(siteName, next);

  const onSyncNow = () => {
    // Mock: the act of "syncing" is what the manifest pipeline would do.
    // For the prototype we just clear the pending status by collapsing the
    // overlay into the new baseline — visually the rows flip to Synced.
    setSiteSecrets(siteName, [...entries]);
  };

  const onReset = () => resetSiteSecrets(siteName);

  if (fleet.length === 0) {
    return (
      <section className="flex h-full min-w-0 flex-col">
        <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
          <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
            <Link href="/fleet" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-fg">Secrets</span>
          </nav>
          <h1 className="text-[20px] font-semibold leading-tight text-fg">Secrets</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-bg">
          <EmptyFleetCard
            title="No sites to manage secrets for"
            body="This surface declares which secrets each site reconciles from the central Key Vault. Add at least one site and the per-site secret list shows up here."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
        <nav className="mb-2 flex items-center gap-1 text-[12px] text-fg-muted">
          <Link href="/fleet" className="hover:text-accent">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-fg">Secrets</span>
        </nav>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight text-fg">Secrets</h1>
            <p className="text-[12px] text-fg-muted">
              Declare which secrets each site needs. Values stay in the central Key Vault;
              this surface only manages metadata and the sync wiring.
            </p>
          </div>
        </div>
      </div>

      <CommandBar>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted">
          Site
          <select
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="h-7 rounded-sm border border-border bg-bg px-2 font-mono text-[12px]"
          >
            {allSites.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          variant="primary"
          size="sm"
          onClick={onSyncNow}
          disabled={!hasOverlay || pendingCount + removedCount === 0}
          title={hasOverlay ? "Apply pending changes (mock)" : "No pending changes"}
        >
          <Save className="h-3.5 w-3.5" />
          Sync now
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={!hasOverlay}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <div className="ml-auto flex items-center gap-3 text-[12px] text-fg-muted">
          <span>
            <span className="font-semibold text-fg">{entries.length}</span> entries
          </span>
          {pendingCount > 0 && (
            <span className="text-warning-fg">
              <span className="font-semibold">{pendingCount}</span> pending add
            </span>
          )}
          {removedCount > 0 && (
            <span className="text-danger-fg">
              <span className="font-semibold">{removedCount}</span> pending remove
            </span>
          )}
        </div>
      </CommandBar>

      <div className="min-h-0 flex-1 overflow-auto bg-bg px-4 py-4">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
          <CentralKVPanel />
          <FleetSecretsRollup
            sites={allSites}
            selectedSite={siteName}
            onSelectSite={setSiteName}
          />
          <SecretsTable
            siteName={siteName}
            entries={entries}
            fixtureNames={fixtureNames}
            hasOverlay={hasOverlay}
            onChange={update}
          />
          <SecretsYamlBlock siteName={siteName} entries={entries} />
        </div>
      </div>
    </section>
  );
}
