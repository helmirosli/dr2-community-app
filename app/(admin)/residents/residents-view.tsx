import Link from "next/link";
import { LayoutGrid, List, MessageCircle, Phone, Plus, Search, SearchX } from "lucide-react";

import { ProgressRing } from "@/app/components/progress-ring";
import { StatusPill, stateStyles, TILE_RAISED } from "@/app/components/status";
import { TablePagination } from "@/app/components/table-pagination";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { telHref, whatsappHref } from "@/lib/phone";
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  STATUSES,
  type Directory,
  type DirectoryFilters,
  type DirectoryResident,
  type ResidentStatus,
} from "@/lib/reports/residents-directory";
import { firstName, monthName, type MonthState } from "@/lib/status";
import { fill } from "@/lib/text";

type View = "list" | "map";


const STATUS_STYLE: Record<ResidentStatus, { chip: string; bar: string; dot: string }> = {
  ACTIVE: { chip: "bg-[#e2f7e1] text-[#1c7a33]", bar: "bg-[var(--leaf)]", dot: "bg-[var(--leaf)]" },
  EXEMPT: { chip: "bg-[#ddf5fd] text-[#0b6e8e]", bar: "bg-[var(--cyan)]", dot: "bg-[var(--cyan)]" },
  FOR_SALE: { chip: "bg-[#fff4d6] text-[#8a6300]", bar: "bg-[var(--amber)]", dot: "bg-[var(--amber)]" },
  MOVED_OUT: { chip: "bg-[#eef0f4] text-[#5d6779]", bar: "bg-[var(--hold)]", dot: "bg-[var(--hold)]" },
};

export function statusLabel(t: Dictionary, s: ResidentStatus) {
  return s === "FOR_SALE" ? t.residents.forSale : s === "MOVED_OUT" ? t.residents.movedOut : s === "EXEMPT" ? t.residents.exempt : t.residents.active;
}

type Over = Partial<Record<"q" | "status" | "view" | "page", string | number>>;

