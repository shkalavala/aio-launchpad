"use client";

import { useMemo } from "react";
import type { NewSiteInput } from "@/lib/newsite";
import { renderNewSiteYaml } from "@/lib/newsite";

interface Props {
  input: NewSiteInput;
}

/**
 * New-site YAML render with a +/- gutter. Treats every line as an addition
 * since the site doesn't exist yet — sibling pattern to the YamlDiff used on
 * Screen 3, kept additive-only so the demo audience can read the manifest
 * pipeline output at a glance.
 */
export function NewSiteYamlBlock({ input }: Props) {
  const lines = useMemo(() => renderNewSiteYaml(input).split("\n"), [input]);

  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">Site manifest</h2>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          What the Scale Kit pipeline will apply
        </span>
      </header>
      <div className="overflow-hidden rounded border border-border bg-surface">
        <div className="flex items-baseline justify-between border-b border-border bg-bg-subtle px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-fg-muted">
          <span>sites/{input.factorySite}/{lines[2]?.split(": ")[1]}.yaml</span>
          <span className="text-success">added</span>
        </div>
        <pre className="m-0 overflow-x-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1.25rem,1fr]">
              <span className="text-success">{line === "" ? " " : "+"}</span>
              <span className="text-success">{line || " "}</span>
            </div>
          ))}
        </pre>
      </div>
    </section>
  );
}
