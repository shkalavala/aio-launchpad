"use client";

import { ChevronRight, Layers, Globe2, ServerCog } from "lucide-react";
import type { NewSiteInput } from "@/lib/newsite";
import { buildPendingFleetSite, resolveDeployOptions } from "@/lib/newsite";
import { Badge } from "@/components/ui/Badge";
import { COUNTRY_NAMES, FACTORY_DISPLAY, SITE_DISPLAY } from "@/lib/fixtures/sites";

interface Props {
  input: NewSiteInput;
}

const CAP_LABEL: Record<string, string> = {
  includeDataflows: "Dataflows",
  enableSecretSync: "SecretSync",
  enableCertManager: "CertManager",
  enableEdgeSite: "Edge site",
  enableGlobalSite: "Global site",
};

/**
 * Live preview: walks the manifest ancestry the new site will inherit and
 * shows the inherited labels + enabled add-on capabilities. Same logic as
 * the upgrade Blast Radius panel — this is what makes the inheritance model
 * visible at site-add time rather than only at upgrade time.
 */
export function InheritancePreview({ input }: Props) {
  const fs = buildPendingFleetSite(input);
  const opts = resolveDeployOptions(fs.ancestry);
  const enabledCaps = Object.entries(opts).filter(([, v]) => v === true);

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">Manifest preview</h2>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          What this site will inherit
        </span>
      </header>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <Tile icon={<Layers className="h-3.5 w-3.5" />} label="Inheritance chain">
          <div className="flex flex-wrap items-center gap-1 text-[12px]">
            {fs.ancestry.map((t, i) => {
              const role = templateRole(t, i, fs.ancestry.length);
              const isPlant = i === fs.ancestry.length - 1;
              return (
                <span key={t.name} className="flex flex-col items-start gap-0.5">
                  <span className="flex items-center gap-1">
                    <Badge tone={isPlant ? "accent" : "neutral"}>{t.name}</Badge>
                    {i < fs.ancestry.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-fg-subtle" />
                    )}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-fg-subtle">
                    {role}
                  </span>
                </span>
              );
            })}
            {fs.ancestry.length > 0 && (
              <ChevronRight className="h-3 w-3 text-fg-subtle self-start mt-1.5" />
            )}
            <span className="flex flex-col items-start gap-0.5">
              <Badge tone="success">{fs.site.name}</Badge>
              <span className="text-[10px] uppercase tracking-wide text-fg-subtle">
                Instance
              </span>
            </span>
          </div>
          {fs.ancestry.length === 0 && (
            <span className="text-[12px] text-fg-subtle">No parent template found — instance is standalone.</span>
          )}
        </Tile>

        <Tile icon={<Globe2 className="h-3.5 w-3.5" />} label="Inherited labels">
          <div className="flex flex-wrap gap-1 text-[12px]">
            {Object.entries(fs.resolvedLabels).map(([k, v]) => {
              const display =
                k === "country" ? (COUNTRY_NAMES[v] ?? v)
                : k === "factorySite" ? (SITE_DISPLAY[v] ?? v)
                : k === "plant" ? (FACTORY_DISPLAY[v] ?? v)
                : v;
              return (
                <Badge key={k} tone="neutral">
                  {k}={display}
                </Badge>
              );
            })}
          </div>
          <div className="mt-1 text-[11px] text-fg-subtle">
            Region: <code className="font-mono text-fg">{fs.resolvedLocation}</code>
          </div>
        </Tile>

        <Tile icon={<ServerCog className="h-3.5 w-3.5" />} label="Capabilities">
          <div className="flex flex-col gap-1 text-[12px]">
            <span className="flex flex-wrap items-baseline gap-1">
              <Badge tone="accent">Core</Badge>
              {enabledCaps.map(([k]) => (
                <Badge key={k} tone="neutral">
                  {CAP_LABEL[k] ?? k}
                </Badge>
              ))}
            </span>
            <span className="text-[11px] text-fg-subtle">
              Core = AIO instance, broker, default dataflow, connector templates
            </span>
          </div>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-muted">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * Label each ancestry segment by its role in the manifest hierarchy. The
 * fixtures use a 3-tier convention: enterprise root → geo (factorySite) →
 * plant. Shorter chains (e.g. standalone or just enterprise+geo) fall back
 * to a generic "Template" label.
 */
function templateRole(t: { labels?: Record<string, string> }, index: number, total: number): string {
  if (t.labels?.enterprise && !t.labels?.factorySite && !t.labels?.plant) return "Enterprise";
  if (t.labels?.plant) return "Plant";
  if (t.labels?.factorySite) return "Geo";
  if (index === 0 && total > 1) return "Enterprise";
  return "Template";
}
