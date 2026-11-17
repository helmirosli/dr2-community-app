import Link from "next/link";
import { ChevronDown, Pencil, Plus } from "lucide-react";

import { ProgressRing } from "@/app/components/progress-ring";
import { CollectionHero, dueInfo } from "./collection-hero";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { formatRMShort } from "@/lib/money";
import type { CollectionOverview } from "@/lib/reports/collections-overview";
import { fill } from "@/lib/text";



const VISIBLE_CLOSED = 5;

/** A draft or closed collection: one compact row. The title links to the collection; Edit sits above that link. */
function CompactRow({ c, t, locale, now }: { c: CollectionOverview; t: Dictionary; locale: Locale; now: Date }) {
  const copy = t.collections;
  const due = dueInfo(c, now, copy, locale, false);
  const isClosed = c.status === "CLOSED";

  return (
    <li className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-5 py-4 transition hover:bg-[#fafafc] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
      <ProgressRing value={c.paidSen} max={c.dueSen} size={44} stroke={7}>
        <span className="font-heading text-[10px] font-bold tabular-nums">{c.pct}%</span>
      </ProgressRing>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/special-collections/${c.id}`} className="min-w-0 truncate font-heading text-base font-bold text-[var(--ink)] after:absolute after:inset-0">
            {c.title}
          </Link>
          <span className="ui-chip bg-[#eef0f4] text-[#5d6779]">{isClosed ? copy.closed : copy.draft}</span>
          {isClosed && c.outstandingSen > 0 && (
            <span className="money ui-chip bg-[#fff4d6] tabular-nums text-[#8a6300]">{fill(copy.stillOwed, { amount: formatRMShort(c.outstandingSen) })}</span>
          )}
          {c.waitingCount > 0 && <span className="ui-chip bg-[#ddf5fd] text-[#0b6e8e]">{fill(copy.waiting, { n: c.waitingCount })}</span>}
        </div>
        <p className="mt-0.5 text-xs text-[var(--ink-2)]">
          {due.text} · {fill(copy.perHouse, { amount: formatRMShort(c.amountPerResident) })} · {fill(copy.housesPaid, { paid: c.paidCount, total: c.houses.length })}
        </p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:contents">
        <div className="flex items-baseline gap-2 sm:block sm:text-right">
          <p className="money font-heading font-bold tabular-nums text-[var(--ink)]">{formatRMShort(c.paidSen)}</p>
          <p className="money text-xs text-[var(--ink-2)]">{fill(copy.ofTotal, { total: formatRMShort(c.dueSen) })}</p>
        </div>
        <Link
          href={`/special-collections/${c.id}/edit`}
          aria-label={`${t.common.edit} ${c.title}`}
          className="relative z-10 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--blue)] hover:bg-[var(--paper)]"
        >
          <Pencil size={14} aria-hidden="true" />
          {t.common.edit}
        </Link>
      </div>
    </li>
  );
}

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="ui-section-title">
        {title}
        <span className="ml-2 font-sans text-sm font-normal text-[var(--ink-2)]">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function RowList({ items, t, locale, now }: { items: CollectionOverview[]; t: Dictionary; locale: Locale; now: Date }) {
  const visible = items.slice(0, VISIBLE_CLOSED);
  const rest = items.slice(VISIBLE_CLOSED);
  return (
    <ul className="ui-card divide-y divide-black/5 overflow-hidden">
      {visible.map((c) => (
        <CompactRow key={c.id} c={c} t={t} locale={locale} now={now} />
      ))}
      {rest.length > 0 && (
        <li>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-[var(--blue)] hover:bg-[#fafafc] [&::-webkit-details-marker]:hidden">
              {fill(t.collections.showMore, { n: rest.length })}
              <ChevronDown size={14} aria-hidden="true" className="transition group-open:rotate-180" />
            </summary>
            <ul className="divide-y divide-black/5 border-t border-black/5">
              {rest.map((c) => (
                <CompactRow key={c.id} c={c} t={t} locale={locale} now={now} />
              ))}
            </ul>
          </details>
        </li>
      )}
    </ul>
  );
}

/** Soonest due date first; collections without one go last. Stable, so ties stay newest first. */
function byDueDate(a: CollectionOverview, b: CollectionOverview) {
  const x = a.dueDate?.getTime();
  const y = b.dueDate?.getTime();
  if (x === undefined && y === undefined) return 0;
  if (x === undefined) return 1;
  if (y === undefined) return -1;
  return x - y;
}

export function CollectionsView({ collections, t, locale, now }: { collections: CollectionOverview[]; t: Dictionary; locale: Locale; now: Date }) {
  const copy = t.collections;

  if (collections.length === 0) {
    return (
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] text-white ring-1 ring-white/10">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 -z-10 w-full overflow-hidden opacity-30 [mask-image:linear-gradient(to_right,transparent,#000_45%)] sm:w-3/5 sm:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
          <img src="/art/a6-raya.webp" alt="" className="animate-drift h-full w-full object-cover object-right" />
        </div>
        <div className="grid min-h-72 content-center justify-items-start gap-3 p-6 sm:p-10 lg:max-w-[50%]">
          <h2 className="font-heading text-3xl font-bold tracking-tight">{copy.emptyTitle}</h2>
          <p className="max-w-md text-[#a1a1a6]">{copy.emptyBody}</p>
          <Link
            href="/special-collections/new"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--lime)] px-5 font-heading font-semibold text-[#06210b] shadow-[0_3px_0_#4d9a12] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#4d9a12]"
          >
            <Plus size={16} aria-hidden="true" />
            {copy.newCollection}
          </Link>
        </div>
      </section>
    );
  }

  const active = collections.filter((c) => c.status === "ACTIVE").sort(byDueDate);
  const drafts = collections.filter((c) => c.status === "DRAFT");
  const closed = collections.filter((c) => c.status === "CLOSED");

  return (
    <>
      <Section id="collections-active" title={copy.activeHeading} count={active.length}>
        {active.length > 0 ? (
          <div className="grid gap-5">
            {active.map((c) => (
              <CollectionHero key={c.id} c={c} t={t} locale={locale} now={now} variant="list" />
            ))}
          </div>
        ) : (
          <div className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10">
            <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.2),transparent_70%)]" />
            <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 w-full overflow-hidden opacity-25 grayscale [mask-image:linear-gradient(to_right,transparent,#000_45%)] sm:w-3/5 sm:opacity-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
              <img src="/art/a6-raya.webp" alt="" className="h-full w-full object-cover object-right" />
            </div>
            <div className="grid content-center justify-items-start gap-3 p-6 sm:p-8 lg:max-w-[60%]">
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{copy.nothingActive}</h3>
              <p className="max-w-md text-[#a1a1a6]">{copy.emptyBody}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/special-collections/new"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--lime)] px-5 font-heading font-semibold text-[#06210b] shadow-[0_3px_0_#4d9a12] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#4d9a12]"
                >
                  <Plus size={16} aria-hidden="true" />
                  {copy.newCollection}
                </Link>
                {closed[0] && (
                  <Link href={`/special-collections/${closed[0].id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                    {copy.lastCollection}: {closed[0].title}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>

      {drafts.length > 0 && (
        <Section id="collections-drafts" title={copy.draftsHeading} count={drafts.length}>
          <RowList items={drafts} t={t} locale={locale} now={now} />
        </Section>
      )}

      {closed.length > 0 && (
        <Section id="collections-closed" title={copy.closedHeading} count={closed.length}>
          <RowList items={closed} t={t} locale={locale} now={now} />
        </Section>
      )}
    </>
  );
}
