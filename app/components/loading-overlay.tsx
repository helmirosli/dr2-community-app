"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LoadingOverlay() {
  const pathname = usePathname();
  const isShowing = useRef(false);

  useEffect(() => {
    if (isShowing.current) return;
    isShowing.current = true;
    const timer = setTimeout(() => {
      isShowing.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isShowing.current) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-white">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}
