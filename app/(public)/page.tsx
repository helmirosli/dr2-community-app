import Link from "next/link";
import { ArrowRight, Landmark, LayoutGrid, Send } from "lucide-react";
import { billingNow } from "@/lib/months";

import { ProgressRing } from "@/app/components/progress-ring";
import { TourButton } from "@/app/components/tour/tour-button";
import { HouseTile, StatusPill } from "@/app/components/status";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { countPaid, getMonthStates } from "@/lib/reports/month-states";
import { monthName, type MonthState } from "@/lib/status";
import { CopyButton, UnitLookup } from "./home-client";
import { fill } from "@/lib/text";

export const dynamic = "force-dynamic";


/** Raised, button-like edge for the small status tiles. */
const RAISED = "shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_3px_0_rgba(0,0,0,.08)]";

const FIREFLIES = [
  { left: "16%", top: "62%", delay: "0s", color: "bg-[var(--lime)] shadow-[0_0_10px_3px_rgba(142,229,63,.6)]" },
  { left: "31%", top: "78%", delay: "1.3s", color: "bg-[var(--cyan)] shadow-[0_0_10px_3px_rgba(34,199,242,.6)]" },
  { left: "47%", top: "68%", delay: "2.4s", color: "bg-[var(--lime)] shadow-[0_0_10px_3px_rgba(142,229,63,.6)]" },
  { left: "62%", top: "82%", delay: "0.7s", color: "bg-[var(--cyan)] shadow-[0_0_10px_3px_rgba(34,199,242,.6)]" },
  { left: "75%", top: "64%", delay: "3.2s", color: "bg-[var(--lime)] shadow-[0_0_10px_3px_rgba(142,229,63,.6)]" },
  { left: "87%", top: "76%", delay: "4.1s", color: "bg-[var(--cyan)] shadow-[0_0_10px_3px_rgba(34,199,242,.6)]" },
];

const LEGEND: MonthState[] = ["paid", "pending", "partial", "unpaid", "hold"];

