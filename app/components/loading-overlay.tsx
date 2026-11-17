"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { useDictionary } from "@/lib/i18n/context";

type Phase = "idle" | "run" | "finish";

/**
 * A progress bar across the top that starts the moment a link is clicked or a GET form (filters, search) is sent,
 * so there is feedback while the server is still reading the database, and completes when the new page arrives.
 * Opening a route also shows its loading.tsx skeleton until the data is in.
 */
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = useRef("");
  const [phase, setPhase] = useState<Phase>("idle");
  const { t } = useDictionary();
  const [grow, setGrow] = useState(false);
  const [pill, setPill] = useState(false);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const to = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const finish = () => {
    if (phaseRef.current !== "run") return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    to("finish");
    setPill(false);
    later(() => to("idle"), 450);
  };

  // Start on a click that leaves this page, or on a GET form being sent.
  useEffect(() => {
    const start = () => {
      if (phaseRef.current === "run") return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setGrow(false);
      setPill(false);
      to("run");
      later(() => setPill(true), 150); // only for loads that take a moment
      requestAnimationFrame(() => requestAnimationFrame(() => setGrow(true)));
      later(finish, 20000); // never leave it hanging if nothing navigates
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === here.current) return; // same page, or just a #hash
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!e.defaultPrevented && (form.method || "get").toLowerCase() === "get" && !form.getAttribute("action")?.startsWith("http")) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only use refs
  }, []);

  // The new page (or new filters) arrived.
  useEffect(() => {
    here.current = pathname + (search ? `?${search}` : "");
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish only uses refs
  }, [pathname, search]);

  if (phase === "idle") return null;
  const done = phase === "finish";
  return (
    <div role="progressbar" aria-label="Loading" aria-busy={!done} className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1">
      <div
        className="h-full bg-[image:var(--blend)] shadow-[0_0_10px_rgba(34,199,242,.7)]"
        style={{
          width: done ? "100%" : grow ? "85%" : "0%",
          opacity: done ? 0 : 1,
          transition: done ? "width .2s ease-out, opacity .25s ease-out .15s" : grow ? "width 12s cubic-bezier(.1,.6,.2,1)" : "none",
        }}
      />
      {pill && !done && (
        <div className="absolute inset-x-0 top-3 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-[var(--night)]/95 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,.5)] ring-1 ring-white/15">
            <Loader2 size={16} className="animate-spin text-[var(--lime)] motion-reduce:animate-none" aria-hidden="true" />
            {t.common.loading}
          </div>
        </div>
      )}
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
