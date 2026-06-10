"use client";

import Link from "next/link";
import { useV2Site } from "@/lib/useV2Fleet";
import { SiteDetail } from "@/components/v2/sites/SiteDetail";

export function SiteDetailClient({ name }: { name: string }) {
  const decoded = decodeURIComponent(name);
  const fs = useV2Site(decoded);

  if (!fs) {
    return (
      <div className="px-6 py-10 text-[13px] text-fg-subtle">
        Site <span className="font-mono text-fg">{decoded}</span> not found.{" "}
        <Link href="/v2/sites" className="text-accent hover:underline">
          Back to Sites
        </Link>
      </div>
    );
  }

  return <SiteDetail fs={fs} />;
}
