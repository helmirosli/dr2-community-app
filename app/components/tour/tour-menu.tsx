"use client";

import { useEffect, useRef, useState } from "react";
import { Check, HelpCircle, Play, RotateCcw } from "lucide-react";

import { useDictionary } from "@/lib/i18n/context";
import { hasSeen, type TourDef } from "@/lib/tours/defs";
import { useTours } from "./tour-provider";

/** Every tour with a tick for the ones already seen, a Play button, and "Show tips again". Light for the header, dark for the phone sheet. */
export function TourList({ tone = "light", onPlay }: { tone?: "light" | "dark"; onPlay?: () => void }) {
  const { t } = useDictionary();
  const { tours, seen, here, start } = useTours();
  const dark = tone === "dark";
  const copy = t.tour.ui;

  const label = `text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-[#5f6b88]" : "text-[var(--ink-2)]"}`;

  const row = (tour: TourDef) => {
    const playable = tour.id === here?.id || Boolean(tour.path);
    const done = hasSeen(seen, tour);
    const body = (
      <>
        <span
          aria-hidden="true"
          className={`grid size-8 shrink-0 place-items-center rounded-xl ${
            done ? (dark ? "bg-[#1c3a2a] text-[var(--lime)]" : "bg-[#e2f7e1] text-[#1c7a33]") : dark ? "bg-white/10 text-[#c7cedd]" : "bg-[var(--paper)] text-[var(--ink-2)]"
          }`}
        >
          {done ? <Check size={15} strokeWidth={3} /> : <Play size={14} />}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm font-semibold ${dark ? "text-white" : "text-[var(--ink)]"}`}>
            {tour.name(t)}
            {done && <span className="sr-only"> ({copy.seen})</span>}
          </span>
          <span className={`block text-xs ${dark ? "text-[#8e9ab8]" : "text-[var(--ink-2)]"}`}>{playable ? tour.summary(t) : copy.startsOnPage}</span>
        </span>
      </>
    );
    const cls = `flex w-full items-center gap-3 rounded-2xl p-2 ${dark ? "hover:bg-white/5" : "hover:bg-[var(--paper)]"}`;
    return playable ? (
      <button
        type="button"
        className={`${cls} transition active:scale-[0.99]`}
        onClick={() => {
          onPlay?.();
          start(tour.id);
        }}
      >
        {body}
      </button>
    ) : (
      <div className={`${cls} opacity-60`}>{body}</div>
    );
  };

  return (
    <div className="grid gap-4">
      {here && (
        <section className="grid gap-1">
          <p className={`px-2 ${label}`}>{copy.thisPage}</p>
          {row(here)}
        </section>
      )}
      <section className="grid gap-1">
        <p className={`px-2 ${label}`}>{copy.allTours}</p>
        <ul className="grid gap-0.5">
          {tours
            .filter((tour) => tour.id !== here?.id)
            .map((tour) => (
              <li key={tour.id}>{row(tour)}</li>
            ))}
        </ul>
      </section>
    </div>
  );
}

/** "Show tips again", kept apart from the list so it stays in view while the list scrolls. */
export function TourReset({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { t } = useDictionary();
  const { reset } = useTours();
  const [done, setDone] = useState(false);
  const dark = tone === "dark";
  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={() => {
          reset();
          setDone(true);
        }}
        className={`flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
          dark ? "text-[var(--cyan)] hover:bg-white/5" : "text-[var(--blue)] hover:bg-black/5"
        }`}
      >
        <RotateCcw size={14} aria-hidden="true" />
        {t.tour.ui.showAgain}
      </button>
      {done && (
        <p role="status" className={`px-3 text-xs ${dark ? "text-[#8e9ab8]" : "text-[var(--ink-2)]"}`}>
          {t.tour.ui.showAgainDone}
        </p>
      )}
    </div>
  );
}

/** The ? button in the staff header: a small panel with the tour for this page and every other one. */
export function TourHelpButton() {
  const { t } = useDictionary();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        data-tour="help-entry"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.tour.ui.help}
        title={t.tour.ui.help}
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5 hover:text-[var(--ink)]"
      >
        <HelpCircle size={19} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t.tour.ui.helpTitle}
          className="absolute right-0 top-12 z-30 flex max-h-[min(34rem,calc(100vh-6rem))] w-[22rem] flex-col rounded-3xl bg-white p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,.35)] ring-1 ring-black/5"
        >
          <p className="px-2 pb-2 pt-1 font-heading text-base font-bold text-[var(--ink)]">{t.tour.ui.helpTitle}</p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TourList onPlay={() => setOpen(false)} />
          </div>
          <div className="mt-1 border-t border-black/5 pt-1">
            <TourReset />
          </div>
        </div>
      )}
    </div>
  );
}
