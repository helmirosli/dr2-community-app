import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { StatusPill, stateStyles } from "@/app/components/status";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { firstName, isFutureMonth, monthName, monthState } from "@/lib/status";

export const dynamic = "force-dynamic";

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

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
      pending: !amountSen && pendingMap.has(`${unit}:${year}:${month}`),
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
  const dateFmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short" });

  return (
    <>
      <section className="px-4 pb-14 pt-12 sm:pt-16">
        <div className="mx-auto grid max-w-2xl justify-items-center gap-4 text-center">
          <p className="text-blend font-heading text-sm font-semibold">{firstName(row.name)}</p>
          <h1 className="font-heading text-[clamp(2.4rem,8vw,4rem)] font-bold leading-none tracking-tight">{fill(t.house.title, { unit })}</h1>
          <StatusPill state={thisMonthState} label={`${t.house.thisMonth}: ${t.states[thisMonthState]}`} className="px-4 py-1.5 text-sm" />
          <p className="text-[#a1a1a6]">
            {t.house.paidUntil} <strong className="font-heading text-white">{paidUntil}</strong>
          </p>
          <Link
            href={`/submit?unit=${encodeURIComponent(unit)}`}
            className="mt-2 rounded-full bg-[var(--lime)] px-6 py-3 font-heading font-semibold text-[#06210b] hover:brightness-105"
          >
            {t.house.payNext}
          </Link>
        </div>
      </section>

      <section className="bg-[var(--paper)] px-4 py-12 text-[var(--ink)] sm:py-16">
        <div className="mx-auto grid max-w-3xl gap-6">
          <div className="flex items-center justify-center gap-4">
            <Link aria-label={`${t.house.year} ${year - 1}`} href={`?year=${year - 1}`} className="rounded-full p-2 hover:bg-black/5">
              <ChevronLeft size={20} />
            </Link>
            <p className="font-heading text-2xl font-bold tabular-nums">{year}</p>
            <Link aria-label={`${t.house.year} ${year + 1}`} href={`?year=${year + 1}`} className="rounded-full p-2 hover:bg-black/5">
              <ChevronRight size={20} />
            </Link>
          </div>

          <ol className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {months.map(({ month, amountSen, state }) => (
              <li key={month} className={`grid gap-0.5 rounded-2xl px-3 py-3 text-center ${stateStyles[state].tile}`}>
                <span className="font-heading text-sm font-bold">{monthName(locale, year, month)}</span>
                <span className="text-[11px] font-medium">{amountSen ? formatRM(amountSen) : t.states[state]}</span>
              </li>
            ))}
          </ol>

          {pending.length > 0 && (
            <ul className="grid gap-2">
              {pending.map((p) => (
                <li key={p.createdAt.toISOString()} className="rounded-2xl bg-[#ddf5fd] px-4 py-3 text-sm text-[#0b6e8e]">
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
