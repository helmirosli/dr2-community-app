"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const [grow, setGrow] = useState(false);
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
    later(() => to("idle"), 450);
  };

  // Start on a click that leaves this page, or on a GET form being sent.
  useEffect(() => {
    const start = () => {
      if (phaseRef.current === "run") return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setGrow(false);
        to("run");
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
      if (!e.defaultPrevented && (form.getAttribute("method") || "get").toLowerCase() === "get" && !form.getAttribute("action")?.startsWith("http")) start();
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
    <div role="progressbar" aria-label="Loading" aria-busy={!done} className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1.5">
      <div
        className="h-full bg-[image:var(--blend)] shadow-[0_0_14px_rgba(34,199,242,.9)]"
        style={{
          width: done ? "100%" : grow ? "85%" : "0%",
          opacity: done ? 0 : 1,
          transition: done ? "width .2s ease-out, opacity .25s ease-out .15s" : grow ? "width 12s cubic-bezier(.1,.6,.2,1)" : "none",
        }}
      />
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
