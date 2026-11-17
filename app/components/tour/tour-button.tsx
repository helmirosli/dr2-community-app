"use client";

import { HelpCircle } from "lucide-react";

import { useDictionary } from "@/lib/i18n/context";
import type { TourId } from "@/lib/tours/defs";
import { useTours } from "./tour-provider";

/** A small "take a tour" pill for the resident pages: dark on the night bands, light on paper. */
export function TourButton({ id, tone = "dark", children }: { id: TourId; tone?: "dark" | "light"; children?: React.ReactNode }) {
  const { t } = useDictionary();
  const { start } = useTours();
  return (
    <button
      type="button"
      onClick={() => start(id)}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95 ${
        tone === "dark" ? "bg-white/10 text-[#d2d2d7] ring-1 ring-white/15 hover:bg-white/15 hover:text-white" : "bg-white text-[var(--ink)] shadow-sm ring-1 ring-black/10 hover:bg-[var(--paper)]"
      }`}
    >
      <HelpCircle size={15} aria-hidden="true" />
      {children ?? t.tour.ui.takeTour}
    </button>
  );
}

/** The footer link: plays the tour for the page being shown, or the welcome tour from anywhere else. */
export function TourFooterLink() {
  const { t } = useDictionary();
  const { here, start } = useTours();
  return (
    <button type="button" onClick={() => start(here?.id ?? "resident-home")} className="w-fit text-left hover:text-[var(--ink)]">
      {t.tour.ui.footerLink}
    </button>
  );
}
