"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/shell/TopNav";
import { FleetRepoBanner } from "@/components/shell/FleetRepoBanner";

/**
 * Renders the classic shell chrome (top nav + repo banner) everywhere except
 * the /v2 surface, which provides its own V2Shell header.
 */
export function ClassicChrome() {
  const pathname = usePathname();
  if (pathname?.startsWith("/v2")) return null;
  return (
    <>
      <TopNav />
      <FleetRepoBanner />
    </>
  );
}
