import Link from "next/link";
import { ChevronLeft, MessageCircle, Phone, Search, SearchX, X } from "lucide-react";

import { TILE_RAISED, stateStyles } from "@/app/components/status";
import { TablePagination } from "@/app/components/table-pagination";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { formatRM } from "@/lib/money";
import { telHref, whatsappHref } from "@/lib/phone";
import type { CollectionHouse, CollectionOverview } from "@/lib/reports/collections-overview";
import { fill } from "@/lib/text";
import { CollectionHero } from "./collection-hero";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

export type HouseFilter = "all" | "paid" | "outstanding";
export type HouseParams = { filter: HouseFilter; search: string; page: number; perPage: number };

export function parseHouseParams(params: { page?: string; perPage?: string; filter?: string; search?: string }): HouseParams {
  const perPage = parseInt(params.perPage ?? "", 10);
  return {
    filter: params.filter === "paid" || params.filter === "outstanding" ? params.filter : "all",
    search: params.search?.trim() ?? "",
    page: Math.max(1, parseInt(params.page ?? "1", 10) || 1),
    perPage: PAGE_SIZE_OPTIONS.includes(perPage) ? perPage : DEFAULT_PAGE_SIZE,
  };
}

const isPaid = (h: CollectionHouse) => h.state === "paid";

