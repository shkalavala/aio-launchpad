"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { AioReleaseId, FleetSite } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { RELEASES_BY_ID } from "@/lib/fixtures/releases";
import { cn } from "@/lib/utils";

/**
 * The release-pin block that gets diffed. These fields are real (mirrored from
 * context/scale-kit-real-yaml/aio-release-*.yaml) and bundled-per-release per
 * findings.md §I — we never expose component-level pins as user-editable.
 */
const PIN_FIELDS = [
  "aioVersion",
  "aioApiVersion",
  "adrApiVersion",
  "certManagerVersion",
  "secretStoreVersion",
] as const;

type PinField = (typeof PIN_FIELDS)[number];

interface Props {
  selectedSites: FleetSite[];
  /** Source release per site, taking versionOverrides into account. */
  sourceReleaseBySite: Record<string, AioReleaseId>;
  targetReleaseId: AioReleaseId;
}

export function YamlDiff({ selectedSites, sourceReleaseBySite, targetReleaseId }: Props) {
  const target = RELEASES_BY_ID[targetReleaseId];

  // Find the dominant source release (highest count) — that's the "current" baseline
  // for the diff header. If sites are mixed, we surface that fact below.
  const { dominantSourceId, mixed } = useMemo(() => {
    const counts = new Map<AioReleaseId, number>();
    for (const fs of selectedSites) {
      const id = sourceReleaseBySite[fs.site.name] ?? fs.runtime.resolvedRelease;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    let topId: AioReleaseId = selectedSites[0]?.runtime.resolvedRelease ?? targetReleaseId;
    let topCount = 0;
    for (const [id, n] of counts) {
      if (n > topCount) {
        topCount = n;
        topId = id;
      }
    }
    return { dominantSourceId: topId, mixed: counts.size > 1 };
  }, [selectedSites, sourceReleaseBySite, targetReleaseId]);

  const source = RELEASES_BY_ID[dominantSourceId];

  return (
    <div className="rounded border border-border bg-bg font-mono text-[12px]">
      <div className="flex items-center justify-between border-b border-border bg-bg-subtle px-3 py-1.5 text-[11px] uppercase tracking-wide text-fg-muted">
        <span>
          manifests/aio-release-pin.yaml
          {mixed && (
            <span className="ml-2 normal-case tracking-normal text-warning-fg">
              (selected sites span multiple releases — showing dominant {dominantSourceId})
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          <Badge tone="neutral" className="font-mono">{source.id}</Badge>
          <ArrowRight className="h-3 w-3 text-fg-subtle" />
          <Badge tone="accent" className="font-mono">{target.id}</Badge>
        </span>
      </div>
      <div className="px-3 py-2">
        {PIN_FIELDS.map((f) => (
          <DiffRow key={f} field={f} from={source[f]} to={target[f]} />
        ))}
        <DiffRow field="aioTrain" from={source.aioTrain} to={target.aioTrain} />
      </div>
    </div>
  );
}

function DiffRow({ field, from, to }: { field: PinField | "aioTrain"; from: string; to: string }) {
  const changed = from !== to;
  if (!changed) {
    return (
      <div className="grid grid-cols-[1.25rem,12rem,1fr] items-baseline gap-2 text-fg-muted">
        <span className="text-fg-subtle"> </span>
        <span>{field}:</span>
        <span>{from}</span>
      </div>
    );
  }
  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[1.25rem,12rem,1fr] items-baseline gap-2",
          "bg-danger-subtle/60 text-danger-fg",
        )}
      >
        <span className="text-center">-</span>
        <span>{field}:</span>
        <span>{from}</span>
      </div>
      <div
        className={cn(
          "grid grid-cols-[1.25rem,12rem,1fr] items-baseline gap-2",
          "bg-success-subtle/60 text-success-fg",
        )}
      >
        <span className="text-center">+</span>
        <span>{field}:</span>
        <span>{to}</span>
      </div>
    </>
  );
}
