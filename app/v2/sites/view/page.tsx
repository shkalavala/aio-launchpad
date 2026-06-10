"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useV2Site } from "@/lib/useV2Fleet";
import { SiteDetail } from "@/components/v2/sites/SiteDetail";

/**
 * Site detail as a static, query-param route: /v2/sites/view/?site=<name>.
 *
 * This deliberately avoids a dynamic `[name]` segment so the page works under
 * `output: export` for sites that only exist at runtime (a connected
 * bring-your-own repo), not just the build-time mock fleet.
 */
function SiteDetailView() {
  const params = useSearchParams();
  const name = params.get("site") ?? "";
  const fs = useV2Site(name);

  if (!name || !fs) {
    return (
      <div className="px-6 py-10 text-[13px] text-fg-subtle">
        {name ? (
          <>
            Site <span className="font-mono text-fg">{name}</span> not found in the current fleet.{" "}
          </>
        ) : (
          <>No site selected. </>
        )}
        <Link href="/v2/sites" className="text-accent hover:underline">
          Back to Sites
        </Link>
      </div>
    );
  }

  return <SiteDetail fs={fs} />;
}

export default function V2SiteDetailPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-[13px] text-fg-subtle">Loading site…</div>}>
      <SiteDetailView />
    </Suspense>
  );
}
