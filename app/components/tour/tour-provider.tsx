"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DriveStep } from "driver.js";

import { completeTour, resetTours } from "@/lib/actions/tours";
import { useDictionary } from "@/lib/i18n/context";
import { hasSeen, tourById, tourForPath, toursFor, type Audience, type StaffRole, type TourDef, type TourId } from "@/lib/tours/defs";
import { serializeCookie, TOUR_COOKIE, type TourSeen } from "@/lib/tours/state";

type TourContextValue = {
  audience: Audience;
  tours: TourDef[];
  seen: TourSeen;
  /** The tour that belongs to the page being shown, if there is one. */
  here: TourDef | null;
  /** Plays a tour now, or opens its page first when it lives somewhere else. */
  start: (id: TourId) => void;
  /** Forgets every tour that was seen, so the tips show again. */
  reset: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTours() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTours must be used within TourProvider");
  return ctx;
}

/** The first visible element marked data-tour="…": the sidebar and the phone tab bar both exist, only one of them is showing. */
function findAnchor(anchor: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`)) {
    const box = el.getBoundingClientRect();
    if (box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

/**
 * Runs the walkthrough tours. A tour starts by itself the first time its page is opened (when it is marked auto),
 * is remembered once finished or skipped, and can be played again from the Help menu.
 * Staff progress is kept on their account; residents have no account, so theirs is a cookie.
 */
export function TourProvider({
  audience,
  role,
  initialSeen,
  children,
}: {
  audience: Audience;
  role?: StaffRole;
  initialSeen: TourSeen;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useDictionary();

  const tours = useMemo(() => toursFor(audience), [audience]);
  const here = useMemo(() => tourForPath(audience, pathname) ?? null, [audience, pathname]);
  const [seen, setSeen] = useState<TourSeen>(initialSeen);
  const seenRef = useRef(seen);
  const activeRef = useRef<{ destroy: () => void } | null>(null);
  const askedRef = useRef<{ path: string; id: string } | null>(null);

  const remember = useCallback(
    (tour: TourDef) => {
      const next = { ...seenRef.current, [tour.id]: tour.version };
      seenRef.current = next;
      setSeen(next);
      if (audience === "staff") completeTour(tour.id).catch(() => {});
      else document.cookie = `${TOUR_COOKIE}=${encodeURIComponent(serializeCookie(next))}; path=/; max-age=31536000; samesite=lax`;
    },
    [audience],
  );

  const reset = useCallback(() => {
    seenRef.current = {};
    setSeen({});
    if (audience === "staff") resetTours().catch(() => {});
    else document.cookie = `${TOUR_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [audience]);

  const run = useCallback(
    async (tour: TourDef, auto: boolean) => {
      if (activeRef.current) return;
      if (auto && (document.visibilityState !== "visible" || document.querySelector('[aria-modal="true"], .driver-popover'))) return;

      const steps = tour.steps
        .filter((step) => !step.roles || (role !== undefined && step.roles.includes(role)))
        .map((step) => ({ step, el: step.anchor ? findAnchor(step.anchor) : null }))
        .filter(({ step, el }) => step.anchor === null || el);

      // By itself a tour only starts when there is enough on the page to point at; asked for, it always answers.
      const note = !auto && steps.length === 0;
      if (auto && steps.length < tour.minSteps) return;

      const startedOn = window.location.pathname;
      const opener = document.activeElement as HTMLElement | null;
      const { driver } = await import("driver.js");
      if (activeRef.current || window.location.pathname !== startedOn) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const driveSteps: DriveStep[] = note
        ? [{ popover: { title: t.tour.ui.nothingYetTitle, description: t.tour.ui.nothingYetBody } }]
        : steps.map(({ step, el }) => {
            const text = step.text(t);
            return { element: el ?? undefined, popover: { title: text.title, description: text.body } };
          });

      const d = driver({
        steps: driveSteps,
        showProgress: driveSteps.length > 1,
        progressText: t.tour.ui.progress,
        nextBtnText: t.tour.ui.next,
        prevBtnText: t.tour.ui.back,
        doneBtnText: t.tour.ui.done,
        closeBtnLabel: t.tour.ui.skip,
        popoverClass: "jr2-tour",
        overlayColor: "#050a1a",
        overlayOpacity: 0.8,
        stagePadding: 8,
        stageRadius: 22,
        popoverOffset: 14,
        animate: !reduced,
        smoothScroll: !reduced,
        overlayClickBehavior: "none",
        focus: "popover",
        onPopoverRender: (popover) => {
          popover.wrapper.setAttribute("role", "dialog");
          popover.wrapper.setAttribute("aria-live", "polite");
          // A plain "Skip" next to Back / Next: the small × alone is easy to miss on a phone.
          if (!popover.footer.querySelector(".jr2-tour-skip")) {
            const skip = document.createElement("button");
            skip.type = "button";
            skip.className = "jr2-tour-skip";
            skip.textContent = t.tour.ui.skip;
            skip.addEventListener("click", () => popover.closeButton.click());
            popover.footerButtons.before(skip);
          }
        },
        onDestroyed: (_element, _step, { reason }) => {
          activeRef.current = null;
          // Skipping counts as done. Ending it from code (leaving the page, starting another tour) does not.
          if (reason !== "api" && reason !== "replaced" && !note) remember(tour);
          if (opener?.isConnected) opener.focus?.({ preventScroll: true });
        },
      });
      activeRef.current = d;
      d.drive();
    },
    [remember, role, t],
  );

  const start = useCallback(
    (id: TourId) => {
      const tour = tourById(id);
      if (!tour || tour.audience !== audience) return;
      activeRef.current?.destroy();
      if (tour.match(pathname)) void run(tour, false);
      else if (tour.path) router.push(`${tour.path}?tour=${tour.id}`);
    },
    [audience, pathname, router, run],
  );

  // A tour never outlives the page it was started on.
  useEffect(() => () => activeRef.current?.destroy(), [pathname]);

  // The first visit to a page starts its tour; ?tour=<id> (from "Play" on another page) starts that one.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tour");
    if (param) askedRef.current = { path: pathname, id: param };
    const asked = askedRef.current?.path === pathname ? tours.find((tour) => tour.id === askedRef.current?.id && tour.match(pathname)) : undefined;
    const due = here && here.auto && !hasSeen(seen, here) ? here : undefined;
    const tour = asked ?? due;
    if (!tour) return;

    const timer = window.setTimeout(
      () => {
        if (asked) {
          askedRef.current = null;
          router.replace(pathname, { scroll: false });
        }
        void run(tour, !asked);
      },
      asked ? 350 : 900,
    );
    return () => window.clearTimeout(timer);
  }, [pathname, here, seen, tours, run, router]);

  const value = useMemo(() => ({ audience, tours, seen, here, start, reset }), [audience, tours, seen, here, start, reset]);
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
