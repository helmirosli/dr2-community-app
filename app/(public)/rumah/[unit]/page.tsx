import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Clock } from "lucide-react";

import { GuardhouseScene, LAMP_BY_STATE } from "@/app/components/guardhouse-scene";
import { ProgressRing } from "@/app/components/progress-ring";
import { TourButton } from "@/app/components/tour/tour-button";
import { StatusPill, stateStyles } from "@/app/components/status";
import { getDictionary, getLocale } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN, formatRM } from "@/lib/money";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { firstName, isFutureMonth, monthName, monthState } from "@/lib/status";
import { fill } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function HousePage({
  params,
  searchParams,
}: {
  params: Promise<{ unit: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ unit: rawUnit }, { year: rawYear }] = await Promise.all([params, searchParams]);
  const unit = decodeURIComponent(rawUnit).trim();
  const now = new Date();
  const year = Math.min(2100, Math.max(2020, Number(rawYear) || now.getFullYear()));

  const [t, locale, grid, report, pending] = await Promise.all([
    getDictionary(),
    getLocale(),
    getYearGridData({ year, includeInactive: true }),
    getMonthlyReport({ year: now.getFullYear(), month: now.getMonth() + 1, includeInactive: true }),
    prisma.publicPaymentSubmission.findMany({
      where: { unitNumber: unit, status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      select: {
        unitNumber: true,
        amountSen: true,
        createdAt: true,
        paymentType: true,
        coverageStartYear: true,
        coverageStartMonth: true,
        coverageEndYear: true,
        coverageEndMonth: true,
      },
    }),
  ]);

  const row = grid.rows.find((r) => r.unitNumber === unit);
  const summary = report.rows.find((r) => r.unitNumber === unit);

  if (!row || !summary) {
    return (
      <section className="mx-auto grid max-w-md content-center justify-items-center gap-5 px-4 py-24 text-center">
        <h1 className="font-heading text-3xl font-bold">{fill(t.house.notFound, { unit })}</h1>
        <Link href="/" className="rounded-full bg-[var(--lime)] px-5 py-2.5 font-semibold text-[#06210b]">
          {t.house.tryAgain}
        </Link>
      </section>
    );
  }

  const pendingMap = getPendingSubmissionsMap(pending.filter((p) => p.paymentType === "MONTHLY_FEE"));
  const months = row.months.map((amountSen, i) => {
    const month = i + 1;
    const state = monthState({
      amountSen,
      override: row.monthStatusOverrides[i],
      residentStatus: row.monthStatus[i],
      isFuture: isFutureMonth(year, month, now),
      pending: (amountSen ?? 0) < DEFAULT_MONTHLY_FEE_SEN && pendingMap.has(`${unit}:${year}:${month}`),
    });
    return { month, amountSen, state };
  });

  const thisMonthState =
    year === now.getFullYear()
      ? months[now.getMonth()].state
      : monthState({
          amountSen: summary.selectedAppliedSen,
          residentStatus: summary.status,
          isFuture: false,
          pending: pendingMap.has(`${unit}:${now.getFullYear()}:${now.getMonth() + 1}`),
        });

  const paidUntil =
    summary.paidUntilYear && summary.paidUntilMonth ? monthName(locale, summary.paidUntilYear, summary.paidUntilMonth, "long") : t.house.never;
  const owedMonths = year === now.getFullYear() ? months.filter((m) => m.state === "unpaid" || m.state === "partial") : [];
  const owedSen = owedMonths.reduce((sum, m) => sum + DEFAULT_MONTHLY_FEE_SEN - (m.amountSen ?? 0), 0);
  const dateFmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short" });

  const paidCount = months.filter((m) => m.state === "paid" || m.state === "ahead").length;
  const owes = owedMonths.length > 0;
  const allClear = !owes && (thisMonthState === "paid" || thisMonthState === "ahead");
  const lamp = LAMP_BY_STATE[thisMonthState];
  const submitHref = `/submit?unit=${encodeURIComponent(unit)}${owes ? `&count=${owedMonths.length}` : ""}`;
  const isThisMonth = (month: number) => year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-14 pt-8 sm:pt-12">
        <div className="mx-auto grid max-w-4xl items-center gap-x-10 gap-y-2 md:grid-cols-[340px_1fr]">
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--cyan)] hover:underline">
              <ChevronLeft size={16} /> {t.house.home}
            </Link>
            <TourButton id="resident-house" />
          </div>

          {/* The house itself: a clay model whose lamp glows in this month's status colour. */}
          <div data-tour="rumah-lamp">
            <GuardhouseScene lamp={lamp} plate={unit} fireflies={allClear} className="w-[min(300px,78vw)] md:w-full" />
          </div>

          <div className="grid justify-items-center gap-3 text-center md:justify-items-start md:text-left">
            <p className="text-blend font-heading text-sm font-semibold">{fill(t.house.hello, { name: firstName(row.name) })}</p>
            <h1 className="font-heading text-[clamp(2.4rem,8vw,4rem)] font-bold leading-none tracking-tight">{fill(t.house.title, { unit })}</h1>
            <StatusPill state={thisMonthState} label={`${t.house.thisMonth}: ${t.states[thisMonthState]}`} className="px-4 py-1.5 text-sm" />

            {owes ? (
              <div className="mt-1 grid w-full max-w-sm gap-1 rounded-3xl border border-[#ff8a6e]/25 bg-[#3d1a16]/60 px-5 py-4">
                <p className="text-sm text-[#ffb5a3]">{fill(t.house.owedLabel, { count: owedMonths.length })}</p>
                <p className="font-heading text-4xl font-bold tabular-nums tracking-tight text-white">{formatRM(owedSen)}</p>
                <p className="text-sm text-[#a1a1a6]">
                  {t.house.paidUntil} <strong className="text-white">{paidUntil}</strong>
                </p>
              </div>
            ) : (
              <p className="text-[#a1a1a6]">
                {allClear && <span className="mr-1.5">{t.house.thanks}</span>}
                {t.house.paidUntil} <strong className="font-heading text-white">{paidUntil}</strong>
              </p>
            )}

            <Link
              href={submitHref}
              data-tour="rumah-pay"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--lime)] px-6 py-3 font-heading font-semibold text-[#06210b] shadow-[0_4px_0_#4d9a12,0_14px_30px_-8px_rgba(142,229,63,.6)] transition hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#4d9a12]"
            >
              {owes ? fill(t.house.payOwed, { amount: formatRM(owedSen) }) : t.house.payNext}
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--paper)] px-4 py-12 text-[var(--ink)] sm:py-16">
        <div className="mx-auto grid max-w-3xl gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ProgressRing value={paidCount} max={12} size={56} />
              <p className="leading-tight">
                <span className="font-heading text-2xl font-bold tabular-nums">{paidCount}</span>
                <span className="text-[var(--ink-2)]"> / 12</span>
                <span className="block text-xs text-[var(--ink-2)]">{t.house.monthsPaid}</span>
              </p>
            </div>
            <div data-tour="rumah-year" className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
              <Link aria-label={`${t.house.year} ${year - 1}`} href={`?year=${year - 1}`} className="grid size-10 place-items-center rounded-full hover:bg-black/5">
                <ChevronLeft size={20} />
              </Link>
              <p className="px-1 font-heading text-xl font-bold tabular-nums">{year}</p>
              <Link aria-label={`${t.house.year} ${year + 1}`} href={`?year=${year + 1}`} className="grid size-10 place-items-center rounded-full hover:bg-black/5">
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>

          <ol data-tour="rumah-months" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {months.map(({ month, amountSen, state }, i) => {
              const Icon = state === "paid" || state === "ahead" ? Check : state === "pending" ? Clock : state === "unpaid" || state === "partial" ? CircleAlert : null;
              const payable = state === "unpaid" || state === "partial";
              const tile = (
                <>
                  {Icon && <Icon size={14} strokeWidth={3} className="absolute right-2 top-2 opacity-70" />}
                  <span className="font-heading text-base font-bold">{monthName(locale, year, month)}</span>
                  {state === "partial" && amountSen ? (
                    <>
                      <span className="text-[11px] font-medium">{fill(t.house.paidSoFar, { amount: formatRM(amountSen) })}</span>
                      <span className="text-[11px] font-semibold">{fill(t.house.leftToPay, { amount: formatRM(Math.max(0, DEFAULT_MONTHLY_FEE_SEN - amountSen)) })}</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-medium">{amountSen && state !== "pending" ? formatRM(amountSen) : t.states[state]}</span>
                  )}
                  {payable && <span className="text-[10px] font-semibold underline underline-offset-2">{t.house.tapToPay}</span>}
                </>
              );
              const cls = `relative grid h-full min-h-[7.5rem] content-center gap-0.5 rounded-2xl px-3 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_3px_0_rgba(0,0,0,.08)] ${stateStyles[state].tile} ${
                isThisMonth(month) ? "outline outline-2 outline-offset-2 outline-[var(--blue)]" : ""
              }`;
              return (
                <li key={month} className="animate-pop" style={{ animationDelay: `${i * 45}ms` }}>
                  {payable ? (
                    <Link href={submitHref} className={`${cls} transition hover:-translate-y-0.5 active:translate-y-[2px]`}>
                      {tile}
                    </Link>
                  ) : (
                    <div className={cls} aria-current={isThisMonth(month) ? "date" : undefined}>
                      {tile}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap justify-center gap-1.5">
            {(["paid", "pending", "unpaid", "upcoming"] as const).map((s) => (
              <StatusPill key={s} state={s} label={t.states[s]} />
            ))}
          </div>

          {pending.length > 0 && (
            <ul className="grid gap-2">
              {pending.map((p) => (
                <li key={p.createdAt.toISOString()} className="flex items-center gap-2 rounded-2xl bg-[#ddf5fd] px-4 py-3 text-sm text-[#0b6e8e]">
                  <Clock size={16} className="shrink-0" />
                  {fill(t.house.pendingSince, { amount: formatRM(p.amountSen), date: dateFmt.format(p.createdAt) })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
