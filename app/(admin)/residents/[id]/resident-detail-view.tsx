import Link from "next/link";
import {
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react";

import { FileViewer } from "@/app/components/file-viewer";
import { GuardhouseScene, LAMP_BY_STATE } from "@/app/components/guardhouse-scene";
import { ProgressRing } from "@/app/components/progress-ring";
import { StatusPill, stateStyles, TILE_RAISED, TYPE_TONE } from "@/app/components/status";
import { TablePagination } from "@/app/components/table-pagination";
import { formatDate } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { formatRM, formatRMShort } from "@/lib/money";
import { telHref, whatsappHref } from "@/lib/phone";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS, type ResidentDetail } from "@/lib/reports/resident-detail";
import type { ResidentStatus } from "@/lib/reports/residents-directory";
import { coverageLabel, monthName, type MonthState } from "@/lib/status";
import { fill } from "@/lib/text";
import { statusLabel } from "../residents-view";
import { initials, PlateChip } from "./tenants/tenant-list-view";

const STATUS_DARK: Record<ResidentStatus, string> = {
  ACTIVE: "bg-[#1c3a2a] text-[var(--lime)]",
  EXEMPT: "bg-[#0e3346] text-[var(--cyan)]",
  FOR_SALE: "bg-[#3a3010] text-[#f5b400]",
  MOVED_OUT: "bg-white/10 text-[#c7cedd]",
};

