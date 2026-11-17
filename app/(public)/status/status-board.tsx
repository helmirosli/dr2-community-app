"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Search } from "lucide-react";

import { stateStyles, TILE_RAISED } from "@/app/components/status";
import type { MonthState } from "@/lib/status";

export type BoardCell = { state: MonthState; text: string };

export type BoardRow = {
  unit: string;
  name: string;
  paidUntil: string;
  /** Twelve months, January first. */
  cells: BoardCell[];
  /** One entry per special-collection column; null when the house is not part of that collection. */
  extras: (BoardCell | null)[];
};

export type BoardLabels = {
  all: string;
  unpaid: string;
  pending: string;
  search: string;
  noMatch: string;
  noRecords: string;
  unit: string;
  name: string;
  states: Record<MonthState, string>;
};

type Filter = "all" | "unpaid" | "pending";


const isPaid = (s: MonthState) => s === "paid" || s === "ahead";

function Cell({ cell, label, className = "" }: { cell: BoardCell; label: string; className?: string }) {
  return (
    <span
      title={label}
      className={`grid min-h-8 min-w-12 place-items-center rounded-lg px-1 text-[11px] font-semibold ${TILE_RAISED} ${stateStyles[cell.state].tile} ${className}`}
    >
      {isPaid(cell.state) ? <Check size={14} strokeWidth={3} aria-label={label} /> : cell.text}
    </span>
  );
}

export function StatusBoard({
  rows,
  months,
  collections,
  focusMonth,
  highlightMonth,
  labels,
}: {
  rows: BoardRow[];
  /** Twelve short month names for the table header. */
  months: string[];
  collections: { id: string; title: string; note: string | null }[];
  /** Month (0-based) whose colour is shown on each phone card's house tile. */
  focusMonth: number;
  /** Month (0-based) to highlight in the table: this month, when viewing the current year. */
  highlightMonth: number | null;
  labels: BoardLabels;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const flags = useMemo(
    () =>
      rows.map((r) => ({
        unpaid: r.cells.some((c) => c.state === "unpaid" || c.state === "partial"),
        pending: r.cells.some((c) => c.state === "pending"),
      })),
    [rows],
  );
  const counts: Record<Filter, number> = {
    all: rows.length,
    unpaid: flags.filter((f) => f.unpaid).length,
    pending: flags.filter((f) => f.pending).length,
  };

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r, i) => {
    if (filter !== "all" && !flags[i][filter]) return false;
    if (!q) return true;
    // Digits look up a house number; anything else searches names.
    return /^\d+$/.test(q) ? r.unit.startsWith(q) : r.name.toLowerCase().includes(q);
  });

  const emptyText = rows.length === 0 ? labels.noRecords : labels.noMatch;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 basis-56 items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[var(--cyan)] md:max-w-xs md:flex-none">
          <Search size={16} aria-hidden="true" className="text-[var(--ink-2)]" />
          <span className="sr-only">{labels.search}</span>
          <input
            inputMode="search"
            placeholder={labels.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group">
          {(["all", "unpaid", "pending"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === f ? "bg-[var(--ink)] text-white shadow-[0_3px_0_rgba(0,0,0,.25)]" : "bg-white text-[var(--ink)] shadow-sm ring-1 ring-black/10 hover:bg-[#fafafa]"
              }`}
            >
              {labels[f]}
              <span className={`tabular-nums text-xs ${filter === f ? "text-white/70" : "text-[var(--ink-2)]"}`}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Phones: one card per house. The tile shows the house's colour for the focus month. */}
      <ul className="grid gap-2.5 md:hidden">
        {visible.map((r) => (
          <li key={r.unit}>
            <Link
              href={`/rumah/${encodeURIComponent(r.unit)}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition active:scale-[0.99]"
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-xl font-heading text-lg font-bold tabular-nums ${TILE_RAISED} ${stateStyles[r.cells[focusMonth].state].tile}`}
              >
                {r.unit}
              </span>
              <span className="grid min-w-0 flex-1 gap-2">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-heading font-semibold">{r.name}</span>
                  <span className="shrink-0 text-xs text-[var(--ink-2)]">{r.paidUntil}</span>
                </span>
                <span className="grid grid-cols-12 gap-1" aria-label={r.cells.map((c, i) => `${months[i]}: ${labels.states[c.state]}`).join(", ")}>
                  {r.cells.map((c, i) => (
                    <span key={i} className={`h-2.5 rounded-full ${stateStyles[c.state].dot}`} />
                  ))}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-[#c7c7cc]" />
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the familiar year grid */}
      <div className="hidden max-h-[75vh] overflow-auto rounded-3xl bg-white shadow-[0_1px_0_rgba(0,0,0,.04),0_24px_48px_-28px_rgba(0,0,0,.2)] ring-1 ring-black/5 md:block">
        <table className="w-full border-separate border-spacing-0 text-left text-xs">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--night)] text-white">
              <th className="sticky left-0 z-10 bg-[var(--night)] px-3 py-3 font-semibold">{labels.unit}</th>
              <th className="min-w-36 px-3 py-3 font-semibold">{labels.name}</th>
              {months.map((m, i) => (
                <th key={i} className={`px-1.5 py-3 text-center font-semibold ${highlightMonth === i ? "text-[var(--lime)]" : "text-[#c7cedd]"}`}>
                  {m}
                </th>
              ))}
              {collections.map((c) => (
                <th key={c.id} className="px-2 py-3 text-center font-semibold text-[#f5b400]">
                  {c.title}
                  {c.note && <span className="block text-[10px] font-medium opacity-70">{c.note}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const href = `/rumah/${encodeURIComponent(r.unit)}`;
              return (
                <tr key={r.unit} className="group">
                  <td className="sticky left-0 z-10 border-b border-black/5 bg-white px-3 py-2 font-heading font-bold group-hover:bg-[#fafafa]">
                    <Link href={href} className="hover:text-[var(--blue)]">
                      {r.unit}
                    </Link>
                  </td>
                  <td className="min-w-36 border-b border-black/5 px-3 py-2 font-medium group-hover:bg-[#fafafa]">
                    <Link href={href} className="hover:text-[var(--blue)]">
                      {r.name}
                    </Link>
                  </td>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      className={`border-b border-black/5 p-1 text-center group-hover:bg-[#fafafa] ${highlightMonth === i ? "bg-[#f4fbec]" : ""}`}
                    >
                      <Cell cell={c} label={labels.states[c.state]} />
                    </td>
                  ))}
                  {r.extras.map((c, i) => (
                    <td key={collections[i].id} className="border-b border-black/5 p-1 text-center group-hover:bg-[#fafafa]">
                      {c ? <Cell cell={c} label={labels.states[c.state]} /> : <span className="text-[#c7c7cc]">—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && <p className="py-8 text-center text-[var(--ink-2)]">{emptyText}</p>}
    </div>
  );
}
