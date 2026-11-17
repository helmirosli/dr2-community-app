import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { StatusPill, stateStyles, TILE_RAISED } from "@/app/components/status";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { AmountVeil } from "@/app/components/amount-veil";
import { formatRMShort } from "@/lib/money";
import type { HoldKind, ReportCell, ReportRow, Show, YearReport } from "@/lib/reports/year-report";
import { monthName, type MonthState } from "@/lib/status";
import { fill } from "@/lib/text";

export type ReportQuery = { year: number; includeInactive: boolean; q: string; show: Show };

const CELL = "border-b border-black/5 p-1 text-center group-hover:bg-[#fafafc]";

const fmtCell = (sen: number) => `RM${(sen / 100).toFixed(2)}`;
const isPaid = (s: MonthState) => s === "paid" || s === "ahead";
const isDue = (s: MonthState) => isPaid(s) || s === "pending" || s === "partial" || s === "unpaid";

/** Builds /reports URLs from the current filters, with some overridden. null removes that filter. */
function makeHref(query: ReportQuery) {
  return (patch: Partial<Record<"year" | "includeInactive" | "q" | "show", string | null>> = {}) => {
    const merged: Record<string, string | null | undefined> = {
      year: String(query.year),
      includeInactive: query.includeInactive ? null : "off",
      q: query.q || null,
      show: query.show === "all" ? null : query.show,
      ...patch,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return `/reports${qs ? `?${qs}` : ""}`;
  };
}

function holdText(t: Dictionary, kind: HoldKind | null) {
  return kind === "FOR_SALE" ? t.residents.forSale : kind === "MOVED_OUT" ? t.residents.movedOut : kind === "EXEMPT" ? t.residents.exempt : "";
}

function Cell({ cell, t, highlight }: { cell: ReportCell; t: Dictionary; highlight: boolean }) {
  const label = t.states[cell.state];
  return (
    <td className={`${CELL} ${highlight ? "bg-[#eef5ff]" : ""}`}>
      <span
        title={cell.amountSen ? fmtCell(cell.amountSen) : label}
        className={`grid min-h-8 min-w-14 place-items-center rounded-lg px-1 text-[11px] font-semibold tabular-nums ${TILE_RAISED} ${stateStyles[cell.state].tile}`}
      >
        {cell.pending ? (
          <span className="grid leading-tight">
            <span>{fmtCell(cell.pending.sen)}</span>
            <span className="text-[10px] uppercase">{cell.pending.carry ? t.reports.carryTag : t.reports.pendingTag}</span>
          </span>
        ) : cell.state === "hold" ? (
          <span className="uppercase">{holdText(t, cell.hold)}</span>
        ) : isPaid(cell.state) ? (
          <Check size={14} strokeWidth={3} aria-label={label} />
        ) : cell.amountSen ? (
          fmtCell(cell.amountSen)
        ) : (
          ""
        )}
      </span>
    </td>
  );
}

function Hero({ t, locale, report, rows, href, includeInactive }: { t: Dictionary; locale: Locale; report: YearReport; rows: ReportRow[]; href: ReturnType<typeof makeHref>; includeInactive: boolean }) {
  const c = t.reports;
  const monthTotals = Array<number>(12).fill(0);
  let paidCells = 0;
  let dueCells = 0;
  let pendingSen = 0;
  for (const r of rows) {
    r.cells.forEach((cell, i) => {
      monthTotals[i] += cell.amountSen;
      if (isPaid(cell.state)) paidCells += 1;
      if (isDue(cell.state)) dueCells += 1;
      if (cell.pending) pendingSen += cell.pending.sen;
    });
  }
  const collectedSen = rows.reduce((sum, r) => sum + r.paidSen, 0);
  const arrearsSen = rows.reduce((sum, r) => sum + r.arrearsSen, 0);
  const arrearsHouses = rows.filter((r) => r.hasArrears).length;
  const max = Math.max(0, ...monthTotals);
  const pct = dueCells > 0 ? Math.round((paidCells / dueCells) * 100) : 0;

  return (
    <section aria-label={fill(c.collectedIn, { year: report.year })} data-tour="reports-hero" className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10 sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.26),transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-8 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(142,229,63,.18),transparent_70%)]" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid content-start gap-4">
          <span className="text-blend font-heading text-sm font-semibold">{fill(c.collectedIn, { year: report.year })}</span>
          <AmountVeil>
          <p className="font-heading text-[clamp(2.5rem,6vw,3.75rem)] font-extrabold leading-none tracking-tight tabular-nums">
            <span className="money text-blend">{formatRMShort(collectedSen)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {arrearsSen > 0 ? (
              <Link href={href({ show: "arrears" })} className="inline-flex items-center gap-1.5 rounded-full bg-[#3d1a16] px-2.5 py-1 text-[#ff8a6e] hover:brightness-125">
                {c.arrears} <span className="money">{formatRMShort(arrearsSen)}</span> · {arrearsHouses} {c.housesInView}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#1c3a2a] px-2.5 py-1 text-[var(--lime)]">{c.owesNothing}</span>
            )}
            {pendingSen > 0 && (
              <Link href={href({ show: "pending" })} className="inline-flex items-center gap-1.5 rounded-full bg-[#0e3346] px-2.5 py-1 text-[var(--cyan)] hover:brightness-125">
                {c.pendingReview} <span className="money">{formatRMShort(pendingSen)}</span>
              </Link>
            )}
          </div>
          </AmountVeil>
          <div className="flex items-center gap-3 text-sm text-[#c7cedd]">
            <span className="grid h-2 w-40 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <span className="h-full rounded-full bg-[image:var(--blend)]" style={{ width: `${pct}%` }} />
            </span>
            <span className="tabular-nums">
              {fill(c.monthsPaidOf, { paid: paidCells, due: dueCells })} <span className="text-white/40">· {pct}%</span>
            </span>
          </div>
        </div>

        {/* Collected each month; each bar opens that month's report. */}
        <div className="grid gap-2 lg:w-[23rem]">
          <nav aria-label={c.perMonthHint} className="grid grid-cols-12 items-end gap-1.5 sm:gap-2">
            {monthTotals.map((total, i) => {
              const pctOfMax = max > 0 ? Math.round((total / max) * 100) : 0;
              const name = monthName(locale, report.year, i + 1, "short");
              const isNow = report.highlightMonth === i;
              const detail = `/reports/monthly-detail?year=${report.year}&month=${i + 1}${includeInactive ? "" : "&includeInactive=off"}`;
              return (
                <Link
                  key={i}
                  href={detail}
                  title={`${fill(c.openMonth, { month: monthName(locale, report.year, i + 1, "long") })} · ${formatRMShort(total)}`}
                  aria-label={`${fill(c.openMonth, { month: monthName(locale, report.year, i + 1, "long") })}: ${formatRMShort(total)}`}
                  className="group grid justify-items-center gap-1.5"
                >
                  <span className={`relative h-20 w-full max-w-7 overflow-hidden rounded-full bg-white/10 ring-2 transition ${isNow ? "ring-[var(--lime)]/60" : "ring-transparent group-hover:ring-white/30"}`}>
                    <span
                      className="animate-grow absolute inset-x-0 bottom-0 origin-bottom rounded-full bg-[image:var(--blend)]"
                      style={{ height: `${total > 0 ? Math.max(pctOfMax, 7) : 0}%`, animationDelay: `${i * 45}ms` }}
                    />
                  </span>
                  <span className={`text-[10px] font-semibold ${isNow ? "text-white" : "text-[#8e9ab8]"}`}>{name.slice(0, 1)}</span>
                </Link>
              );
            })}
          </nav>
          <p className="text-xs text-[#8e9ab8]">{c.perMonthHint}</p>
        </div>
      </div>
    </section>
  );
}