const RAISED_BUTTON =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--lime)] px-5 font-heading font-semibold text-[#06210b] shadow-[0_3px_0_#4d9a12] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#4d9a12]";
const GLASS_BUTTON =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15";

/** Builds this page's URLs from the year and history page being shown, with some overridden. */
function makeHref(d: ResidentDetail, perPage: number) {
  return (over: { year?: number; page?: number } = {}) => {
    const sp = new URLSearchParams();
    const year = over.year ?? d.year;
    if (year !== d.thisYear) sp.set("year", String(year));
    if (perPage !== DEFAULT_PER_PAGE) sp.set("perPage", String(perPage));
    if (over.page && over.page !== 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return qs ? `/residents/${d.id}?${qs}` : `/residents/${d.id}`;
  };
}

const dayOf = (date: string) => new Date(`${date}T00:00:00Z`);

function Stat({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
      <dt className="text-[11px] font-medium leading-tight text-[#8e9ab8]">{label}</dt>
      <dd className="mt-1 break-words font-heading text-base font-bold leading-tight tabular-nums sm:text-lg">{children}</dd>
      {sub && <dd className="mt-0.5 text-[11px] text-[#8e9ab8]">{sub}</dd>}
    </div>
  );
}

/** The dark card on top: who lives here, where they stand, and the two things the AJK does most: record a payment, or get in touch. */
function Hero({ t, locale, d }: { t: Dictionary; locale: Locale; d: ResidentDetail }) {
  const c = t.residentPage;
  const active = d.status === "ACTIVE";
  const month = d.thisMonthState;
  const allClear = active && d.owedSen === 0 && (month === "paid" || month === "ahead");
  const tel = telHref(d.phone);
  const wa = whatsappHref(d.phone);
  const paidUntil = d.paidUntil ? monthName(locale, d.paidUntil.year, d.paidUntil.month, "long") : null;
  const textValue = "text-sm font-semibold sm:text-base";

  return (
    <section data-tour="house-hero" className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10 sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.24),transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-8 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(142,229,63,.16),transparent_70%)]" />

      {/* The house itself: its lamp glows in this month's colour, the same lamp the resident sees on their own page. */}
      <div className="pointer-events-none absolute -right-4 top-1/2 -z-10 hidden w-[36%] max-w-[360px] -translate-y-1/2 sm:block">
        <GuardhouseScene lamp={LAMP_BY_STATE[month]} plate={d.unit} fireflies={allClear} className="w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:pr-[34%]">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 ${STATUS_DARK[d.status]}`}>{statusLabel(t, d.status)}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${stateStyles[month].tileDark}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${stateStyles[month].dot}`} />
            {t.house.thisMonth}: {t.states[month]}
          </span>
          {d.waiting.length > 0 && (
            <Link href={`/review?id=${d.waiting[0].id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#0e3346] px-2.5 py-1 text-[var(--cyan)] hover:brightness-125">
              <Clock size={13} aria-hidden="true" />
              {fill(t.payments.waitingReview, { n: d.waiting.length })}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <span
            role="img"
            aria-label={fill(t.house.title, { unit: d.unit })}
            className="grid size-16 shrink-0 place-items-center rounded-3xl bg-[image:var(--blend)] font-heading text-2xl font-extrabold tabular-nums text-[#06210b] shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_5px_0_rgba(0,0,0,.35)] sm:size-20 sm:text-3xl"
          >
            {d.unit}
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-[clamp(1.5rem,3vw,2.2rem)] font-bold leading-tight tracking-tight">{d.name}</h1>
            <p className="mt-0.5 text-sm text-[#a1a1a6]">
              {fill(t.house.title, { unit: d.unit })}
              {d.block && ` · ${fill(t.residents.blockLabel, { b: d.block })}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <ProgressRing value={d.paidThisYear} max={12} size={96} stroke={6} track="rgba(255,255,255,.12)">
            <span className="font-heading text-xl font-bold tabular-nums">
              {d.paidThisYear}
              <span className="text-xs font-semibold text-white/50">/12</span>
            </span>
          </ProgressRing>
          <div className="grid min-w-0 gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e9ab8]">{t.house.paidUntil}</p>
            <p className="text-blend font-heading text-[clamp(1.6rem,4.5vw,2.5rem)] font-extrabold leading-none tracking-tight">{paidUntil ?? t.house.never}</p>
            <p className="text-sm text-[#c7cedd]">{fill(c.monthsPaidIn, { paid: d.paidThisYear, year: d.thisYear })}</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat
            label={c.owed}
            sub={d.owedSen > 0 ? (d.owedMonths === 1 ? c.owedMonthsOne : fill(c.owedMonths, { n: d.owedMonths })) : undefined}
          >
            {!active ? (
              <span className={`${textValue} text-[#c7cedd]`}>{c.notBilled}</span>
            ) : d.owedSen > 0 ? (
              <span className="text-[#ff8a6e]">{formatRMShort(d.owedSen)}</span>
            ) : (
              <span className={`${textValue} text-[var(--lime)]`}>{c.upToDate}</span>
            )}
          </Stat>
          <Stat label={c.collectionsOwed}>
            {d.collections.length === 0 ? (
              <span className="text-white/40">—</span>
            ) : d.collectionsOwedSen > 0 ? (
              <span className="text-[#f5b400]">{formatRMShort(d.collectionsOwedSen)}</span>
            ) : (
              <span className={`${textValue} text-[var(--lime)]`}>{c.cleared}</span>
            )}
          </Stat>
          <Stat label={c.lastPayment}>
            {d.lastPaymentDate ? (
              <span className={textValue}>{formatDate(dayOf(d.lastPaymentDate), locale)}</span>
            ) : (
              <span className={`${textValue} text-[#c7cedd]`}>{t.house.never}</span>
            )}
          </Stat>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          {active && (
            <Link href={`/payments/new?residentId=${d.id}`} data-tour="house-record" className={RAISED_BUTTON}>
              <ReceiptText size={16} aria-hidden="true" />
              {t.payments.recordPayment}
            </Link>
          )}
          <Link href={`/residents/${d.id}/edit`} className={GLASS_BUTTON}>
            <Pencil size={14} aria-hidden="true" />
            {t.common.edit}
          </Link>
        </div>

        {d.phone ? (
          <div data-tour="house-contact" className="flex w-full flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/10 sm:w-fit sm:min-w-72 sm:flex-nowrap sm:p-1.5 sm:pl-4">
            <span className="flex min-w-0 items-center gap-2 pl-1.5 sm:pl-0">
              <Phone size={15} aria-hidden="true" className="shrink-0 text-[#8e9ab8]" />
              <span className="truncate font-heading font-semibold tabular-nums">{d.phone}</span>
            </span>
            {(tel || wa) && (
              <span className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:shrink-0 sm:gap-1.5 sm:pl-2">
                {tel && (
                  <a href={tel} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/15 active:scale-95 sm:h-9">
                    <Phone size={14} aria-hidden="true" />
                    {t.residents.call}
                  </a>
                )}
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#128c4a] px-3.5 text-sm font-semibold transition hover:brightness-110 active:scale-95 sm:h-9"
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    {t.residents.whatsapp}
                  </a>
                )}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#8e9ab8]">
            {t.residents.noPhone} ·{" "}
            <Link href={`/residents/${d.id}/edit`} className="font-semibold text-[var(--cyan)] hover:underline">
              {c.addPhone}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

/** One year of months as raised tiles, with arrows to look back (or ahead) and a cue when older years are still owed. */
function YearCard({ t, locale, d, href }: { t: Dictionary; locale: Locale; d: ResidentDetail; href: ReturnType<typeof makeHref> }) {
  const c = t.residentPage;
  const prev = d.year > d.years.min ? href({ year: d.year - 1 }) : null;
  const next = d.year < d.years.max ? href({ year: d.year + 1 }) : null;
  const paid = d.months.filter((m) => m.state === "paid" || m.state === "ahead").length;
  const legend = (["paid", "pending", "partial", "unpaid", "hold", "upcoming"] as const)
    .map((s) => ({ s, n: d.months.filter((m) => m.state === s || (s === "paid" && m.state === "ahead")).length }))
    .filter((x) => x.n > 0);
  const arrow = "grid size-10 place-items-center rounded-full transition";

  return (
    <section data-tour="house-year" className="ui-card grid grid-cols-1 gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-[var(--paper)] p-1">
          {prev ? (
            <Link href={prev} aria-label={`${t.common.year} ${d.year - 1}`} className={`${arrow} hover:bg-white hover:shadow-sm`}>
              <ChevronLeft size={20} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrow} text-[#d2d2d7]`}>
              <ChevronLeft size={20} />
            </span>
          )}
          <h2 className="min-w-16 text-center font-heading text-xl font-bold tabular-nums">{d.year}</h2>
          {next ? (
            <Link href={next} aria-label={`${t.common.year} ${d.year + 1}`} className={`${arrow} hover:bg-white hover:shadow-sm`}>
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrow} text-[#d2d2d7]`}>
              <ChevronRight size={20} />
            </span>
          )}
        </div>
        <p className="leading-tight">
          <span className="font-heading text-2xl font-bold tabular-nums">{paid}</span>
          <span className="text-[var(--ink-2)]"> / 12 {t.house.monthsPaid}</span>
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {d.months.map(({ month, amountSen, state }, i) => {
          const Icon = state === "paid" || state === "ahead" ? Check : state === "pending" ? Clock : state === "unpaid" || state === "partial" ? CircleAlert : null;
          const current = d.year === d.thisYear && month === d.thisMonth;
          return (
            <li key={month} className="animate-pop" style={{ animationDelay: `${i * 40}ms` }}>
              <div
                aria-current={current ? "date" : undefined}
                className={`relative grid h-full min-h-[6rem] content-center gap-0.5 rounded-2xl px-3 py-3.5 text-center ${TILE_RAISED} ${stateStyles[state].tile} ${
                  current ? "outline outline-2 outline-offset-2 outline-[var(--blue)]" : ""
                }`}
              >
                {Icon && <Icon size={14} strokeWidth={3} aria-hidden="true" className="absolute right-2 top-2 opacity-70" />}
                <span className="font-heading text-base font-bold">{monthName(locale, d.year, month)}</span>
                <span className="text-[11px] font-medium">{amountSen ? formatRM(amountSen) : t.states[state]}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1.5">
          {legend.map(({ s, n }) => (
            <StatusPill key={s} state={s as MonthState} label={`${t.states[s]} · ${n}`} />
          ))}
        </div>
        <Link href={`/rumah/${encodeURIComponent(d.unit)}${d.year === d.thisYear ? "" : `?year=${d.year}`}`} className="text-sm font-semibold text-[var(--blue)] hover:underline">
          {c.residentView} ›
        </Link>
      </div>

      {d.earlierUnpaid && prev && (
        <Link
          href={prev}
          className="flex items-center gap-2 rounded-2xl bg-[#ffe6e0] px-4 py-3 text-sm font-semibold text-[#c2341a] transition hover:brightness-95"
        >
          <CircleAlert size={16} aria-hidden="true" className="shrink-0" />
          {c.earlierUnpaid}
          <ChevronRight size={16} aria-hidden="true" className="ml-auto shrink-0" />
        </Link>
      )}
    </section>
  );
}

function CollectionsCard({ t, d }: { t: Dictionary; d: ResidentDetail }) {
  const copy = t.collections;
  const settled = d.collectionsOwedSen === 0;

  return (
    <section className="ui-card grid grid-cols-1 gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ui-section-title">{copy.title}</h2>
        <span className={`ui-chip ${settled ? "bg-[#e2f7e1] text-[#1c7a33]" : "bg-[#fff4d6] text-[#8a6300]"}`}>
          {settled ? copy.allSettled : fill(copy.balanceLeft, { amount: formatRMShort(d.collectionsOwedSen) })}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3">
        {d.collections.map((c, i) => {
          const pct = c.dueSen > 0 ? Math.min(100, Math.round((c.paidSen / c.dueSen) * 100)) : 0;
          return (
            <li key={c.id}>
              <Link
                href={`/special-collections/${c.id}`}
                className="grid gap-2.5 rounded-2xl bg-[var(--paper)] p-4 transition hover:-translate-y-0.5 hover:bg-[#efeff4] active:translate-y-0"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-2 font-semibold text-[var(--ink)]">
                    <Sparkles size={15} aria-hidden="true" className="mt-1 shrink-0 text-[#8a6300]" />
                    <span className="min-w-0 break-words">{c.title}</span>
                  </span>
                  <span className="ui-chip shrink-0 bg-white text-[var(--ink-2)] ring-1 ring-black/5">
                    {c.status === "ACTIVE" ? copy.active : c.status === "DRAFT" ? copy.draft : copy.closed}
                  </span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,.08)]" aria-hidden="true">
                  <span
                    className={`animate-grow-x block h-full origin-left rounded-full ${c.owedSen > 0 ? "bg-[var(--amber)]" : "bg-[var(--leaf)]"}`}
                    style={{ width: `${pct}%`, animationDelay: `${i * 80}ms` }}
                  />
                </span>
                <span className="flex items-center justify-between gap-2 text-sm">
                  <span className={`text-xs font-semibold ${c.owedSen > 0 ? "text-[#8a6300]" : "text-[#1c7a33]"}`}>
                    {c.owedSen > 0 ? fill(copy.balanceLeft, { amount: formatRMShort(c.owedSen) }) : t.residentPage.paidInFull}
                  </span>
                  <span className="tabular-nums text-[var(--ink-2)]">
                    <b className={`font-heading ${c.owedSen > 0 ? "text-[#8a6300]" : "text-[#1c7a33]"}`}>{formatRMShort(c.paidSen)}</b> / {formatRMShort(c.dueSen)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--paper)] text-[var(--ink-2)]">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-0.5">
        <dt className="text-xs text-[var(--ink-2)]">{label}</dt>
        <dd className="break-words text-[var(--ink)]">{children}</dd>
      </div>
    </div>
  );
}

function AboutCard({ t, d }: { t: Dictionary; d: ResidentDetail }) {
  const c = t.residentPage;
  const empty = !d.email && !d.address && !d.notes;

  return (
    <section className="ui-card grid grid-cols-1 gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="ui-section-title">{c.aboutTitle}</h2>
        <Link href={`/residents/${d.id}/edit`} className="text-sm font-semibold text-[var(--blue)] hover:underline">
          {t.common.edit}
        </Link>
      </div>
      {empty ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-sm text-[var(--ink-2)]">{c.noDetails}</p>
          <Link href={`/residents/${d.id}/edit`} className="ui-button-secondary">
            <Plus size={16} aria-hidden="true" />
            {c.addDetails}
          </Link>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-4 text-sm">
          {d.email && (
            <DetailRow icon={Mail} label={t.tenant.tenantEmail}>
              <a href={`mailto:${d.email}`} className="hover:text-[var(--blue)] hover:underline">
                {d.email}
              </a>
            </DetailRow>
          )}
          {d.address && (
            <DetailRow icon={MapPin} label={c.address}>
              {d.address}
            </DetailRow>
          )}
          {d.notes && (
            <DetailRow icon={StickyNote} label={c.notes}>
              <span className="whitespace-pre-line">{d.notes}</span>
            </DetailRow>
          )}
        </dl>
      )}
    </section>
  );
}

const SHOWN = 3;

function HouseholdCard({ t, d }: { t: Dictionary; d: ResidentDetail }) {
  const c = t.residentPage;
  const base = `/residents/${d.id}`;
  const heading = "inline-flex items-center gap-2 font-semibold text-[var(--ink)] hover:text-[var(--blue)]";
  const count = "rounded-full bg-[var(--paper)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--ink-2)]";
  const action = "text-sm font-semibold text-[var(--blue)] hover:underline";

  return (
    <section className="ui-card grid grid-cols-1 gap-5 p-5 sm:p-6">
      <h2 className="ui-section-title">{c.household}</h2>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={`${base}/tenants`} className={heading}>
            <Users size={16} aria-hidden="true" className="text-[var(--ink-2)]" />
            {t.tenant.title}
            <span className={count}>{d.tenants.length}</span>
          </Link>
          <Link href={d.tenants.length > 0 ? `${base}/tenants` : `${base}/tenants/new`} className={action}>
            {d.tenants.length > 0 ? c.manage : c.add}
          </Link>
        </div>
        {d.tenants.length === 0 ? (
          <p className="text-sm text-[var(--ink-2)]">{c.noTenantsShort}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {d.tenants.slice(0, SHOWN).map((tenant) => (
              <li key={tenant.id} className="flex items-center gap-3 rounded-2xl bg-[var(--paper)] p-2 pr-3">
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--night)] text-xs font-bold text-white">
                  {initials(tenant.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">{tenant.name}</span>
                  <span className="block truncate text-xs tabular-nums text-[var(--ink-2)]">{tenant.phone ?? t.residents.noPhone}</span>
                </span>
              </li>
            ))}
            {d.tenants.length > SHOWN && <li className="px-2 text-xs font-semibold text-[var(--ink-2)]">{fill(c.more, { n: d.tenants.length - SHOWN })}</li>}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-black/5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Link href={`${base}/vehicles`} className={heading}>
            <Car size={16} aria-hidden="true" className="text-[var(--ink-2)]" />
            {t.residentVehicles.title}
            <span className={count}>{d.vehicles.length}</span>
          </Link>
          <Link href={d.vehicles.length > 0 ? `${base}/vehicles` : `${base}/vehicles/new`} className={action}>
            {d.vehicles.length > 0 ? c.manage : c.add}
          </Link>
        </div>
        {d.vehicles.length === 0 ? (
          <p className="text-sm text-[var(--ink-2)]">{c.noVehiclesShort}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {d.vehicles.slice(0, SHOWN + 1).map((v) => (
              <li key={v.id}>
                <PlateChip plate={v.plate} make={v.make} model={v.model} />
              </li>
            ))}
            {d.vehicles.length > SHOWN + 1 && <li className="self-center px-1 text-xs font-semibold text-[var(--ink-2)]">{fill(c.more, { n: d.vehicles.length - SHOWN - 1 })}</li>}
          </ul>
        )}
      </div>
    </section>
  );
}

/** One payment: a little calendar leaf for the day, what it paid for, how, the amount and the proof. */
function HistoryRow({ p, t, locale }: { p: ResidentDetail["history"]["payments"][number]; t: Dictionary; locale: Locale }) {
  const copy = t.payments;
  const tone = TYPE_TONE[p.type];
  const day = dayOf(p.date);
  const month = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { month: "short", timeZone: "UTC" }).format(day);
  const method = copy.methods[p.method as keyof typeof copy.methods] ?? p.method;

  return (
    <li className="history-row px-4 py-3.5 transition hover:bg-[#fafafc] sm:px-5">
      <span aria-hidden="true" className={`grid size-11 grid-rows-[auto_1fr] overflow-hidden rounded-xl text-center [grid-area:leaf] ${tone.tile} ${TILE_RAISED}`}>
        <span className="bg-black/10 text-[9px] font-bold uppercase leading-4 tracking-wide">{month}</span>
        <span className="self-center font-heading text-lg font-bold leading-none tabular-nums">{day.getUTCDate()}</span>
      </span>

      <div className="min-w-0 text-sm [grid-area:for]">
        {p.type === "MONTHLY_FEE" ? (
          p.months ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <CalendarDays size={13} aria-hidden="true" className={tone.icon} />
              <span className="font-medium text-[var(--ink)]">{coverageLabel(locale, p.months.first, p.months.last)}</span>
              <span className="text-xs text-[var(--ink-2)]">· {p.months.count === 1 ? copy.monthsCountOne : fill(copy.monthsCount, { n: p.months.count })}</span>
            </span>
          ) : (
            <span className="text-[var(--ink-2)]">{copy.monthlyFee}</span>
          )
        ) : p.collection ? (
          <Link href={`/special-collections/${p.collection.id}`} className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--blue)] hover:underline">
            <Sparkles size={13} aria-hidden="true" className={`shrink-0 ${tone.icon}`} />
            <span className="truncate">{p.collection.title}</span>
          </Link>
        ) : (
          <span className="ui-chip bg-[#fff4d6] text-[#8a6300]" title={copy.notRecordedHint}>
            {copy.notRecorded}
          </span>
        )}
      </div>

      {/* Phones: "date · method", then the reference. md+: the date, then "method · reference". */}
      <div className="grid min-w-0 gap-0.5 text-xs text-[var(--ink-2)] [grid-area:meta]">
        <p className="truncate">
          <span className="font-medium text-[var(--ink)] md:text-[13px]">{formatDate(day, locale)}</span>
          <span className="md:hidden"> · {method}</span>
        </p>
        <p className={`min-w-0 items-center gap-1.5 ${p.referenceNo || p.notes ? "flex" : "hidden md:flex"}`}>
          <span className="hidden whitespace-nowrap md:inline">{method}</span>
          {p.referenceNo && (
            <>
              <span aria-hidden="true" className="hidden md:inline">
                ·
              </span>
              <span title={p.referenceNo} className="min-w-0 truncate">
                {p.referenceNo}
              </span>
            </>
          )}
          {p.notes && (
            <span title={p.notes} className="inline-flex shrink-0 text-[#aeaeb2]">
              <StickyNote size={12} aria-label={p.notes} />
            </span>
          )}
        </p>
      </div>

      <p className="justify-self-end whitespace-nowrap font-heading text-base font-bold tabular-nums text-[var(--ink)] [grid-area:amount]">{formatRM(p.amountSen)}</p>

      <div className="justify-self-end [grid-area:proof]">
        {p.uploads.length > 0 ? <FileViewer files={p.uploads} triggerLabel={copy.proof} /> : <span className="text-xs text-[#aeaeb2]">—</span>}
      </div>
    </li>
  );
}

function History({ t, locale, d, perPage, href }: { t: Dictionary; locale: Locale; d: ResidentDetail; perPage: number; href: ReturnType<typeof makeHref> }) {
  const c = t.residentPage;
  const h = d.history;
  const active = d.status === "ACTIVE";

  return (
    <section data-tour="house-history" className="ui-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-black/5 px-4 py-4 sm:px-5">
        <div className="grid gap-0.5">
          <h2 className="ui-section-title">{c.historyTitle}</h2>
          {h.totalCount > 0 && (
            <p className="text-xs text-[var(--ink-2)]">
              {h.totalCount === 1 ? t.payments.paymentCountOne : fill(t.payments.paymentCount, { n: h.totalCount })} · {fill(c.totalPaid, { amount: formatRMShort(h.totalSen) })}
            </p>
          )}
        </div>
        {active && h.totalCount > 0 && (
          <Link href={`/payments/new?residentId=${d.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[#ececf1] active:scale-95">
            <Plus size={15} aria-hidden="true" />
            {t.payments.recordPayment}
          </Link>
        )}
      </div>

      {h.totalCount === 0 ? (
        <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
          <img src="/art/a3-inbox-clear.webp" alt="" width={160} height={160} className="animate-float size-40 rounded-[32px] object-cover mix-blend-multiply" />
          <p className="max-w-sm text-[var(--ink-2)]">{c.historyEmpty}</p>
          {active && (
            <Link href={`/payments/new?residentId=${d.id}`} className="ui-button-primary mt-1">
              <Plus size={16} aria-hidden="true" />
              {t.payments.recordPayment}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div aria-hidden="true" className="history-head hidden border-b border-black/5 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)] md:grid">
            <span className="col-span-2">{t.payments.coverage}</span>
            <span>{t.payments.date}</span>
            <span className="text-right">{t.payments.amount}</span>
            <span className="text-right">{t.payments.proof}</span>
          </div>
          <ul className="divide-y divide-black/5">
            {h.payments.map((p) => (
              <HistoryRow key={p.id} p={p} t={t} locale={locale} />
            ))}
          </ul>
          <TablePagination
            currentPage={h.page}
            totalPages={h.totalPages}
            totalCount={h.totalCount}
            perPage={perPage}
            rangeStart={(h.page - 1) * perPage + 1}
            rangeEnd={Math.min(h.page * perPage, h.totalCount)}
            perPageOptions={PER_PAGE_OPTIONS}
            pageLink={(p) => href({ page: p })}
          />
        </>
      )}
    </section>
  );
}

export function ResidentDetailView({ t, locale, d, perPage }: { t: Dictionary; locale: Locale; d: ResidentDetail; perPage: number }) {
  const href = makeHref(d, perPage);

  return (
    <>
      <Link href="/residents" className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline">
        <ChevronLeft size={16} aria-hidden="true" />
        {t.nav.houses}
      </Link>

      <Hero t={t} locale={locale} d={d} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid grid-cols-1 content-start gap-6">
          <YearCard t={t} locale={locale} d={d} href={href} />
          {d.collections.length > 0 && <CollectionsCard t={t} d={d} />}
        </div>
        <div className="grid grid-cols-1 content-start gap-6">
          <AboutCard t={t} d={d} />
          <HouseholdCard t={t} d={d} />
        </div>
      </div>

      <History t={t} locale={locale} d={d} perPage={perPage} href={href} />
    </>
  );
}