/** Builds /residents URLs from the current filters, with some overridden. An empty string removes that filter. */
function makeHref(filters: DirectoryFilters, view: View, perPage: number) {
  return (over: Over = {}) => {
    const merged = { q: filters.q, status: filters.status, view: view === "map" ? "map" : "", ...over };
    const sp = new URLSearchParams();
    for (const key of ["q", "status", "view"] as const) if (merged[key]) sp.set(key, String(merged[key]));
    if (perPage !== DEFAULT_PER_PAGE) sp.set("perPage", String(perPage));
    if (over.page && over.page !== 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return qs ? `/residents?${qs}` : "/residents";
  };
}

/** Dark overview: how many houses and in what state, plus how this month's collection is going. */
function Hero({ t, locale, dir, filters, href }: { t: Dictionary; locale: Locale; dir: Directory; filters: DirectoryFilters; href: ReturnType<typeof makeHref> }) {
  const c = t.residents;
  const counts = dir.houseCounts;
  const pct = dir.month.total > 0 ? Math.round((dir.month.paid / dir.month.total) * 100) : 0;
  const month = monthName(locale, dir.month.year, dir.month.month, "long");
  const pills = (["pending", "partial", "unpaid"] as const).filter((s) => (dir.month.counts[s] ?? 0) > 0);

  return (
    <section aria-label={c.housesHeading} data-tour="houses-hero" className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10 sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.26),transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-8 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(142,229,63,.18),transparent_70%)]" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid content-start gap-4">
          <span className="text-blend font-heading text-sm font-semibold">{c.housesHeading}</span>
          <p className="flex items-baseline gap-3 font-heading font-extrabold leading-none tracking-tight tabular-nums">
            <span className="text-blend text-[clamp(2.5rem,6vw,3.75rem)]">{counts.all}</span>
            <span className="text-lg font-semibold text-white/40">{c.housesWord}</span>
          </p>

          {counts.all > 0 && (
            <div className="grid max-w-lg gap-3">
              <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                {STATUSES.map((s) => (
                  <span key={s} className={STATUS_STYLE[s].bar} style={{ width: `${(counts[s] / counts.all) * 100}%` }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                {STATUSES.map((s) => {
                  const active = filters.status === s;
                  return (
                    <Link
                      key={s}
                      href={href({ status: active ? "" : s, page: 1 })}
                      aria-current={active ? "true" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-[#c7cedd] transition hover:bg-white/10 ${active ? "bg-white/15 ring-1 ring-white/40" : ""}`}
                    >
                      <span className={`size-2 rounded-full ${STATUS_STYLE[s].dot}`} aria-hidden="true" />
                      {statusLabel(t, s)} <b className="font-semibold tabular-nums text-white">{counts[s]}</b>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {dir.month.total > 0 && (
          <div className="flex items-center gap-5 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:pr-6">
            <ProgressRing value={dir.month.paid} max={dir.month.total} size={88} stroke={6} track="rgba(255,255,255,.12)">
              <span className="font-heading text-lg font-bold tabular-nums">{pct}%</span>
            </ProgressRing>
            <div className="grid gap-1.5">
              <p className="font-heading text-base font-bold leading-tight">{fill(c.paidOfTotal, { paid: dir.month.paid, total: dir.month.total })}</p>
              <p className="text-sm text-[#a1a1a6]">{fill(c.paidIn, { month })}</p>
              {pills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pills.map((s) => (
                    <span key={s} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${stateStyles[s].tileDark}`}>
                      {t.states[s]} {dir.month.counts[s]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Controls({ t, dir, filters, view, perPage, href }: { t: Dictionary; dir: Directory; filters: DirectoryFilters; view: View; perPage: number; href: ReturnType<typeof makeHref> }) {
  const c = t.residents;
  const tabs: ("" | ResidentStatus)[] = ["", ...STATUSES];
  const hasFilters = Boolean(filters.q || filters.status);

  return (
    <section data-tour="houses-filters" className="ui-card grid gap-3 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t.common.status} className="flex flex-wrap gap-2">
          {tabs.map((s) => {
            const active = filters.status === s;
            const count = s === "" ? dir.tabCounts.all : dir.tabCounts[s];
            return (
              <Link
                key={s || "all"}
                href={href({ status: s, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition sm:px-4 ${
                  active ? "bg-[var(--ink)] text-white shadow-[0_3px_0_rgba(0,0,0,.25)]" : "bg-white text-[var(--ink)] shadow-sm ring-1 ring-black/10 hover:bg-[var(--paper)]"
                }`}
              >
                {s === "" ? c.all : statusLabel(t, s)}
                <span className={`tabular-nums text-xs ${active ? "text-white/70" : "text-[var(--ink-2)]"}`}>{count}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <form method="get" action="/residents" className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--paper)] pl-4 pr-1 focus-within:outline focus-within:outline-3 focus-within:outline-[rgba(34,199,242,0.35)] lg:w-72 lg:flex-none">
            {filters.status && <input type="hidden" name="status" value={filters.status} />}
            {view === "map" && <input type="hidden" name="view" value="map" />}
            {perPage !== DEFAULT_PER_PAGE && <input type="hidden" name="perPage" value={perPage} />}
            <Search size={16} aria-hidden="true" className="shrink-0 text-[var(--ink-2)]" />
            <input defaultValue={filters.q} name="q" placeholder={c.searchPlaceholder} aria-label={c.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aeaeb2]" />
            {hasFilters && (
              <Link href={href({ q: "", status: "", page: 1 })} aria-label={c.clearFilters} className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-2)] hover:bg-black/5">
                <SearchX size={15} aria-hidden="true" />
              </Link>
            )}
          </form>

          <div data-tour="houses-view" className="grid h-11 shrink-0 grid-cols-2 rounded-full bg-[var(--paper)] p-1 text-[13px] font-semibold" role="group">
            {([
              ["map", t.today.map, LayoutGrid],
              ["list", t.today.list, List],
            ] as const).map(([v, label, Icon]) => (
              <Link
                key={v}
                href={href({ view: v === "map" ? "map" : "", page: 1 })}
                aria-current={view === v ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-full px-3 transition ${view === v ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)] hover:text-[var(--ink)]"}`}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactButtons({ r, t }: { r: DirectoryResident; t: Dictionary }) {
  const tel = telHref(r.phone);
  const wa = whatsappHref(r.phone);
  if (!tel && !wa) return null;
  return (
    <>
      {tel && (
        <a
          href={tel}
          aria-label={`${t.residents.call}: ${r.name}`}
          title={t.residents.call}
          className="grid size-10 place-items-center rounded-full bg-[var(--paper)] text-[var(--ink-2)] ring-1 ring-black/5 transition hover:bg-white hover:text-[var(--ink)] hover:shadow-sm active:scale-95"
        >
          <Phone size={16} aria-hidden="true" />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.residents.whatsapp}: ${r.name}`}
          title={t.residents.whatsapp}
          className="grid size-10 place-items-center rounded-full bg-[#e7f9ee] text-[#128c4a] transition hover:brightness-95 active:scale-95"
        >
          <MessageCircle size={16} aria-hidden="true" />
        </a>
      )}
    </>
  );
}

function ResidentRow({ r, t }: { r: DirectoryResident; t: Dictionary }) {
  const c = t.residents;
  return (
    <li className="resident-row relative px-4 py-3.5 transition hover:bg-[#fafafc] sm:px-5">
      <span aria-hidden="true" className={`grid size-11 place-items-center rounded-xl font-heading text-sm font-bold tabular-nums [grid-area:tile] ${stateStyles[r.state].tile} ${TILE_RAISED}`}>
        {r.unit}
      </span>

      <div className="min-w-0 [grid-area:name]">
        <Link href={`/residents/${r.id}`} className="block truncate font-semibold text-[var(--ink)] after:absolute after:inset-0 hover:text-[var(--blue)]">
          <span className="sr-only">{fill(c.openHouse, { unit: r.unit })}: </span>
          {r.name}
        </Link>
        <p className="truncate text-xs text-[var(--ink-2)]">
          {r.phone ?? c.noPhone}
          <span className="hidden lg:inline"> · {fill(c.recordsLine, { payments: r.payments, months: r.months })}</span>
        </p>
      </div>

      {/* Phones: chips on their own line. md+: each chip becomes its own column. */}
      <div className="flex flex-wrap items-center gap-1.5 [grid-area:meta] md:contents">
        <span className={`ui-chip w-fit md:[grid-area:status] ${STATUS_STYLE[r.status].chip}`}>{statusLabel(t, r.status)}</span>
        {r.status === "ACTIVE" && (
          <span className="flex items-center md:[grid-area:month]">
            <StatusPill state={r.state} label={t.states[r.state]} />
          </span>
        )}
        <span className="text-xs text-[var(--ink-2)] md:[grid-area:block]">{r.block ? fill(c.blockLabel, { b: r.block }) : "—"}</span>
      </div>

      <div className="relative z-10 flex items-center justify-end gap-1.5 [grid-area:actions]">
        <ContactButtons r={r} t={t} />
      </div>
    </li>
  );
}

function Legend({ t, residents }: { t: Dictionary; residents: DirectoryResident[] }) {
  const states: MonthState[] = ["paid", "pending", "partial", "unpaid", "hold"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {states.map((s) => {
        const n = residents.filter((r) => r.state === s || (s === "paid" && r.state === "ahead")).length;
        return n > 0 ? <StatusPill key={s} state={s} label={`${t.states[s]} · ${n}`} /> : null;
      })}
    </div>
  );
}

/** Every house as a tile, grouped by block and coloured by where it stands this month. */
function MapView({ t, residents }: { t: Dictionary; residents: DirectoryResident[] }) {
  const c = t.residents;
  const groups = new Map<string, DirectoryResident[]>();
  for (const r of residents) {
    const key = r.block ?? "";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const blocks = [...groups.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, undefined, { numeric: true })));
  let tileIndex = 0;

  return (
    <section data-tour="houses-list" className="ui-card grid gap-7 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend t={t} residents={residents} />
        <p className="text-xs text-[var(--ink-2)]">{c.tapHint}</p>
      </div>
      {blocks.map((block) => {
        const list = groups.get(block) ?? [];
        const active = list.filter((r) => r.status === "ACTIVE");
        const paid = active.filter((r) => r.state === "paid" || r.state === "ahead").length;
        return (
          <div key={block || "none"} className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-heading text-lg font-bold">{block ? fill(c.blockLabel, { b: block }) : c.noBlock}</h2>
              <p className="text-xs tabular-nums text-[var(--ink-2)]">
                {fill(c.housesInBlock, { n: list.length })}
                {active.length > 0 && <> · {fill(c.paidOfTotal, { paid, total: active.length })}</>}
              </p>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2.5">
              {list.map((r) => (
                <li key={r.id} className="animate-pop" style={{ animationDelay: `${Math.min(tileIndex++, 30) * 25}ms` }}>
                  <Link
                    href={`/residents/${r.id}`}
                    title={`${r.unit}: ${r.name} · ${t.states[r.state]}`}
                    aria-label={`${fill(c.openHouse, { unit: r.unit })}: ${r.name}`}
                    className={`grid gap-0.5 rounded-2xl px-2 py-3 text-center transition hover:-translate-y-0.5 active:translate-y-[1px] ${stateStyles[r.state].tile} ${TILE_RAISED}`}
                  >
                    <span className="font-heading text-xl font-bold tabular-nums">{r.unit}</span>
                    <span className="truncate text-[11px] font-medium opacity-80">{firstName(r.name)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function EmptyState({ t, hasFilters, href }: { t: Dictionary; hasFilters: boolean; href: ReturnType<typeof makeHref> }) {
  const c = t.residents;
  return (
    <section className="ui-card grid justify-items-center gap-3 px-6 py-14 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
      <img
        src={hasFilters ? "/art/no-receipt.webp" : "/art/a3-inbox-clear.webp"}
        alt=""
        width={160}
        height={160}
        className="animate-float size-40 rounded-[32px] object-cover mix-blend-multiply"
      />
      <h2 className="font-heading text-xl font-bold text-[var(--ink)]">{hasFilters ? c.noMatch : c.emptyTitle}</h2>
      {!hasFilters && <p className="max-w-sm text-[var(--ink-2)]">{c.emptyBody}</p>}
      {hasFilters ? (
        <Link href={href({ q: "", status: "", page: 1 })} className="ui-button-secondary mt-1">
          <SearchX size={16} aria-hidden="true" />
          {c.clearFilters}
        </Link>
      ) : (
        <Link href="/residents/new" className="ui-button-primary mt-1">
          <Plus size={16} aria-hidden="true" />
          {c.addResident}
        </Link>
      )}
    </section>
  );
}

export function ResidentsView({
  t,
  locale,
  dir,
  filters,
  view,
  perPage,
}: {
  t: Dictionary;
  locale: Locale;
  dir: Directory;
  filters: DirectoryFilters;
  view: View;
  perPage: number;
}) {
  const href = makeHref(filters, view, perPage);
  const hasFilters = Boolean(filters.q || filters.status);
  const c = t.residents;

  return (
    <>
      <Hero t={t} locale={locale} dir={dir} filters={filters} href={href} />
      <Controls t={t} dir={dir} filters={filters} view={view} perPage={perPage} href={href} />

      {dir.totalCount === 0 ? (
        <EmptyState t={t} hasFilters={hasFilters} href={href} />
      ) : view === "map" ? (
        <MapView t={t} residents={dir.residents} />
      ) : (
        <section data-tour="houses-list" className="ui-card overflow-hidden">
          <div aria-hidden="true" className="resident-head hidden border-b border-black/5 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)] md:grid">
            <span className="col-span-2">{c.residentName}</span>
            <span>{c.block}</span>
            <span>{t.common.status}</span>
            <span>{t.house.thisMonth}</span>
            <span />
          </div>
          <ul className="divide-y divide-black/5">
            {dir.residents.map((r) => (
              <ResidentRow key={r.id} r={r} t={t} />
            ))}
          </ul>
          <TablePagination
            currentPage={dir.page}
            totalPages={dir.totalPages}
            totalCount={dir.totalCount}
            perPage={perPage}
            rangeStart={(dir.page - 1) * perPage + 1}
            rangeEnd={Math.min(dir.page * perPage, dir.totalCount)}
            perPageOptions={PER_PAGE_OPTIONS}
            pageLink={(p) => href({ page: p })}
          />
        </section>
      )}
    </>
  );
}
