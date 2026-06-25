"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LoadingOverlay() {
  const pathname = usePathname();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-sm animate-[fadeOut_220ms_ease-out_forwards]"
      key={pathname}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 text-white">
        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}
