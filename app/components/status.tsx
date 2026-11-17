import Link from "next/link";

import type { MonthState } from "@/lib/status";

/** Raised, button-like edge for small status tiles. */
export const TILE_RAISED = "shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_2px_0_rgba(0,0,0,.07)]";

// One colour per state (spec §3). Light surfaces; the dark variants are for night bands.
export const stateStyles: Record<MonthState, { pill: string; dot: string; tile: string; tileDark: string }> = {
  paid: { pill: "bg-[#e2f7e1] text-[#1c7a33]", dot: "bg-[var(--leaf)]", tile: "bg-[#e2f7e1] text-[#1c7a33]", tileDark: "bg-[#1c3a2a] text-[var(--lime)]" },
  ahead: {
    pill: "text-[#1c7a33] ring-[1.5px] ring-inset ring-[var(--leaf)]",
    dot: "bg-white ring-2 ring-inset ring-[var(--leaf)]",
    tile: "bg-white text-[#1c7a33] ring-2 ring-inset ring-[var(--leaf)]",
    tileDark: "bg-transparent text-[var(--lime)] ring-2 ring-inset ring-[var(--leaf)]",
  },
  pending: { pill: "bg-[#ddf5fd] text-[#0b6e8e]", dot: "bg-[var(--cyan)]", tile: "bg-[#ddf5fd] text-[#0b6e8e]", tileDark: "bg-[#0e3346] text-[var(--cyan)]" },
  partial: { pill: "bg-[#fff4d6] text-[#8a6300]", dot: "bg-[var(--amber)]", tile: "bg-[#fff4d6] text-[#8a6300]", tileDark: "bg-[#3a3010] text-[#f5b400]" },
  unpaid: { pill: "bg-[#ffe6e0] text-[#c2341a]", dot: "bg-[var(--due)]", tile: "bg-[#ffe6e0] text-[#c2341a]", tileDark: "bg-[#3d1a16] text-[#ff8a6e]" },
  hold: { pill: "bg-[#eef0f4] text-[#5d6779]", dot: "bg-[var(--hold)]", tile: "bg-[#eef0f4] text-[#5d6779]", tileDark: "bg-[#1a2338] text-[#6e7a94]" },
  upcoming: { pill: "bg-white text-[#aeaeb2] ring-1 ring-inset ring-[#d2d2d7]", dot: "bg-[#d2d2d7]", tile: "bg-white text-[#aeaeb2] ring-1 ring-inset ring-[#d2d2d7]", tileDark: "bg-[#13224a] text-[#5f6b88]" },
};

/** Monthly fees are green, special collections amber: the same colours in the payment form, the ledger and a house's history. */
export const TYPE_TONE = {
  MONTHLY_FEE: { tile: "bg-[#e2f7e1] text-[#1c7a33]", icon: "text-[#1c7a33]" },
  SPECIAL_COLLECTION: { tile: "bg-[#fff4d6] text-[#8a6300]", icon: "text-[#8a6300]" },
} as const;

export function StatusPill({ state, label, className = "" }: { state: MonthState; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stateStyles[state].pill} ${className}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${stateStyles[state].dot}`} />
      {label}
    </span>
  );
}

/** A house-number tile coloured by state. Used by the dashboard strip and the residents map. */
export function HouseTile({
  unit,
  state,
  label,
  href,
  dark = false,
  className: extra = "",
}: {
  unit: string;
  state: MonthState;
  label: string;
  href?: string;
  dark?: boolean;
  className?: string;
}) {
  const className = `grid aspect-square place-items-center rounded-xl font-heading text-sm font-bold tabular-nums transition ${
    dark ? stateStyles[state].tileDark : stateStyles[state].tile
  } ${href ? "hover:scale-105 focus-visible:scale-105" : ""} ${extra}`;
  const title = `${unit}: ${label}`;
  return href ? (
    <Link href={href} className={className} title={title} aria-label={title}>
      {unit}
    </Link>
  ) : (
    <span className={className} title={title} aria-label={title}>
      {unit}
    </span>
  );
}
