import Link from "next/link";
import { CalendarDays, Clock, Plus, Search, SearchX, Sparkles, StickyNote, X } from "lucide-react";

import { FileViewer } from "@/app/components/file-viewer";
import { TablePagination } from "@/app/components/table-pagination";
import { formatDate, malaysiaToday, monthRange } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { formatRM } from "@/lib/money";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS, type Ledger, type LedgerFilters, type LedgerPayment } from "@/lib/reports/payments-ledger";
import { monthName } from "@/lib/status";

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

/** "RM 1,440" when there are no cents, "RM 33.33" when there are. */
const rm = (sen: number) => formatRM(sen).replace(/\.00$/, "");

/** Raised, button-like edge for the house tiles. */
const RAISED = "shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_2px_0_rgba(0,0,0,.07)]";

// Same colours as the payment form: monthly fees green, special collections amber.
const TONE = {
  MONTHLY_FEE: { tile: "bg-[#e2f7e1] text-[#1c7a33]", icon: "text-[#1c7a33]" },
  SPECIAL_COLLECTION: { tile: "bg-[#fff4d6] text-[#8a6300]", icon: "text-[#8a6300]" },
} as const;

type Over = Partial<Record<"q" | "type" | "from" | "to" | "page", string | number>>;

/** Builds /payments URLs from the current filters, with some overridden. An empty string removes that filter. */
function makeHref(filters: LedgerFilters, perPage: number) {
  return (over: Over = {}) => {
    const merged = { q: filters.q, type: filters.type, from: filters.from, to: filters.to, ...over };
    const sp = new URLSearchParams();
    for (const key of ["q", "type", "from", "to"] as const) if (merged[key]) sp.set(key, String(merged[key]));
    if (perPage !== DEFAULT_PER_PAGE) sp.set("perPage", String(perPage));
    if (over.page && over.page !== 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return qs ? `/payments?${qs}` : "/payments";
  };
}

const dateAt = (day: string) => new Date(`${day}T00:00:00Z`);

/** "November 2026" for a whole month, "2026" for a whole year, otherwise "1 Nov 2026 – 15 Nov 2026". */
function scopeLabel(f: LedgerFilters, locale: Locale, copy: Dictionary["payments"]) {
  if (!f.from && !f.to) return copy.allTime;
  if (f.from && f.to) {
    const [fy, fm, fd] = f.from.split("-").map(Number);
    const [ty, tm, td] = f.to.split("-").map(Number);
    if (fy === ty && fm === tm && fd === 1 && f.to === monthRange(ty, tm).to) return monthName(locale, fy, fm, "long");
    if (fy === ty && fm === 1 && fd === 1 && tm === 12 && td === 31) return String(fy);
    return `${formatDate(dateAt(f.from), locale)} – ${formatDate(dateAt(f.to), locale)}`;
  }
  return f.from ? fill(copy.fromOnly, { date: formatDate(dateAt(f.from), locale) }) : fill(copy.untilOnly, { date: formatDate(dateAt(f.to), locale) });
}

/** "Jul 2026", "Jul – Nov 2026" or "Nov 2026 – Feb 2027". */
function coverageLabel(locale: Locale, first: { year: number; month: number }, last: { year: number; month: number }) {
  const short = (m: number) => monthName(locale, first.year, m, "short");
  if (first.year === last.year && first.month === last.month) return `${short(first.month)} ${first.year}`;
  if (first.year === last.year) return `${short(first.month)} – ${short(last.month)} ${first.year}`;
  return `${short(first.month)} ${first.year} – ${monthName(locale, last.year, last.month, "short")} ${last.year}`;
}

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

/** The dark summary card: what the current filter adds up to, and a bar for each of the last 12 months (tap one to filter). */
function Hero({ t, locale, ledger, filters, href, now }: { t: Dictionary; locale: Locale; ledger: Ledger; filters: LedgerFilters; href: ReturnType<typeof makeHref>; now: Date }) {
  const copy = t.payments;
  const hasDates = Boolean(filters.from || filters.to);
  const max = Math.max(0, ...ledger.bars.map((b) => b.totalSen));
  const monthlyPct = ledger.totalSen > 0 ? Math.round((ledger.monthlySen / ledger.totalSen) * 100) : 0;
  const today = malaysiaToday(now);
  const removable = "inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20";

  return (
    <section aria-label={copy.collected} className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10 sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.26),transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-8 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(142,229,63,.18),transparent_70%)]" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-blend mr-1 font-heading text-sm font-semibold">{copy.collected}</span>
            {hasDates ? (
              <Link href={href({ from: "", to: "" })} aria-label={`${copy.removeFilter}: ${scopeLabel(filters, locale, copy)}`} className={removable}>
                <CalendarDays size={12} aria-hidden="true" />
                {scopeLabel(filters, locale, copy)}
                <X size={12} aria-hidden="true" />
              </Link>
            ) : (
              <Chip className="bg-white/10 text-[#c7cedd]">{copy.allTime}</Chip>
            )}
            {filters.type && (
              <Link href={href({ type: "" })} aria-label={`${copy.removeFilter}: ${filters.type === "MONTHLY_FEE" ? copy.monthlyFee : copy.specialCollection}`} className={removable}>
                {filters.type === "MONTHLY_FEE" ? copy.monthlyFee : copy.specialCollection}
                <X size={12} aria-hidden="true" />
              </Link>
            )}
            {filters.q && (
              <Link href={href({ q: "" })} aria-label={`${copy.removeFilter}: ${filters.q}`} className={removable}>
                “{filters.q}”
                <X size={12} aria-hidden="true" />
              </Link>
            )}
            {ledger.waitingReview > 0 && (
              <Link href="/review" className="inline-flex items-center gap-1.5 rounded-full bg-[#0e3346] px-2.5 py-1 text-xs font-semibold text-[var(--cyan)] hover:brightness-125">
                <Clock size={12} aria-hidden="true" />
                {fill(copy.waitingReview, { n: ledger.waitingReview })}
              </Link>
            )}
          </div>

          <p className="font-heading text-[clamp(2.5rem,6vw,3.75rem)] font-extrabold leading-none tracking-tight tabular-nums">
            <span className="text-blend">{rm(ledger.totalSen)}</span>
          </p>
          <p className="text-[#c7cedd]">{ledger.totalCount === 1 ? copy.paymentCountOne : fill(copy.paymentCount, { n: ledger.totalCount })}</p>

          {ledger.totalSen > 0 && (
            <div className="grid max-w-md gap-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className="bg-[var(--leaf)]" style={{ width: `${monthlyPct}%` }} />
                <span className="bg-[var(--amber)]" style={{ width: `${100 - monthlyPct}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#c7cedd]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--leaf)]" aria-hidden="true" />
                  {copy.monthlyTotal} <b className="font-semibold tabular-nums text-white">{rm(ledger.monthlySen)}</b>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--amber)]" aria-hidden="true" />
                  {copy.specialTotal} <b className="font-semibold tabular-nums text-white">{rm(ledger.specialSen)}</b>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Last 12 months: each bar is a link that filters the ledger to that month. */}
        <div className="grid gap-2 lg:w-[23rem]">
          <nav aria-label={copy.perMonthHint} className="grid grid-cols-12 items-end gap-1.5 sm:gap-2">
            {ledger.bars.map((b, i) => {
              const range = monthRange(b.year, b.month);
              const selected = filters.from === range.from && filters.to === range.to;
              const pct = max > 0 ? Math.round((b.totalSen / max) * 100) : 0;
              const isNow = b.year === today.year && b.month === today.month;
              const label = `${monthName(locale, b.year, b.month, "long")} · ${rm(b.totalSen)} · ${b.count === 1 ? copy.paymentCountOne : fill(copy.paymentCount, { n: b.count })}`;
              return (
                <Link
                  key={b.key}
                  href={selected ? href({ from: "", to: "" }) : href({ from: range.from, to: range.to })}
                  title={label}
                  aria-label={label}
                  aria-current={selected ? "true" : undefined}
                  className="group grid justify-items-center gap-1.5"
                >
                  <span
                    className={`relative h-20 w-full max-w-7 overflow-hidden rounded-full bg-white/10 ring-2 transition ${
                      selected ? "ring-[var(--lime)]" : "ring-transparent group-hover:ring-white/30"
                    }`}
                  >
                    <span
                      className="animate-grow absolute inset-x-0 bottom-0 origin-bottom rounded-full bg-[image:var(--blend)]"
                      style={{ height: `${b.totalSen > 0 ? Math.max(pct, 7) : 0}%`, animationDelay: `${i * 45}ms` }}
                    />
                  </span>
                  <span className={`text-[10px] font-semibold ${isNow || selected ? "text-white" : "text-[#8e9ab8]"}`}>{monthName(locale, b.year, b.month, "short").slice(0, 1)}</span>
                </Link>
              );
            })}
          </nav>
          <p className="text-xs text-[#8e9ab8]">{copy.perMonthHint}</p>
        </div>
      </div>
    </section>
  );
}

function Filters({ t, filters, perPage, ledger, href, now }: { t: Dictionary; filters: LedgerFilters; perPage: number; ledger: Ledger; href: ReturnType<typeof makeHref>; now: Date }) {
  const copy = t.payments;
  const hasFilters = Boolean(filters.q || filters.type || filters.from || filters.to);
  const today = malaysiaToday(now);
  const previous = today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
  const presets = [
    { label: copy.presetThisMonth, ...monthRange(today.year, today.month) },
    { label: copy.presetLastMonth, ...monthRange(previous.year, previous.month) },
    { label: copy.presetThisYear, from: `${today.year}-01-01`, to: `${today.year}-12-31` },
    { label: copy.presetAllTime, from: "", to: "" },
  ];

  return (
    <section className="ui-card p-4 sm:p-5">
      <form method="get" action="/payments" className="grid gap-3">
        {filters.type && <input type="hidden" name="type" value={filters.type} />}
        {perPage !== DEFAULT_PER_PAGE && <input type="hidden" name="perPage" value={perPage} />}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented type filter with counts */}
          <nav aria-label="Filter by type" className="grid w-full grid-cols-3 rounded-full bg-[var(--paper)] p-1 lg:flex lg:w-auto">
            {([
              ["", copy.filterAll, copy.filterAll],
              ["MONTHLY_FEE", copy.monthlyFee, copy.monthlyShort],
              ["SPECIAL_COLLECTION", copy.specialCollection, copy.specialShort],
            ] as const).map(([type, label, short]) => {
              const active = filters.type === type;
              const count = type === "" ? ledger.typeCounts.all : ledger.typeCounts[type];
              return (
                <Link
                  key={type || "all"}
                  href={href({ type })}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] sm:px-4 lg:flex-none ${
                    active ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                  <span className={`rounded-full px-1.5 text-[11px] leading-5 tabular-nums ${active ? "bg-[var(--paper)] text-[var(--ink-2)]" : "text-[#aeaeb2]"}`}>{count}</span>
                </Link>
              );
            })}
          </nav>
          <label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-full bg-[var(--paper)] px-4 focus-within:outline focus-within:outline-3 focus-within:outline-[rgba(34,199,242,0.35)] lg:w-80">
            <Search aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-2)]" />
            <input
              defaultValue={filters.q}
              name="q"
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aeaeb2]"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Quick ranges: one tap instead of typing two dates. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.date}>
          {presets.map((p) => {
            const active = p.from === filters.from && p.to === filters.to;
            return (
              <Link
                key={p.label}
                href={href({ from: p.from, to: p.to })}
                aria-current={active ? "true" : undefined}
                className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold transition sm:px-4 ${
                  active ? "bg-[var(--ink)] text-white shadow-[0_3px_0_rgba(0,0,0,.25)]" : "bg-white text-[var(--ink)] shadow-sm ring-1 ring-black/10 hover:bg-[var(--paper)]"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {/* Dates: two half-width pills on phones, side by side on wider screens */}
          {([
            ["from", copy.dateFrom, filters.from],
            ["to", copy.dateTo, filters.to],
          ] as const).map(([name, label, value]) => (
            <label
              key={name}
              className="grid min-w-0 gap-0.5 rounded-2xl bg-[var(--paper)] px-3.5 pb-2 pt-1.5 text-sm focus-within:outline focus-within:outline-3 focus-within:outline-[rgba(34,199,242,0.35)] sm:flex sm:h-11 sm:items-center sm:gap-2 sm:rounded-full sm:py-0 sm:pl-4 sm:pr-2"
            >
              <span className="text-[11px] font-medium leading-4 text-[var(--ink-2)] sm:shrink-0 sm:text-xs">{label}</span>
              <input
                defaultValue={value}
                name={name}
                type="date"
                className="w-full min-w-0 bg-transparent text-[15px] font-medium tabular-nums text-[var(--ink)] outline-none sm:w-[8.5rem] sm:text-sm sm:font-normal"
              />
            </label>
          ))}
          <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <button className="h-11 flex-1 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white hover:bg-black sm:flex-none" type="submit">
              {t.common.apply}
            </button>
            {hasFilters && (
              <Link className="grid h-11 place-items-center rounded-full px-3 text-sm font-medium text-[var(--blue)] hover:bg-black/5" href={href({ q: "", type: "", from: "", to: "" })}>
                {copy.clear}
              </Link>
            )}
          </div>
        </div>
        </div>
      </form>
    </section>
  );
}

function PaymentRow({ p, t, locale, highlight }: { p: LedgerPayment; t: Dictionary; locale: Locale; highlight: boolean }) {
  const copy = t.payments;
  const isMonthly = p.type === "MONTHLY_FEE";
  const tone = TONE[p.type];
  const loc = locale === "ms" ? "ms-MY" : "en-MY";
  const day = dateAt(p.date);
  const dayText = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "UTC" }).format(day);
  const weekday = new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" }).format(day);
  const resident = `/residents/${p.residentId}`;
  const method = copy.methods[p.method as keyof typeof copy.methods] ?? p.method;

  return (
    <li
      className={`ledger-row px-4 py-3.5 transition sm:px-5 ${
        highlight ? "animate-pop bg-[#eef5ff] shadow-[inset_3px_0_0_var(--blue)]" : "hover:bg-[#fafafc]"
      }`}
    >
      <Link
        href={resident}
        tabIndex={-1}
        aria-hidden="true"
        className={`[grid-area:tile] grid size-11 place-items-center rounded-xl font-heading text-sm font-bold tabular-nums transition hover:scale-105 ${tone.tile} ${RAISED}`}
      >
        {p.unit}
      </Link>

      <div className="min-w-0 [grid-area:name]">
        <Link href={resident} className="block truncate font-semibold text-[var(--ink)] hover:text-[var(--blue)]">
          <span className="sr-only">{fill(copy.houseLabel, { unit: p.unit })}: </span>
          {p.name}
        </Link>
      </div>

      <p className="hidden whitespace-nowrap text-sm tabular-nums [grid-area:date] md:block">
        <span className="font-medium text-[var(--ink)]">{dayText}</span>
        <span className="block text-xs text-[var(--ink-2)]">{weekday}</span>
      </p>

      <div className="min-w-0 text-sm [grid-area:for]">
        {isMonthly ? (
          p.months ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <CalendarDays size={13} aria-hidden="true" className={tone.icon} />
              <span className="font-medium text-[var(--ink)]">{coverageLabel(locale, p.months.first, p.months.last)}</span>
              <span className="text-xs text-[var(--ink-2)]">· {p.months.count === 1 ? copy.monthsCountOne : fill(copy.monthsCount, { n: p.months.count })}</span>
            </span>
          ) : (
            <span className="text-[var(--ink-2)]">—</span>
          )
        ) : p.collection ? (
          <Link href={`/special-collections/${p.collection.id}`} className="inline-flex min-w-0 items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--blue)] hover:underline">
            <Sparkles size={13} aria-hidden="true" className={`shrink-0 ${tone.icon}`} />
            <span className="truncate">{p.collection.title}</span>
          </Link>
        ) : (
          <span className="ui-chip bg-[#fff4d6] text-[#8a6300]" title={copy.notRecordedHint}>
            {copy.notRecorded}
          </span>
        )}
      </div>

      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--ink-2)] [grid-area:meta]">
        <span className="md:hidden">
          {weekday} {dayText} ·
        </span>
        <span>{method}</span>
        {p.referenceNo && (
          <>
            <span aria-hidden="true">·</span>
            <span className="min-w-0 break-all">{p.referenceNo}</span>
          </>
        )}
        {p.notes && (
          <span title={p.notes} className="inline-flex text-[#aeaeb2]">
            <StickyNote size={12} aria-label={p.notes} />
          </span>
        )}
        {highlight && <Chip className="bg-[var(--blue)] text-white">{copy.justRecorded}</Chip>}
      </p>

      <p className="justify-self-end whitespace-nowrap font-heading text-base font-bold tabular-nums text-[var(--ink)] [grid-area:amount]">{formatRM(p.amountSen)}</p>

      <div className="justify-self-end [grid-area:proof]">
        {p.uploads.length > 0 ? <FileViewer files={p.uploads} triggerLabel={copy.proof} /> : <span className="text-xs text-[#aeaeb2]">—</span>}
      </div>
    </li>
  );
}

function EmptyState({ t, hasFilters, href }: { t: Dictionary; hasFilters: boolean; href: ReturnType<typeof makeHref> }) {
  const copy = t.payments;
  return (
    <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
      <img
        src={hasFilters ? "/art/no-receipt.webp" : "/art/a3-inbox-clear.webp"}
        alt=""
        width={160}
        height={160}
        className="animate-float size-40 rounded-[32px] object-cover mix-blend-multiply"
      />
      <h2 className="font-heading text-xl font-bold text-[var(--ink)]">{hasFilters ? copy.noMatch : copy.emptyTitle}</h2>
      {!hasFilters && <p className="max-w-sm text-[var(--ink-2)]">{copy.emptyBody}</p>}
      {hasFilters ? (
        <Link href={href({ q: "", type: "", from: "", to: "" })} className="ui-button-secondary mt-1">
          <SearchX size={16} aria-hidden="true" />
          {copy.clearFilters}
        </Link>
      ) : (
        <Link href="/payments/new" className="ui-button-primary mt-1">
          <Plus size={16} aria-hidden="true" />
          {copy.recordPayment}
        </Link>
      )}
    </div>
  );
}

export function PaymentsView({
  t,
  locale,
  ledger,
  filters,
  perPage,
  createdId,
  now,
}: {
  t: Dictionary;
  locale: Locale;
  ledger: Ledger;
  filters: LedgerFilters;
  perPage: number;
  createdId?: string;
  now: Date;
}) {
  const copy = t.payments;
  const href = makeHref(filters, perPage);
  const hasFilters = Boolean(filters.q || filters.type || filters.from || filters.to);

  // Group the page's payments by calendar month; the header shows the whole month's total even when it spans pages.
  const groups: { key: string; year: number; month: number; items: LedgerPayment[] }[] = [];
  for (const p of ledger.payments) {
    const key = p.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(p);
    else groups.push({ key, year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), items: [p] });
  }

  const rangeStart = ledger.totalCount === 0 ? 0 : (ledger.page - 1) * perPage + 1;

  return (
    <>
      <Hero t={t} locale={locale} ledger={ledger} filters={filters} href={href} now={now} />
      <Filters t={t} filters={filters} perPage={perPage} ledger={ledger} href={href} now={now} />

      <section className="ui-card overflow-hidden">
        {ledger.totalCount === 0 ? (
          <EmptyState t={t} hasFilters={hasFilters} href={href} />
        ) : (
          <>
            <div aria-hidden="true" className="ledger-head hidden border-b border-black/5 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)] md:grid">
              <span className="col-span-2">{t.dashboard.resident}</span>
              <span>{copy.date}</span>
              <span>{copy.coverage}</span>
              <span className="text-right">{copy.amount}</span>
              <span className="text-right">{copy.proof}</span>
            </div>
            {groups.map((g, index) => {
              const total = ledger.monthTotals[g.key];
              return (
                <div key={g.key} className={index > 0 ? "border-t border-black/5" : undefined}>
                  <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-[var(--paper)] px-4 py-2 sm:px-5">
                    <h3 className="font-heading text-sm font-bold text-[var(--ink)]">{monthName(locale, g.year, g.month, "long")}</h3>
                    {total && (
                      <p className="text-xs tabular-nums text-[var(--ink-2)]">
                        {total.count === 1 ? copy.paymentCountOne : fill(copy.paymentCount, { n: total.count })} · <b className="font-semibold text-[var(--ink)]">{rm(total.sen)}</b>
                      </p>
                    )}
                  </div>
                  <ul className="divide-y divide-black/5">
                    {g.items.map((p) => (
                      <PaymentRow key={p.id} p={p} t={t} locale={locale} highlight={p.id === createdId} />
                    ))}
                  </ul>
                </div>
              );
            })}
            <TablePagination
              currentPage={ledger.page}
              totalPages={ledger.totalPages}
              totalCount={ledger.totalCount}
              perPage={perPage}
              rangeStart={rangeStart}
              rangeEnd={Math.min(ledger.page * perPage, ledger.totalCount)}
              perPageOptions={PER_PAGE_OPTIONS}
              pageLink={(p) => href({ page: p })}
            />
          </>
        )}
      </section>
    </>
  );
}
