"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Hides the money figures inside it (anything marked className="money") until the eye is pressed, so a screen
 * left open or shared does not show the totals. Hidden every time the page opens.
 */
export function AmountVeil({ showLabel, hideLabel, children }: { showLabel: string; hideLabel: string; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <div data-veil={shown ? "off" : "on"} className="relative grid w-fit max-w-full content-start gap-4 pr-14">
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        aria-label={shown ? hideLabel : showLabel}
        title={shown ? hideLabel : showLabel}
        className="absolute right-0 top-0 grid size-10 place-items-center rounded-full bg-white/10 text-[#c7cedd] ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white active:scale-95"
      >
        {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
      {children}
    </div>
  );
}
