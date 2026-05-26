"use client";

import { useState } from "react";
import { Code2, Copy, ChevronDown, ChevronRight } from "lucide-react";
import type { SecretEntry } from "@/lib/types";
import { renderSyncSecretsYaml } from "@/lib/secrets";

interface Props {
  siteName: string;
  entries: SecretEntry[];
}

/**
 * Collapsible "Show YAML" reveal — collapses by default so the table stays
 * the primary surface. Mirrors the shape of input-sync-secrets.yaml.
 */
export function SecretsYamlBlock({ siteName, entries }: Props) {
  const [open, setOpen] = useState(false);
  const yaml = renderSyncSecretsYaml(siteName, entries);

  return (
    <section className="rounded border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" />
        )}
        <Code2 className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold text-fg">Show YAML</span>
        <span className="text-[11px] text-fg-subtle">
          input-sync-secrets.yaml for <code className="font-mono">{siteName}</code>
        </span>
        {open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(yaml).catch(() => {});
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-[11px] text-fg-muted hover:bg-bg-subtle"
            title="Copy YAML to clipboard"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
        )}
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-border-subtle bg-bg px-3 py-3 font-mono text-[12px] leading-relaxed text-fg">
          {yaml}
        </pre>
      )}
    </section>
  );
}