export default async function HomePage() {
  const now = billingNow();
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const previous = current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: current.month - 1 };
  // Early in the month almost nobody has paid yet, so lead with last month and show this month underneath.
  const leadWithLast = now.getDate() <= 7;
  const leadPeriod = leadWithLast ? previous : current;

  const [t, locale, thisMonth, lastMonth, collections] = await Promise.all([
    getDictionary(),
    getLocale(),
    getMonthStates(current.year, current.month),
    getMonthStates(previous.year, previous.month),
    prisma.specialCollection.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, title: true, amountPerResident: true, assignments: { select: { amountDue: true, amountPaid: true } } },
    }),
  ]);

  const lead = leadWithLast ? lastMonth : thisMonth;
  const other = leadWithLast ? thisMonth : lastMonth;
  const total = lead.length;
  const paid = countPaid(lead);
  const pct = total ? Math.round((paid / total) * 100) : 0;

  const bank = {
    name: process.env.NEXT_PUBLIC_BANK_NAME ?? "—",
    holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "—",
    account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "—",
  };

  return (
    <>
      {/* Hero: night band */}
      <section className="relative overflow-hidden pt-14 sm:pt-20">
        <div className="relative z-10 mx-auto grid max-w-4xl justify-items-center gap-4 px-4 text-center">
          <p className="text-blend font-heading text-sm font-semibold">Jalan Restu 2 · Desa Restu</p>
          <h1 className="font-heading text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1.04] tracking-tight">
            {t.home.heroTitle}
            <br />
            <span className="text-blend">{t.home.heroLine2}</span>
          </h1>
          <div className="mt-2 grid w-full justify-items-center gap-3">
            <UnitLookup label={t.home.unitLabel} placeholder={t.home.unitPlaceholder} button={t.home.check} />
            <p className="text-sm text-[#86868b]">{t.home.noLogin}</p>
            <TourButton id="resident-home" />
          </div>
        </div>
        <div className="relative mx-auto mt-2 max-w-6xl sm:-mt-10">
          <picture className="animate-hover block">
            <source media="(max-width: 640px)" srcSet="/art/a1-hero-mobile.webp" />
            <img
              src="/art/a1-hero.webp"
              alt=""
              width={1440}
              height={800}
              className="block w-full [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,#000_35%,#000_80%,transparent),linear-gradient(to_right,transparent,#000_18%,#000_82%,transparent)]"
              fetchPriority="high"
            />
          </picture>
          {/* Fireflies drifting up from the street. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {FIREFLIES.map((f) => (
              <span key={f.left} className={`animate-rise absolute size-1.5 rounded-full ${f.color}`} style={{ left: f.left, top: f.top, animationDelay: f.delay }} />
            ))}
          </div>
        </div>
      </section>

      {/* Highlights: paper band */}
      <section className="bg-[var(--paper)] py-16 text-[var(--ink)] sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:grid-cols-6">
          <div data-tour="home-houses" className="grid gap-6 rounded-[28px] bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,.04),0_24px_48px_-28px_rgba(0,0,0,.2)] sm:col-span-4 sm:p-8">
            <div className="flex items-center justify-between gap-5">
              <div className="grid gap-2">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ink-2)]">
                  {leadWithLast ? t.home.lastMonth : t.home.thisMonth}
                  <span className="rounded-full bg-[var(--paper)] px-2.5 py-0.5 text-xs">
                    {monthName(locale, leadPeriod.year, leadPeriod.month, "long")}
                  </span>
                </p>
                <p className="font-heading text-[clamp(2.6rem,7vw,4.5rem)] font-extrabold leading-none tracking-tight">
                  <span className="text-blend">{paid}</span>
                  <span className="text-[#c7c7cc]"> / {total}</span>
                </p>
                <p className="text-[var(--ink-2)]">{fill(t.home.housesPaid, { paid, total })}</p>
              </div>
              <ProgressRing value={paid} max={total} size={112} stroke={6} className="max-[420px]:hidden">
                <span className="font-heading text-xl font-bold tabular-nums">{pct}%</span>
              </ProgressRing>
            </div>

            {/* Every house, coloured by status. Tap one to open it. */}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
              {lead.map((h, i) => (
                <li key={h.unit} className="animate-pop" style={{ animationDelay: `${Math.min(i, 24) * 30}ms` }}>
                  <HouseTile
                    unit={h.unit}
                    state={h.state}
                    label={t.states[h.state]}
                    href={`/rumah/${encodeURIComponent(h.unit)}`}
                    className={RAISED}
                  />
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {LEGEND.map((s) => {
                  const n = lead.filter((h) => h.state === s || (s === "paid" && h.state === "ahead")).length;
                  return s === "paid" || n > 0 ? <StatusPill key={s} state={s} label={`${t.states[s]} · ${n}`} /> : null;
                })}
              </div>
              <p className="text-sm text-[var(--ink-2)]">
                {leadWithLast ? t.home.thisMonth : t.home.lastMonth}: {countPaid(other)} / {other.length}
              </p>
            </div>
          </div>

          <div className="grid content-start gap-5 sm:col-span-2">
            <Link
              href="/submit"
              className="group grid gap-1 rounded-[28px] bg-[linear-gradient(160deg,#17285a,#0b1636_60%,#050a1a)] p-6 text-white shadow-[0_24px_48px_-24px_rgba(36,99,232,.6)] transition hover:-translate-y-0.5"
            >
              <span className="mb-2 grid size-10 place-items-center rounded-2xl bg-[image:var(--blend)] text-[#04140a] shadow-[0_3px_0_rgba(0,0,0,.25)]">
                <Send size={18} aria-hidden="true" />
              </span>
              <span className="font-heading text-lg font-bold">{t.home.submitTitle}</span>
              <span className="text-sm text-[#a1a1a6]">{t.home.submitDesc}</span>
              <span className="mt-2 flex items-center gap-1 text-sm text-[var(--cyan)]">
                {t.home.submitTitle} <ArrowRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/status"
              className="group grid gap-1 rounded-[28px] bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,.04),0_24px_48px_-28px_rgba(0,0,0,.2)] transition hover:-translate-y-0.5"
            >
              <span className="mb-2 grid size-10 place-items-center rounded-2xl bg-[#ddf5fd] text-[#0b6e8e]">
                <LayoutGrid size={18} aria-hidden="true" />
              </span>
              <span className="font-heading text-lg font-bold">{t.home.statusTitle}</span>
              <span className="text-sm text-[var(--ink-2)]">{t.home.statusDesc}</span>
              <span className="mt-2 flex items-center gap-1 text-sm text-[var(--blue)]">
                {t.home.statusTitle} <ArrowRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {collections.map((c) => {
            const assigned = c.assignments.length;
            const done = c.assignments.filter((a) => a.amountPaid >= a.amountDue).length;
            const cpct = assigned ? Math.round((done / assigned) * 100) : 0;
            return (
              <div
                key={c.id}
                className="relative grid min-h-56 content-end gap-2 overflow-hidden rounded-[28px] bg-[var(--night)] bg-[url(/art/a6-raya.webp)] bg-[length:auto_70%] bg-right-top bg-no-repeat p-7 text-white sm:col-span-6 sm:min-h-48 sm:bg-cover sm:bg-right sm:bg-no-repeat"
              >
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--night)] via-[var(--night)]/70 to-transparent sm:bg-gradient-to-r sm:via-[var(--night)]/40" />
                <p className="text-blend relative font-heading text-sm font-semibold">{t.home.specialTitle}</p>
                <p className="relative max-w-md font-heading text-2xl font-bold">{c.title}</p>
                <p className="relative text-sm text-[#c7cedd]">
                  {fill(t.home.perHouse, { amount: formatRM(c.amountPerResident) })} · {fill(t.home.specialPaid, { paid: done, total: assigned })}
                </p>
                <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/15 sm:flex-1">
                    <div className="h-full rounded-full bg-[image:var(--blend)]" style={{ width: `${cpct}%` }} />
                  </div>
                  <Link href="/submit" className="group flex items-center gap-1 text-sm font-semibold text-[var(--cyan)]">
                    {t.home.submitTitle} <ArrowRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How to pay: white band */}
      <section id="cara-bayar" className="bg-white py-16 text-[var(--ink)] sm:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2 md:gap-14">
          <div className="grid gap-7">
            <h2 className="font-heading text-[clamp(2rem,5vw,3rem)] font-bold leading-tight tracking-tight">{t.home.howToPay}</h2>
            <ol className="grid gap-5">
              {[t.home.step1, t.home.reference, t.home.step3].map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[image:var(--blend)] font-heading text-base font-extrabold text-[#04140a] shadow-[0_3px_0_rgba(0,0,0,.14)]">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-[17px] leading-snug">{step}</p>
                </li>
              ))}
            </ol>
            <p className="text-sm text-[#86868b]">{t.home.noQr}</p>
          </div>

          <div className="mx-auto grid w-full max-w-md gap-5 md:max-w-none">
            <div aria-hidden="true" className="pointer-events-none mx-auto -mb-12 w-64 sm:w-72">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative art; multiply blends its white backdrop into the page */}
              <img src="/art/a4-submit-success.webp" alt="" width={600} height={450} className="animate-float mix-blend-multiply [mask-image:radial-gradient(closest-side,#000_70%,transparent)]" />
            </div>
            <div data-tour="home-pay" className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#17285a_0%,#0b1636_55%,#050a1a_100%)] p-6 text-white shadow-[0_40px_80px_-30px_rgba(36,99,232,.55)] ring-1 ring-white/10 sm:p-7">
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.35),transparent_70%)]" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-[radial-gradient(circle,rgba(142,229,63,.28),transparent_70%)]" />
              <dl className="relative grid gap-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#c7cedd]">
                  <Landmark size={16} aria-hidden="true" />
                  <dt className="sr-only">{t.home.bank}</dt>
                  <dd>{bank.name}</dd>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="grid gap-1">
                    <dt className="text-xs text-[#8e9ab8]">{t.home.account}</dt>
                    <dd className="font-heading text-[clamp(1.5rem,5vw,2rem)] font-bold tabular-nums tracking-[0.05em]">{bank.account}</dd>
                  </div>
                  <CopyButton value={bank.account} label={t.home.copy} done={t.home.copied} />
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs text-[#8e9ab8]">{t.home.holder}</dt>
                  <dd className="font-semibold">{bank.holder}</dd>
                </div>
              </dl>
            </div>
            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--blue)] px-6 py-3.5 font-heading font-semibold text-white shadow-[0_4px_0_#1a47b0,0_16px_30px_-10px_rgba(36,99,232,.6)] transition hover:brightness-110 active:translate-y-[3px] active:shadow-[0_1px_0_#1a47b0]"
            >
              {t.home.submitTitle} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
