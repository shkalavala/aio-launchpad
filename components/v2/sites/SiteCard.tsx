"use client";

import Link from "next/link";
import { Server, Boxes, GitCompareArrows } from "lucide-react";
import type { FleetSite } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useV2Store } from "@/store/useV2Store";
import { envTone, clusterInfo, siteHasDrift } from "@/lib/v2/format";
import { HealthDot } from "@/components/v2/ui/HealthDot";

/**
 * A single site card: status, cluster info, and environment. Drift is shown as
 * a badge when the site diverges from git. Links to the site detail view.
 * Cluster/Arc infrastructure detail only appears in Advanced mode.
 */
export function SiteCard({ fs }: { fs: FleetSite }) {
  const advanced = useV2Store((s) => s.mode === "advanced");
  const env = fs.runtime.environment;
  const cluster = clusterInfo(fs);
  const drift = siteHasDrift(fs);

  return (
    <Link
      href={`/v2/sites/view/?site=${encodeURIComponent(fs.site.name)}`}
      className="group flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-accent/50 hover:shadow-depth8"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-fg group-hover:text-accent">
          {fs.site.name}
        </span>
        <Badge tone={envTone(env)} className="shrink-0">
          {env}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 text-[12px]">
        <HealthDot fs={fs} withLabel />
      </div>

      <div className="space-y-1 border-t border-border pt-2 text-[12px] text-fg-muted">
        {advanced && (
          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-fg-subtle" />
            <span>
              {cluster.distro}
              {cluster.version && <span className="ml-1 font-mono text-fg-subtle">{cluster.version}</span>}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-fg-subtle" />
          <span>
            AIO <span className="font-mono text-fg">{fs.runtime.resolvedRelease}</span>
          </span>
        </div>
      </div>

      {drift && (
        <Badge tone="danger" className="self-start">
          <GitCompareArrows className="h-3 w-3" />
          Drift
        </Badge>
      )}
    </Link>
  );
}