function HouseRow({ h, t }: { h: CollectionHouse; t: Dictionary }) {
  const copy = t.collections;
  const balance = Math.max(0, h.dueSen - h.paidSen);
  const tel = telHref(h.phone);
  const wa = whatsappHref(h.phone);
  const chip =
    h.state === "paid"
      ? { text: t.states.paid, cls: "bg-[#e2f7e1] text-[#1c7a33]" }
      : h.state === "pending"
        ? { text: t.states.pending, cls: "bg-[#ddf5fd] text-[#0b6e8e]" }
        : h.state === "partial"
          ? { text: fill(copy.balanceLeft, { amount: formatRM(balance) }), cls: "bg-[#fff4d6] text-[#8a6300]" }
          : h.state === "upcoming"
            ? { text: t.states.upcoming, cls: "bg-[#eef0f4] text-[#5d6779]" }
            : { text: fill(copy.balanceLeft, { amount: formatRM(balance) }), cls: "bg-[#ffe6e0] text-[#c2341a]" };

  return (
    <li className="collection-row relative px-4 py-3.5 transition hover:bg-[#fafafc] sm:px-5">
      <span aria-hidden="true" className={`grid size-11 place-items-center rounded-xl font-heading text-sm font-bold tabular-nums [grid-area:tile] ${stateStyles[h.state].tile} ${TILE_RAISED}`}>
        {h.unit}
      </span>

      <div className="min-w-0 [grid-area:name]">
        <Link href={`/residents/${h.residentId}`} className="block truncate font-semibold text-[var(--ink)] after:absolute after:inset-0 hover:text-[var(--blue)]">
          {h.name}
        </Link>
        {h.phone && <p className="truncate text-xs text-[var(--ink-2)]">{h.phone}</p>}
      </div>

      {/* Phones: status and amounts on their own line. md+: each becomes its own column. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-2)] [grid-area:meta] md:contents">
        <span className={`ui-chip w-fit tabular-nums md:[grid-area:status] ${chip.cls}`}>{chip.text}</span>
        <span className="tabular-nums md:text-sm md:[grid-area:due]">
          <span className="md:hidden">{copy.billed} </span>
          {formatRM(h.dueSen)}
        </span>
        <span className="tabular-nums md:text-sm md:[grid-area:paid]">
          <span className="md:hidden">{copy.paidColumn} </span>
          <span className="font-semibold text-[var(--ink)]">{formatRM(h.paidSen)}</span>
          {h.recordedSen !== h.paidSen && (
            <span className="block text-[11px] font-medium text-[#8a6300]" title={copy.recordSaysHint}>
              {fill(copy.recordSays, { amount: formatRM(h.recordedSen) })}
            </span>
          )}
        </span>
      </div>

      {/* Calling is for chasing, so only houses that still owe get the buttons. */}
      <div className="relative z-10 flex items-center justify-end gap-1.5 [grid-area:actions]">
        {!isPaid(h) && tel && (
          <a
            href={tel}
            aria-label={`${t.residents.call}: ${h.name}`}
            title={t.residents.call}
            className="grid size-10 place-items-center rounded-full bg-[var(--paper)] text-[var(--ink-2)] ring-1 ring-black/5 transition hover:bg-white hover:text-[var(--ink)] hover:shadow-sm active:scale-95"
          >
            <Phone size={16} aria-hidden="true" />
          </a>
        )}
        {!isPaid(h) && wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t.residents.whatsapp}: ${h.name}`}
            title={t.residents.whatsapp}
            className="grid size-10 place-items-center rounded-full bg-[#e7f9ee] text-[#128c4a] transition hover:brightness-95 active:scale-95"
          >
            <MessageCircle size={16} aria-hidden="true" />
          </a>
        )}
      </div>
    </li>
  );
}

export function CollectionDetailView({
  t,
  locale,
  c,
  params,
  now,
}: {
  t: Dictionary;
  locale: Locale;
  c: CollectionOverview;
  params: HouseParams;
  now: Date;
}) {
  const copy = t.collections;
  const base = `/special-collections/${c.id}`;
  const href = (over: Partial<{ filter: string; search: string; page: number }> = {}) => {
    const merged = { filter: params.filter, search: params.search, ...over };
    const sp = new URLSearchParams();
    if (merged.filter && merged.filter !== "all") sp.set("filter", merged.filter);
    if (merged.search) sp.set("search", merged.search);
    if (params.perPage !== DEFAULT_PAGE_SIZE) sp.set("perPage", String(params.perPage));
    if (over.page && over.page !== 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const needle = params.search.toLowerCase();
  const filtered = c.houses.filter((h) => {
    if (params.filter === "paid" && !isPaid(h)) return false;
    if (params.filter === "outstanding" && isPaid(h)) return false;
    return !needle || h.unit.toLowerCase().includes(needle) || h.name.toLowerCase().includes(needle);
  });
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.perPage));
  const page = Math.min(params.page, totalPages);
  const rows = filtered.slice((page - 1) * params.perPage, page * params.perPage);

  const tabs = [
    { key: "all" as const, label: t.residents.all, count: c.houses.length },
    { key: "paid" as const, label: t.states.paid, count: c.paidCount },
    { key: "outstanding" as const, label: copy.outstandingTab, count: c.houses.length - c.paidCount },
  ];

  return (
    <>
      <Link href="/special-collections" className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline">
        <ChevronLeft size={16} aria-hidden="true" />
        {copy.backToCollections}
      </Link>

      <CollectionHero c={c} t={t} locale={locale} now={now} variant="detail" />

      <section className="ui-card overflow-hidden" aria-labelledby="households-heading">
        <div className="grid gap-4 border-b border-black/5 px-4 pb-4 pt-5 sm:px-5">
          <h2 id="households-heading" className="ui-section-title">
            {copy.householdsHeading}
            <span className="ml-2 font-sans text-sm font-normal text-[var(--ink-2)]">{fill(copy.householdsTotal, { n: c.houses.length })}</span>
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label={copy.householdsHeading} className="grid grid-cols-3 rounded-full bg-[var(--paper)] p-1 sm:inline-grid sm:w-auto">
              {tabs.map((tab) => {
                const active = params.filter === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={href({ filter: tab.key, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] sm:px-4 ${
                      active ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 text-[11px] leading-5 tabular-nums ${
                        active
                          ? tab.key === "paid"
                            ? "bg-[#e2f7e1] text-[#1c7a33]"
                            : tab.key === "outstanding"
                              ? "bg-[#fff4d6] text-[#8a6300]"
                              : "bg-[var(--paper)] text-[var(--ink-2)]"
                          : "text-[#aeaeb2]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <form method="GET" action={base} className="flex h-11 items-center gap-2 rounded-full bg-[var(--paper)] pl-4 pr-1.5 focus-within:outline focus-within:outline-3 focus-within:outline-[rgba(34,199,242,0.35)] sm:w-72">
              {params.filter !== "all" && <input type="hidden" name="filter" value={params.filter} />}
              {params.perPage !== DEFAULT_PAGE_SIZE && <input type="hidden" name="perPage" value={params.perPage} />}
              <Search aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-2)]" />
              <input name="search" defaultValue={params.search} placeholder={copy.searchHouses} aria-label={copy.searchHouses} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aeaeb2]" />
              {params.search && (
                <Link href={href({ search: "", page: 1 })} aria-label={copy.clearSearch} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink-2)] hover:bg-black/5">
                  <X size={14} aria-hidden="true" />
                </Link>
              )}
            </form>
          </div>
        </div>

        {c.houses.length === 0 ? (
          <p className="ui-empty">{copy.noAssigned}</p>
        ) : rows.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
            <SearchX size={28} aria-hidden="true" className="text-[var(--ink-2)]" />
            <p className="text-[var(--ink-2)]">{params.search ? fill(copy.noResultsFor, { q: params.search }) : copy.noHousesMatch}</p>
            <Link href={href({ filter: "all", search: "", page: 1 })} className="ui-button-secondary">
              {t.reports.clearFilters}
            </Link>
          </div>
        ) : (
          <>
            <div aria-hidden="true" className="collection-head hidden border-b border-black/5 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)] md:grid">
              <span className="col-span-2">{copy.houseColumn}</span>
              <span>{copy.billed}</span>
              <span>{copy.paidColumn}</span>
              <span>{copy.statusColumn}</span>
              <span />
            </div>
            <ul className="divide-y divide-black/5">
              {rows.map((h) => (
                <HouseRow key={h.residentId} h={h} t={t} />
              ))}
            </ul>
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              perPage={params.perPage}
              rangeStart={(page - 1) * params.perPage + 1}
              rangeEnd={Math.min(page * params.perPage, totalCount)}
              perPageOptions={PAGE_SIZE_OPTIONS}
              pageLink={(p) => href({ page: p })}
            />
          </>
        )}
      </section>
    </>
  );
}
