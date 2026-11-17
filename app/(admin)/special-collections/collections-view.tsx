import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, CircleAlert, Clock, Pencil, Plus, Sparkles } from "lucide-react";

import { ProgressRing } from "@/app/components/progress-ring";
import { HouseTile, stateStyles } from "@/app/components/status";
import { daysUntil, formatDate } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { formatRMShort } from "@/lib/money";
import type { CollectionOverview } from "@/lib/reports/collections-overview";
import { fill } from "@/lib/text";

type Copy = Dictionary["collections"];



/** Raised, button-like edge for house tiles on the dark card. */
const RAISED_DARK = "shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_3px_0_rgba(0,0,0,.4)]";

const DUE_TONE = {
  none: "bg-white/10 text-[#c7cedd]",
  ok: "bg-white/10 text-[#c7cedd]",
  soon: "bg-[#3a3010] text-[#f5b400]",
  late: "bg-[#3d1a16] text-[#ff8a6e]",
} as const;

const FIREFLIES = [
  { left: "34%", top: "78%", delay: "0s", color: "bg-[var(--lime)]" },
  { left: "58%", top: "70%", delay: "1.4s", color: "bg-[var(--cyan)]" },
  { left: "46%", top: "86%", delay: "2.6s", color: "bg-[var(--lime)]" },
  { left: "80%", top: "82%", delay: "3.5s", color: "bg-[var(--cyan)]" },
];

const VISIBLE_CLOSED = 5;

/** "Due 31 Dec 2026 · in 44 days" plus how urgent it is. Countdown only while money is still owed. */
function dueInfo(c: CollectionOverview, now: Date, copy: Copy, locale: Locale, countdown: boolean) {
  if (!c.dueDate) return { text: copy.noDueDate, tone: "none" as const };
  const date = fill(copy.dueOn, { date: formatDate(c.dueDate, locale) });
  if (!countdown || c.outstandingSen === 0) return { text: date, tone: "none" as const };
  const days = daysUntil(c.dueDate, now);
  const when =
    days < 0
      ? days === -1
        ? copy.overdueOne
        : fill(copy.overdue, { n: -days })
      : days === 0
        ? copy.dueToday
        : days === 1
          ? copy.dueTomorrow
          : fill(copy.dueIn, { n: days });
  return { text: `${date} · ${when}`, tone: days < 0 ? ("late" as const) : days <= 7 ? ("soon" as const) : ("ok" as const) };
}