export function ReportsView({ t, locale, report, query }: { t: Dictionary; locale: Locale; report: YearReport; query: ReportQuery }) {
  const c = t.reports;
  const href = makeHref(query);
  const needle = query.q.toLowerCase();
  const filteredRows = query.q ? report.rows.filter((r) => r.unit.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle)) : report.rows;
  const visibleRows = filteredRows.filter((r) =>
    query.show === "paid" ? r.paidAll : query.show === "arrears" ? r.hasArrears : query.show === "pending" ? r.pendingCount > 0 : query.show === "hold" ? r.isForSale : true,
  );

  const stats = [
    { key: "all", label: c.totalUnits, value: filteredRows.length, tone: "text-[var(--ink)]", dot: "bg-[var(--ink)]" },
    { key: "paid", label: c.fullyPaid, value: filteredRows.filter((r) => r.paidAll).length, tone: "text-[#1c7a33]", dot: "bg-[var(--leaf)]" },
    { key: "arrears", label: c.haveArrears, value: filteredRows.filter((r) => r.hasArrears).length, tone: "text-[#c2341a]", dot: "bg-[var(--due)]" },
    { key: "pending", label: c.pendingReview, value: filteredRows.filter((r) => r.pendingCount > 0).length, tone: "text-[#0b6e8e]", dot: "bg-[var(--cyan)]" },
    { key: "hold", label: c.forSale, value: filteredRows.filter((r) => r.isForSale).length, tone: "text-[#5d6779]", dot: "bg-[var(--hold)]" },
  ] as const;

  // Column totals for the rows on screen.
  const monthTotals = Array<number>(12).fill(0);
  for (const r of visibleRows) r.cells.forEach((cell, i) => (monthTotals[i] += cell.amountSen));
  const extraTotals = report.collections.map((_, i) => visibleRows.reduce((sum, r) => sum + (r.extras[i]?.state === "partial" ? r.extras[i]!.sen : 0), 0));
  const totalPaid = visibleRows.reduce((sum, r) => sum + r.paidSen, 0);
  const totalOwes = visibleRows.reduce((sum, r) => sum + r.arrearsSen, 0);

  const legend: { state: MonthState; label: string }[] = [
    { state: "paid", label: c.paid },
    { state: "partial", label: c.partialPayment },
    { state: "unpaid", label: c.unpaidPast },
    { state: "hold", label: c.forSaleVacant },
    { state: "pending", label: c.pendingReview },
  ];
  const legendCount = (s: MonthState) => filteredRows.reduce((n, r) => n + r.cells.filter((cell) => cell.state === s || (s === "paid" && cell.state === "ahead")).length, 0);

  const focus = report.highlightMonth ?? (report.year < new Date().getFullYear() ? 11 : 0);
  const hasFilters = query.show !== "all" || Boolean(query.q);

  return (
    <>
      <Hero t={t} locale={locale} report={report} rows={filteredRows} href={href} includeInactive={query.includeInactive} />

      {/* Stat tiles double as the status filter */}
      <nav aria-label="Filter houses by status" data-tour="reports-filters" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:max-sm:col-span-2">
        {stats.map((st) => {
          const active = query.show === st.key;
          return (
            <Link
              key={st.key}
              href={href({ show: active || st.key === "all" ? null : st.key })}
              aria-current={active ? "page" : undefined}
              className={`ui-card grid gap-1 p-4 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] ${
                active ? "ring-2 ring-[var(--blue)] shadow-[0_8px_24px_-12px_rgba(36,99,232,0.5)]" : ""
              }`}
            >
              <span className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                <span className={`size-2 rounded-full ${st.dot}`} aria-hidden="true" />
                <span className="first-letter:uppercase">{st.label}</span>
              </span>
              <span className={`font-heading text-3xl font-bold tracking-tight tabular-nums ${st.tone}`}>{st.value}</span>
            </Link>
          );
        })}
      </nav>

      <section data-tour="reports-grid" className="ui-card overflow-hidden">
        {/* Year switcher, house scope, search */}
        <div className="flex flex-col gap-3 border-b border-black/5 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 items-center rounded-full bg-[var(--paper)] p-1">
              <Link aria-label={c.previousYear} href={href({ year: String(query.year - 1) })} className="grid size-8 place-items-center rounded-full text-[var(--ink-2)] hover:bg-white hover:text-[var(--ink)]">
                <ChevronLeft size={16} />
              </Link>
              <span className="px-3 font-heading text-base font-bold tabular-nums text-[var(--ink)]">{query.year}</span>
              <Link aria-label={c.nextYear} href={href({ year: String(query.year + 1) })} className="grid size-8 place-items-center rounded-full text-[var(--ink-2)] hover:bg-white hover:text-[var(--ink)]">
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid h-10 grid-cols-2 rounded-full bg-[var(--paper)] p-1 text-[13px] font-semibold" role="group" aria-label={c.totalUnits}>
              <Link
                href={href({ includeInactive: "off" })}
                aria-current={!query.includeInactive ? "page" : undefined}
                className={`flex items-center justify-center rounded-full px-3.5 ${!query.includeInactive ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)] hover:text-[var(--ink)]"}`}
              >
                {c.activeOnly}
              </Link>
              <Link
                href={href({ includeInactive: null })}
                aria-current={query.includeInactive ? "page" : undefined}
                className={`flex items-center justify-center rounded-full px-3.5 ${query.includeInactive ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)] hover:text-[var(--ink)]"}`}
              >
                {c.includeInactive}
              </Link>
            </div>
          </div>
          <form method="get" action="/reports" className="flex h-10 items-center gap-2 rounded-full bg-[var(--paper)] pl-4 pr-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--cyan)] lg:w-72">
            <input type="hidden" name="year" value={query.year} />
            {!query.includeInactive && <input type="hidden" name="includeInactive" value="off" />}
            {query.show !== "all" && <input type="hidden" name="show" value={query.show} />}
            <Search size={16} className="shrink-0 text-[var(--ink-2)]" aria-hidden="true" />
            <input aria-label={c.searchPlaceholder} defaultValue={query.q} name="q" placeholder={c.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {query.q && (
              <Link href={href({ q: null })} aria-label={c.clearFilters} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink-2)] hover:bg-black/5">
                <X size={14} />
              </Link>
            )}
          </form>
        </div>

        {hasFilters && (
          <p className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-[#fafafc] px-4 py-2 text-xs text-[var(--ink-2)] sm:px-5">
            {fill(c.showing, { n: visibleRows.length, total: filteredRows.length })}
            <Link href={href({ show: null, q: null })} className="font-semibold text-[var(--blue)] hover:underline">
              {c.clearFilters}
            </Link>
          </p>
        )}

        {/* Legend, with how many months of each kind */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-4 py-3 sm:px-5">
          {legend.map((l) => (
            <StatusPill key={l.state} state={l.state} label={`${l.label} · ${legendCount(l.state)}`} />
          ))}
          {report.collections.length > 0 && <span className={`ui-chip ${stateStyles.partial.pill}`}>{c.specialCollectionLegend}</span>}
        </div>

        {/* Phones: one card per house */}
        <ul className="grid gap-2.5 p-3 md:hidden">
          {visibleRows.map((r) => (
            <li key={r.residentId}>
              <Link href={`/residents/${r.residentId}`} className="grid gap-2.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition active:scale-[0.99]">
                <span className="flex items-center gap-3">
                  <span className={`grid size-12 shrink-0 place-items-center rounded-xl font-heading text-lg font-bold tabular-nums ${TILE_RAISED} ${stateStyles[r.cells[focus].state].tile}`}>{r.unit}</span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-heading font-semibold">{r.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums text-[var(--ink-2)]">
                      <span>
                        {c.paidCol} <b className="font-semibold text-[var(--ink)]">{formatRMShort(r.paidSen)}</b>
                      </span>
                      {r.arrearsSen > 0 && (
                        <span className="font-semibold text-[#c2341a]">
                          {c.owesCol} {formatRMShort(r.arrearsSen)}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-[#c7c7cc]" />
                </span>
                <span className="grid grid-cols-12 gap-1" aria-label={r.cells.map((cell, i) => `${monthName(locale, report.year, i + 1)}: ${t.states[cell.state]}`).join(", ")}>
                  {r.cells.map((cell, i) => (
                    <span key={i} className={`h-2.5 rounded-full ${stateStyles[cell.state].dot}`} />
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablet and up: the year grid */}
        <div className="hidden max-h-[75vh] overflow-auto md:block">
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#fafafc] text-[var(--ink-2)]">
                <th className="border-b border-black/5 bg-[#fafafc] px-3 py-3 text-center font-semibold">No</th>
                <th className="sticky left-0 z-10 border-b border-black/5 bg-[#fafafc] px-3 py-3 font-semibold uppercase">{c.houseNo}</th>
                <th className="min-w-36 border-b border-black/5 bg-[#fafafc] px-3 py-3 font-semibold uppercase">{c.nameCol}</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className={`border-b border-black/5 bg-[#fafafc] px-1.5 py-3 text-center font-semibold ${report.highlightMonth === i ? "text-[var(--blue)]" : ""}`}>
                    <Link
                      href={`/reports/monthly-detail?year=${report.year}&month=${i + 1}${query.includeInactive ? "" : "&includeInactive=off"}`}
                      title={fill(c.openMonth, { month: monthName(locale, report.year, i + 1, "long") })}
                      className="block rounded-md px-1 hover:bg-black/5"
                    >
                      {monthName(locale, report.year, i + 1)}
                      <span className="block text-[10px] font-normal opacity-70">{String(report.year).slice(2)}</span>
                    </Link>
                  </th>
                ))}
                {report.collections.map((sc) => (
                  <th className="border-b border-black/5 bg-[#fafafc] px-2 py-3 text-center font-semibold text-[#8a6300]" key={sc.id}>
                    <span className="uppercase">{sc.title}</span>
                    {sc.carriedFrom && <span className="block text-[10px] font-medium normal-case opacity-70">{fill(c.stillOwedFrom, { year: sc.carriedFrom })}</span>}
                  </th>
                ))}
                <th className="sticky right-24 z-10 w-24 min-w-24 shadow-[inset_1px_0_0_rgba(0,0,0,.06)] border-b border-black/5 bg-[#fafafc] px-3 py-3 text-right font-semibold uppercase">{c.paidCol}</th>
                <th className="sticky right-0 z-10 w-24 min-w-24 border-b border-black/5 bg-[#fafafc] px-3 py-3 text-right font-semibold uppercase">{c.owesCol}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr className="group" key={r.residentId}>
                  <td className={`${CELL} px-3 text-[var(--ink-2)]`}>{r.no}</td>
                  <td className="sticky left-0 z-10 border-b border-black/5 bg-white px-3 py-2 font-heading font-bold text-[var(--ink)] group-hover:bg-[#fafafc]">
                    <Link href={`/residents/${r.residentId}`} className="hover:text-[var(--blue)]">
                      {r.unit}
                    </Link>
                  </td>
                  <td className="min-w-36 border-b border-black/5 px-3 py-2 font-medium text-[var(--ink)] group-hover:bg-[#fafafc]">
                    <Link href={`/residents/${r.residentId}`} className="hover:text-[var(--blue)]">
                      {r.name}
                    </Link>
                  </td>
                  {r.cells.map((cell, i) => (
                    <Cell key={i} cell={cell} t={t} highlight={report.highlightMonth === i} />
                  ))}
                  {r.extras.map((extra, i) => (
                    <td className={CELL} key={report.collections[i].id}>
                      {extra ? (
                        <span className={`grid min-h-8 min-w-14 place-items-center rounded-lg px-1 text-[11px] font-semibold tabular-nums ${TILE_RAISED} ${stateStyles[extra.state].tile}`}>
                          {extra.state === "pending" ? (
                            <span className="grid leading-tight">
                              <span>{fmtCell(extra.sen)}</span>
                              <span className="text-[10px] uppercase">{c.pendingTag}</span>
                            </span>
                          ) : extra.state === "partial" ? (
                            fmtCell(extra.sen)
                          ) : (
                            <Check size={14} strokeWidth={3} aria-label={t.states.paid} />
                          )}
                        </span>
                      ) : (
                        <span className="text-[#c7c7cc]">—</span>
                      )}
                    </td>
                  ))}
                  <td className="sticky right-24 z-10 w-24 min-w-24 shadow-[inset_1px_0_0_rgba(0,0,0,.06)] border-b border-black/5 bg-white px-3 py-2 text-right font-semibold tabular-nums text-[var(--ink)] group-hover:bg-[#fafafc]">{formatRMShort(r.paidSen)}</td>
                  <td className={`sticky right-0 z-10 w-24 min-w-24 border-b border-black/5 bg-white px-3 py-2 text-right font-semibold tabular-nums group-hover:bg-[#fafafc] ${r.arrearsSen > 0 ? "text-[#c2341a]" : "text-[#c7c7cc]"}`}>
                    {r.arrearsSen > 0 ? formatRMShort(r.arrearsSen) : "—"}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={17 + report.collections.length}>
                    <div className="ui-empty">{c.noResidents}</div>
                  </td>
                </tr>
              )}
            </tbody>
            {visibleRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-20">
                <tr className="bg-[#fafafc] text-[var(--ink)]">
                  <td className="border-t border-black/10 bg-[#fafafc] px-3 py-3" />
                  <td className="sticky left-0 z-10 border-t border-black/10 bg-[#fafafc] px-3 py-3 font-heading font-bold uppercase">{c.totalRow}</td>
                  <td className="border-t border-black/10 bg-[#fafafc] px-3 py-3 text-[var(--ink-2)]">
                    {visibleRows.length} {c.housesInView}
                  </td>
                  {monthTotals.map((total, i) => (
                    <td key={i} className="border-t border-black/10 bg-[#fafafc] px-1 py-3 text-center font-semibold tabular-nums">
                      {total > 0 ? formatRMShort(total) : <span className="text-[#c7c7cc]">—</span>}
                    </td>
                  ))}
                  {extraTotals.map((total, i) => (
                    <td key={i} className="border-t border-black/10 bg-[#fafafc] px-2 py-3 text-center font-semibold tabular-nums text-[#8a6300]">
                      {total > 0 ? formatRMShort(total) : <span className="text-[#c7c7cc]">—</span>}
                    </td>
                  ))}
                  <td className="sticky right-24 z-10 w-24 min-w-24 shadow-[inset_1px_0_0_rgba(0,0,0,.06)] border-t border-black/10 bg-[#fafafc] px-3 py-3 text-right font-heading font-bold tabular-nums">{formatRMShort(totalPaid)}</td>
                  <td className={`sticky right-0 z-10 w-24 min-w-24 border-t border-black/10 bg-[#fafafc] px-3 py-3 text-right font-heading font-bold tabular-nums ${totalOwes > 0 ? "text-[#c2341a]" : "text-[#c7c7cc]"}`}>
                    {totalOwes > 0 ? formatRMShort(totalOwes) : "—"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </>
  );
}
