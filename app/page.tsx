"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PERSIST_KEY } from "@/store/useAppStore";

const VISITED_KEY = "aio-launchpad:visited";

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    // Demo-safety escape hatch: `/?fresh=1` clears the visited flag so the
    // operator can rehearse the first-time landing without opening an incognito
    // window. See walkthrough-2026-05-26.md §8.3.1.
    const fresh =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("fresh") === "1";

    let visited = false;
    try {
      if (fresh) {
        window.localStorage.removeItem(VISITED_KEY);
        // Also wipe the persisted Zustand store so version overrides,
        // pending sites, secret overlays, and session rollouts reset to
        // fixture defaults.
        window.localStorage.removeItem(PERSIST_KEY);
      } else {
        visited = window.localStorage.getItem(VISITED_KEY) === "1";
      }
      window.localStorage.setItem(VISITED_KEY, "1");
    } catch {
      // localStorage unavailable (SSR, privacy mode) — fall through to first-visit landing.
    }
    router.replace(visited && !fresh ? "/fleet" : "/before");
  }, [router]);
  return null;
}