/** An active collection: the big dark card, one tile per house, coloured by who has paid. */
function ActiveCard({ c, t, locale, now }: { c: CollectionOverview; t: Dictionary; locale: Locale; now: Date }) {
  const copy = t.collections;
  const due = dueInfo(c, now, copy, locale, true);
  const legend = (["paid", "partial", "pending", "unpaid"] as const)
    .map((s) => ({ s, n: c.houses.filter((h) => h.state === s).length }))
    .filter((x) => x.n > 0);

  return (
    <article className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10">
      {/* Raya guardhouse art fading into the navy; drifts slowly with a few fireflies (all off under reduced motion). */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 w-full overflow-hidden opacity-30 [mask-image:linear-gradient(to_right,transparent,#000_45%)] sm:w-3/5 sm:opacity-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
        <img src="/art/a6-raya.webp" alt="" className="animate-drift h-full w-full object-cover object-right" />
        {FIREFLIES.map((f) => (
          <span
            key={f.left}
            className={`animate-rise absolute size-1.5 rounded-full opacity-0 shadow-[0_0_8px_2px_currentColor] ${f.color}`}
            style={{ left: f.left, top: f.top, animationDelay: f.delay }}
          />
        ))}
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:max-w-[70%]">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a2a] px-2.5 py-1 text-[var(--lime)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--lime)] motion-reduce:animate-none" aria-hidden="true" />
            {copy.active}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${DUE_TONE[due.tone]}`}>
            <CalendarDays size={13} aria-hidden="true" />
            {due.text}
          </span>
          {c.waitingCount > 0 && (
            <Link href="/review" className="inline-flex items-center gap-1.5 rounded-full bg-[#0e3346] px-2.5 py-1 text-[var(--cyan)] hover:brightness-125">
              <Clock size={13} aria-hidden="true" />
              {fill(copy.waiting, { n: c.waitingCount })}
            </Link>
          )}
          {c.mismatchCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3a3010] px-2.5 py-1 text-[#f5b400]"
              title="The stored total for these houses differs from the payments linked to this collection. Open the collection to see which."
            >
              <CircleAlert size={13} aria-hidden="true" />
              {fill(copy.mismatch, { n: c.mismatchCount })}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{c.title}</h3>
          {c.description && <p className="line-clamp-2 max-w-xl text-[#a1a1a6]">{c.description}</p>}
        </div>

        <div className="flex items-center gap-5">
          <ProgressRing value={c.paidSen} max={c.dueSen} size={96} stroke={6} track="rgba(255,255,255,.12)">
            <span className="font-heading text-xl font-bold tabular-nums">{c.pct}%</span>
          </ProgressRing>
          <div className="grid min-w-0 gap-1.5">
            <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-heading font-extrabold leading-none tracking-tight tabular-nums">
              <span className="text-blend text-[clamp(1.9rem,5vw,2.75rem)]">{formatRMShort(c.paidSen)}</span>
              <span className="text-base font-semibold text-white/40">{fill(copy.ofTotal, { total: formatRMShort(c.dueSen) })}</span>
            </p>
            <p className="text-sm text-[#c7cedd]">
              {fill(copy.housesPaid, { paid: c.paidCount, total: c.houses.length })}
              {c.outstandingSen > 0 && (
                <>
                  <span className="text-white/30"> · </span>
                  <span className="whitespace-nowrap text-[#f5b400]">
                    {formatRMShort(c.outstandingSen)} {copy.outstanding}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {c.houses.length > 0 && (
          <div className="grid gap-3">
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
              {c.houses.map((h, i) => (
                <li key={h.residentId} className="animate-pop" style={{ animationDelay: `${Math.min(i, 30) * 25}ms` }}>
                  <HouseTile
                    dark
                    unit={h.unit}
                    state={h.state}
                    label={`${t.states[h.state]} · ${formatRMShort(h.paidSen)} / ${formatRMShort(h.dueSen)}`}
                    href={`/residents/${h.residentId}`}
                    className={RAISED_DARK}
                  />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#c7cedd]">
              {legend.map(({ s, n }) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${stateStyles[s].dot}`} aria-hidden="true" />
                  {t.states[s]} · {n}
                </span>
              ))}
              <span className="text-[#8e9ab8]">{copy.tilesHint}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/special-collections/${c.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--lime)] px-5 font-heading font-semibold text-[#06210b] shadow-[0_3px_0_#4d9a12] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#4d9a12]"
          >
            {copy.viewCollection}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href={`/special-collections/${c.id}/edit`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            <Pencil size={14} aria-hidden="true" />
            {t.common.edit}
          </Link>
        </div>
      </div>
    </article>
  );
}

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
            <span className="ui-chip bg-[#fff4d6] tabular-nums text-[#8a6300]">{fill(copy.stillOwed, { amount: formatRMShort(c.outstandingSen) })}</span>
          )}
          {c.waitingCount > 0 && <span className="ui-chip bg-[#ddf5fd] text-[#0b6e8e]">{fill(copy.waiting, { n: c.waitingCount })}</span>}
        </div>
        <p className="mt-0.5 text-xs text-[var(--ink-2)]">
          {due.text} · {fill(copy.perHouse, { amount: formatRMShort(c.amountPerResident) })} · {fill(copy.housesPaid, { paid: c.paidCount, total: c.houses.length })}
        </p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:contents">
        <div className="flex items-baseline gap-2 sm:block sm:text-right">
          <p className="font-heading font-bold tabular-nums text-[var(--ink)]">{formatRMShort(c.paidSen)}</p>
          <p className="text-xs text-[var(--ink-2)]">{fill(copy.ofTotal, { total: formatRMShort(c.dueSen) })}</p>
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
              <ActiveCard key={c.id} c={c} t={t} locale={locale} now={now} />
            ))}
          </div>
        ) : (
          <div className="ui-card flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="flex items-center gap-3 text-[var(--ink-2)]">
              <span className="grid size-10 place-items-center rounded-2xl bg-[var(--paper)]">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              {copy.nothingActive}
            </p>
            <Link className="ui-button-secondary" href="/special-collections/new">
              <Plus size={16} aria-hidden="true" />
              {copy.newCollection}
            </Link>
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
