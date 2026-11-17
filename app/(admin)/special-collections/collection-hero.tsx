import Link from "next/link";
import { ArrowRight, CalendarDays, CircleAlert, Clock, PartyPopper, Pencil } from "lucide-react";

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

/** "Due 31 Dec 2026 · in 44 days" plus how urgent it is. Countdown only while money is still owed. */
export function dueInfo(c: CollectionOverview, now: Date, copy: Copy, locale: Locale, countdown: boolean) {
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

/** "Event 1 Mar 2027 – 3 Mar 2027", or one date when the event is a single day. */
function eventText(c: CollectionOverview, copy: Copy, locale: Locale) {
  const from = c.eventStartDate;
  const to = c.eventEndDate;
  if (!from && !to) return null;
  const a = from ? formatDate(from, locale) : null;
  const b = to ? formatDate(to, locale) : null;
  return a && b && a !== b ? fill(copy.eventRange, { from: a, to: b }) : fill(copy.eventOn, { date: (a ?? b) as string });
}

/**
 * The big dark collection card: where the money stands and one tile per house, coloured by who has paid.
 * "list" is the card on the collections page (links on to the collection); "detail" is the header of the collection's own page.
 */
export function CollectionHero({
  c,
  t,
  locale,
  now,
  variant,
}: {
  c: CollectionOverview;
  t: Dictionary;
  locale: Locale;
  now: Date;
  variant: "list" | "detail";
}) {
  const copy = t.collections;
  const live = c.status === "ACTIVE";
  const due = dueInfo(c, now, copy, locale, live);
  const event = variant === "detail" ? eventText(c, copy, locale) : null;
  const detail = variant === "detail";
  const legend = (["paid", "partial", "pending", "unpaid"] as const)
    .map((s) => ({ s, n: c.houses.filter((h) => h.state === s).length }))
    .filter((x) => x.n > 0);
  const allPaid = c.houses.length > 0 && c.paidCount === c.houses.length;
  const Title = detail ? "h1" : "h3";

  return (
    <article data-tour={detail ? "collection-hero" : "collections-card"} className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10">
      {/* Raya guardhouse art fading into the navy; it only comes alive while the collection is running (all off under reduced motion). */}
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 right-0 -z-10 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_45%)] sm:w-3/5 ${
          live ? "opacity-30 sm:opacity-100" : "opacity-20 grayscale sm:opacity-60"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
        <img src="/art/a6-raya.webp" alt="" className={`h-full w-full object-cover object-right ${live ? "animate-drift" : ""}`} />
        {live &&
          FIREFLIES.map((f) => (
            <span
              key={f.left}
              className={`animate-rise absolute size-1.5 rounded-full opacity-0 shadow-[0_0_8px_2px_currentColor] ${f.color}`}
              style={{ left: f.left, top: f.top, animationDelay: f.delay }}
            />
          ))}
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:max-w-[70%]">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${live ? "bg-[#1c3a2a] text-[var(--lime)]" : "bg-white/10 text-[#c7cedd]"}`}>
            {live && <span className="size-1.5 animate-pulse rounded-full bg-[var(--lime)] motion-reduce:animate-none" aria-hidden="true" />}
            {live ? copy.active : c.status === "DRAFT" ? copy.draft : copy.closed}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${DUE_TONE[due.tone]}`}>
            <CalendarDays size={13} aria-hidden="true" />
            {due.text}
          </span>
          {event && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[#c7cedd]">
              <PartyPopper size={13} aria-hidden="true" />
              {event}
            </span>
          )}
          {c.waitingCount > 0 && (
            <Link href="/review" className="inline-flex items-center gap-1.5 rounded-full bg-[#0e3346] px-2.5 py-1 text-[var(--cyan)] hover:brightness-125">
              <Clock size={13} aria-hidden="true" />
              {fill(copy.waiting, { n: c.waitingCount })}
            </Link>
          )}
          {c.mismatchCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3a3010] px-2.5 py-1 text-[#f5b400]"
              title={copy.recordSaysHint}
            >
              <CircleAlert size={13} aria-hidden="true" />
              {fill(copy.mismatch, { n: c.mismatchCount })}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Title className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{c.title}</Title>
          {c.description && <p className={`max-w-xl text-[#a1a1a6] ${detail ? "" : "line-clamp-2"}`}>{c.description}</p>}
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
              {c.outstandingSen > 0 ? (
                <>
                  <span className="text-white/30"> · </span>
                  <span className="whitespace-nowrap text-[#f5b400]">
                    {formatRMShort(c.outstandingSen)} {copy.outstanding}
                  </span>
                </>
              ) : (
                allPaid && (
                  <>
                    <span className="text-white/30"> · </span>
                    <span className="whitespace-nowrap text-[var(--lime)]">{copy.allSettled}</span>
                  </>
                )
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
          {detail ? (
            <Link
              href={`/special-collections/${c.id}/edit`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--lime)] px-5 font-heading font-semibold text-[#06210b] shadow-[0_3px_0_#4d9a12] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#4d9a12]"
            >
              <Pencil size={15} aria-hidden="true" />
              {t.common.edit}
            </Link>
          ) : (
            <>
              <Link
                href={`/special-collections/${c.id}`}
                data-tour="collections-open"
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
            </>
          )}
        </div>
      </div>
    </article>
  );
}
