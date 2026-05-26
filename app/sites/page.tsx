"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy /sites top-nav entry was removed; the catalog now lives at /fleet,
// and the Add-a-site form is reachable from there. Old deep links land in
// /fleet instead of dead-ending.
export default function SitesIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/fleet");
  }, [router]);
  return null;
}
