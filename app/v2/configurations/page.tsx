"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/v2/ui/PageHeader";
import { ConfigEditor } from "@/components/v2/config/ConfigEditor";
import { useV2Fleet, useV2Site } from "@/lib/useV2Fleet";
import { Select } from "@/components/ui/Select";
import { regionLabel } from "@/lib/v2/format";

function ConfigurationsInner() {
  const params = useSearchParams();
  const fleet = useV2Fleet();
  const initial = params.get("site") ?? "";
  const [siteName, setSiteName] = useState(initial);
  const fs = useV2Site(siteName);

  return (
    <div className="px-6 py-5">
      <PageHeader
        title="Configurations"
        description="Edit a site's configuration overrides. Every change is staged as a pending git change."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="site-pick" className="text-[12px] text-fg-subtle">
              Site
            </label>
            <Select
              id="site-pick"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-64"
            >
              <option value="">Select a site…</option>
              {fleet.map((s) => (
                <option key={s.site.name} value={s.site.name}>
                  {s.site.name} · {regionLabel(s.resolvedLocation)}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="mt-6">
        {fs ? (
          <ConfigEditor key={fs.site.name} fs={fs} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface/50 py-16 text-center">
            <SlidersHorizontal className="h-8 w-8 text-fg-subtle" />
            <p className="mt-3 text-[13px] font-medium text-fg">Pick a site to edit</p>
            <p className="mt-1 max-w-sm text-[12px] text-fg-subtle">
              Choose a site above to view its inherited template and override operational
              settings. Edits are staged as pending git changes, never applied directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function V2ConfigurationsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-5 text-[13px] text-fg-subtle">Loading…</div>}>
      <ConfigurationsInner />
    </Suspense>
  );
}
