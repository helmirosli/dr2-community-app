"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";

import { stateStyles } from "@/app/components/status";
import type { MonthState } from "@/lib/status";

export type StatusCardRow = {
  unit: string;
  name: string;
  states: MonthState[];
  paidUntil: string;
};

type Filter = "all" | "unpaid" | "pending";

export function StatusCards({
  rows,
  labels,
}: {
  rows: StatusCardRow[];
  labels: { all: string; unpaid: string; pending: string; search: string; noMatch: string; states: Record<MonthState, string> };
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visible = rows.filter(
    (r) =>
      (!query || r.unit.startsWith(query.trim())) &&
      (filter === "all" || r.states.some((s) => (filter === "unpaid" ? s === "unpaid" || s === "partial" : s === "pending"))),
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[var(--cyan)]">
          <Search size={16} aria-hidden="true" className="text-[var(--ink-2)]" />
          <span className="sr-only">{labels.search}</span>
          <input
            inputMode="numeric"
            placeholder={labels.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent focus:outline-none"
          />
        </label>
        <div className="flex gap-2" role="group">
          {(["all", "unpaid", "pending"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === f ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--ink)] ring-1 ring-black/10"}`}
            >
              {labels[f]}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-2.5">
        {visible.map((r) => (
          <li key={r.unit}>
            <Link href={`/rumah/${encodeURIComponent(r.unit)}`} className="grid gap-2.5 rounded-2xl bg-white p-4 ring-1 ring-black/5 active:scale-[0.99]">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-heading font-semibold">
                  No. {r.unit} <span className="font-normal text-[var(--ink-2)]">· {r.name}</span>
                </p>
                <p className="shrink-0 text-xs text-[var(--ink-2)]">{r.paidUntil}</p>
              </div>
              <div className="grid grid-cols-12 gap-1" aria-label={r.states.map((s, i) => `${i + 1}: ${labels.states[s]}`).join(", ")}>
                {r.states.map((s, i) => (
                  <span key={i} className={`h-2.5 rounded-full ${stateStyles[s].dot}`} />
                ))}
              </div>
            </Link>
          </li>
        ))}
        {visible.length === 0 && <li className="py-8 text-center text-[var(--ink-2)]">{labels.noMatch}</li>}
      </ul>
    </div>
  );
}
