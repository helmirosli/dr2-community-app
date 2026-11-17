"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useDictionary } from "@/lib/i18n/context";

/**
 * Money figures (anything marked className="money") stay blurred until the eye is pressed, so a screen left open
 * or shared does not show them. One switch for every page, applied as data-veil on <html>. It lives in memory, so
 * a reload starts hidden again; the blur itself is in globals.css and also covers the moment before this loads.
 */
let shown = false;
const listeners = new Set<() => void>();
const apply = () => {
  document.documentElement.dataset.veil = shown ? "off" : "on";
};
function subscribe(listener: () => void) {
  listeners.add(listener);
  apply();
  return () => void listeners.delete(listener);
}
const snapshot = () => shown;
function toggle() {
  shown = !shown;
  apply();
  listeners.forEach((l) => l());
}

export function AmountEye({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { t } = useDictionary();
  const visible = useSyncExternalStore(subscribe, snapshot, () => false);
  const label = visible ? t.common.hideAmounts : t.common.showAmounts;
  return (
    <button type="button" onClick={toggle} aria-pressed={visible} aria-label={label} title={label} className={className}>
      {/* The icon shows the state: open eye = amounts visible, crossed eye = hidden. */}
      {visible ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
      {withLabel && <span className="text-sm font-semibold">{label}</span>}
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
