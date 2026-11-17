"use client";

import { useEffect, useState } from "react";

/**
 * The layout (and its server-rendered badge) doesn't re-render on client navigation, so the badge
 * refreshes itself: on every page change, when the tab regains focus, and every 30 seconds.
 */
export function useLivePendingCount(initial: number, pathname: string) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/admin/pending-count", { cache: "no-store" });
        if (res.ok && !cancelled) setCount((await res.json()).count);
      } catch {
        // Offline or signed out: keep the last known count.
      }
    };
    refresh();
    const timer = setInterval(refresh, 30_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return count;
}
