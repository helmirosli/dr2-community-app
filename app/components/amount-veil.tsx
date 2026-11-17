"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useDictionary } from "@/lib/i18n/context";

/**
 * Money figures (anything marked className="money") stay blurred until the eye is pressed, so a screen left open
 * or shared does not show them. One switch for every page: it is remembered for the browser session and applied
 * as data-veil on <html>; the blur itself lives in globals.css (and also covers the moment before this loads).
 */
const KEY = "dr2_amounts";
const listeners = new Set<() => void>();
const shownNow = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const apply = (shown: boolean) => {
  document.documentElement.dataset.veil = shown ? "off" : "on";
};
function subscribe(listener: () => void) {
  listeners.add(listener);
  apply(shownNow());
  return () => void listeners.delete(listener);
}
function setShown(shown: boolean) {
  try {
    sessionStorage.setItem(KEY, shown ? "1" : "0");
  } catch {}
  apply(shown);
  listeners.forEach((l) => l());
}

export function AmountEye({ className = "" }: { className?: string }) {
  const { t } = useDictionary();
  const shown = useSyncExternalStore(subscribe, shownNow, () => false);
  const label = shown ? t.common.hideAmounts : t.common.showAmounts;
  return (
    <button type="button" onClick={() => setShown(!shown)} aria-pressed={shown} aria-label={label} title={label} className={className}>
      {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
}

/** For the dark summary cards: the eye sits beside the figures it hides. */
export function AmountVeil({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid w-fit max-w-full content-start gap-4 pr-14">
      <AmountEye className="absolute right-0 top-0 grid size-10 place-items-center rounded-full bg-white/10 text-[#c7cedd] ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white active:scale-95" />
      {children}
    </div>
  );
}
