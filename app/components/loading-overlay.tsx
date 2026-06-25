"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const previousPathRef = useRef<string | null>(null);
  const overlayDurationMs = 320;

  useEffect(() => {
    if (previousPathRef.current === null) {
      previousPathRef.current = pathname;
      return;
    }

    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), overlayDurationMs);
    return () => clearTimeout(timer);
  }, [pathname, overlayDurationMs]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-progress bg-slate-950/5 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="fixed inset-x-0 top-4 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/92 px-4 py-2 text-slate-700 shadow-lg backdrop-blur-sm">
          <Loader2 className="size-4 animate-[spin_1.1s_linear_infinite] text-brand-600" aria-hidden="true" />
          <p className="text-sm font-medium">Loading next page…</p>
        </div>
      </div>
    </div>
  );
}
