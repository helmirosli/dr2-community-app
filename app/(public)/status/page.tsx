import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";

import { StatusPill, stateStyles } from "@/app/components/status";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { getDictionary, getLocale } from "@/lib/i18n";
import { clampReportYear, getMonthlyReport } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { prisma } from "@/lib/prisma";
import { isFutureMonth, monthName, monthState, type MonthState } from "@/lib/status";
import { StatusCards, type StatusCardRow } from "./status-cards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StatusPageProps = {
  searchParams: Promise<{ year?: string }>;
};

const LEGEND: MonthState[] = ["paid", "ahead", "pending", "partial", "unpaid", "hold"];

function fmtCell(amountSen: number) {
  return `RM${(amountSen / 100).toFixed(2)}`;
}

export default async function StatusPage({ searchParams }: StatusPageProps) {
  const params = await searchParams;
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);

  const now = new Date();
  const selectedYear = clampReportYear(params.year, now.getFullYear());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { rows: unsortedRows, specialCollections } = await getYearGridData({
    year: selectedYear,
    includeInactive: true,
  });

  const pendingSubmissions = await prisma.publicPaymentSubmission.findMany({
    where: {
      paymentType: "MONTHLY_FEE",
      status: "PENDING_REVIEW",
      coverageStartYear: { lte: selectedYear },
      coverageEndYear: { gte: selectedYear },
    },
    select: {
      unitNumber: true,
      amountSen: true,
      coverageStartYear: true,
      coverageStartMonth: true,
      coverageEndYear: true,
      coverageEndMonth: true,
    },
  });

  const pendingMap = getPendingSubmissionsMap(pendingSubmissions);

  // Fetch pending special collection submissions: key = "unitNumber:collectionId"
  const pendingCollectionSubmissions = await prisma.publicPaymentSubmission.findMany({
    where: {
      paymentType: "SPECIAL_COLLECTION",
      status: "PENDING_REVIEW",
      specialCollectionId: { not: null },
    },
    select: {
      unitNumber: true,
      amountSen: true,
      specialCollectionId: true,
    },
  });

  const pendingCollectionMap = new Map<string, number>();
  for (const sub of pendingCollectionSubmissions) {
    if (!sub.specialCollectionId) continue;
    const key = `${sub.unitNumber}:${sub.specialCollectionId}`;
    pendingCollectionMap.set(key, (pendingCollectionMap.get(key) ?? 0) + sub.amountSen);
  }

  const rows = [...unsortedRows].sort((a, b) => {
    const unitA = parseInt(a.unitNumber, 10);
    const unitB = parseInt(b.unitNumber, 10);
    return unitA - unitB;
  });

  const hasExtra = specialCollections.length > 0 || rows.some((r) => r.extraDueSen > 0);
  const extraCols = specialCollections.length > 0 ? specialCollections.length : hasExtra ? 1 : 0;

  const report = await getMonthlyReport({ year: currentYear, month: currentMonth, includeInactive: true });
  const paidUntilByUnit = new Map(
    report.rows.map((r) => [
      r.unitNumber,
      r.paidUntilYear && r.paidUntilMonth ? monthName(locale, r.paidUntilYear, r.paidUntilMonth, "long") : null,
    ]),
  );

  const view = rows.map((row) => ({
    row,
    cells: row.months.map((amountSen, i) => {
      const pending = pendingMap.get(`${row.unitNumber}:${selectedYear}:${i + 1}`);
      return {
        amountSen,
        pending,
        state: monthState({
          amountSen,
          override: row.monthStatusOverrides[i],
          residentStatus: row.status,
          isFuture: isFutureMonth(selectedYear, i + 1, now),
          pending: Boolean(pending),
        }),
      };
    }),
  }));

  const cardRows: StatusCardRow[] = view.map(({ row, cells }) => {
    const until = paidUntilByUnit.get(row.unitNumber);
    return {
      unit: row.unitNumber,
      name: row.name,
      states: cells.map((c) => c.state),
      paidUntil: until ? t.statusBoard.paidUntil.replace("{month}", until) : t.statusBoard.noPayment,
    };
  });

  const holdLabel = (status: string, override: string | null) => {
    const s = override ?? status;
    return s === "FOR_SALE" ? t.residents.forSale : s === "MOVED_OUT" ? t.residents.movedOut : s === "EXEMPT" ? t.residents.exempt : "";
  };

  return (
    <>
      <section className="px-4 pb-12 pt-12 sm:pt-16">
        <div className="mx-auto grid max-w-3xl justify-items-center gap-4 text-center">
          <h1 className="font-heading text-[clamp(2.2rem,6vw,3.6rem)] font-bold leading-tight tracking-tight">{t.publicStatus.title}</h1>
          <p className="max-w-xl text-[#a1a1a6]">{t.publicStatus.subtitle.replace("{year}", String(selectedYear))}</p>
          <div className="flex items-center gap-3">
            <Link aria-label={String(selectedYear - 1)} href={`?year=${selectedYear - 1}`} className="rounded-full p-2 hover:bg-white/10">
              <ChevronLeft size={20} />
            </Link>
            <span className="font-heading text-2xl font-bold tabular-nums">{selectedYear}</span>
            <Link aria-label={String(selectedYear + 1)} href={`?year=${selectedYear + 1}`} className="rounded-full p-2 hover:bg-white/10">
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--paper)] px-4 py-10 text-[var(--ink)] sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {LEGEND.map((s) => (
              <StatusPill key={s} state={s} label={t.states[s]} />
            ))}
          </div>

          {/* Phones: house cards */}
          <div className="md:hidden">
            <StatusCards
              rows={cardRows}
              labels={{
                all: t.statusBoard.filterAll,
                unpaid: t.statusBoard.filterUnpaid,
                pending: t.statusBoard.filterPending,
                search: t.statusBoard.search,
                noMatch: t.statusBoard.noMatch,
                states: t.states,
              }}
            />
          </div>

          {/* Tablet and up: the familiar year grid */}
          <div className="hidden max-h-[75vh] overflow-auto rounded-3xl bg-white ring-1 ring-black/5 md:block">
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[var(--night)] text-white">
                  <th className="sticky left-0 z-10 bg-[var(--night)] px-3 py-3 font-semibold">{t.publicStatus.unit}</th>
                  <th className="min-w-36 px-3 py-3 font-semibold">{t.publicStatus.name}</th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th
                      key={i}
                      className={`px-1.5 py-3 text-center font-semibold ${
                        selectedYear === currentYear && i + 1 === currentMonth ? "text-[var(--lime)]" : "text-[#c7cedd]"
                      }`}
                    >
                      {monthName(locale, selectedYear, i + 1)}
                    </th>
                  ))}
                  {specialCollections.map((sc) => (
                    <th className="px-2 py-3 text-center font-semibold text-[#f5b400]" key={sc.id}>
                      {sc.title}
                    </th>
                  ))}
                  {hasExtra && specialCollections.length === 0 && (
                    <th className="px-2 py-3 text-center font-semibold text-[#f5b400]">{t.publicStatus.extra}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {view.map(({ row, cells }) => (
                  <tr key={row.unitNumber} className="group">
                    <td className="sticky left-0 z-10 border-b border-black/5 bg-white px-3 py-2 font-heading font-bold group-hover:bg-[#fafafa]">
                      <Link href={`/rumah/${encodeURIComponent(row.unitNumber)}`} className="hover:text-[var(--blue)]">
                        {row.unitNumber}
                      </Link>
                    </td>
                    <td className="min-w-36 border-b border-black/5 px-3 py-2 font-medium group-hover:bg-[#fafafa]">{row.name}</td>
                    {cells.map(({ amountSen, pending, state }, i) => (
                      <td key={i} className="border-b border-black/5 p-1 text-center group-hover:bg-[#fafafa]">
                        <span
                          className={`grid min-h-8 min-w-12 place-items-center rounded-lg px-1 text-[11px] font-semibold ${stateStyles[state].tile}`}
                          title={t.states[state]}
                        >
                          {pending
                            ? fmtCell(pending.appliedSen)
                            : state === "hold"
                              ? holdLabel(row.status, row.monthStatusOverrides[i])
                              : state === "paid" || state === "ahead"
                                ? "✓"
                                : amountSen
                                  ? fmtCell(amountSen)
                                  : ""}
                        </span>
                      </td>
                    ))}
                    {specialCollections.length > 0
                      ? specialCollections.map((sc) => {
                          const assignment = row.assignments.find((a) => a.specialCollectionId === sc.id);
                          const pendingAmountSen = pendingCollectionMap.get(`${row.unitNumber}:${sc.id}`) ?? 0;
                          const state: MonthState | null = pendingAmountSen
                            ? "pending"
                            : !assignment
                              ? null
                              : assignment.outstanding > 0
                                ? "partial"
                                : "paid";
                          return (
                            <td key={sc.id} className="border-b border-black/5 p-1 text-center group-hover:bg-[#fafafa]">
                              {state ? (
                                <span className={`grid min-h-8 place-items-center rounded-lg px-1 text-[11px] font-semibold ${stateStyles[state].tile}`}>
                                  {pendingAmountSen ? fmtCell(pendingAmountSen) : assignment && assignment.outstanding > 0 ? fmtCell(assignment.outstanding) : "✓"}
                                </span>
                              ) : (
                                <span className="text-[#c7c7cc]">—</span>
                              )}
                            </td>
                          );
                        })
                      : extraCols > 0 && (
                          <td className="border-b border-black/5 p-1 text-center">
                            {row.extraOutstandingSen > 0 ? (
                              <span className={`grid min-h-8 place-items-center rounded-lg text-[11px] font-semibold ${stateStyles.partial.tile}`}>
                                {fmtCell(row.extraOutstandingSen)}
                              </span>
                            ) : row.extraDueSen > 0 ? (
                              "✓"
                            ) : (
                              <span className="text-[#c7c7cc]">—</span>
                            )}
                          </td>
                        )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-[var(--ink-2)]" colSpan={14 + extraCols}>
                      {t.publicStatus.noRecords}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <ShieldAlert className="shrink-0 text-[var(--cyan)]" size={20} aria-hidden="true" />
            <div>
              <h2 className="font-semibold">{t.publicStatus.privacyTitle}</h2>
              <p className="mt-1 text-sm text-[var(--ink-2)]">{t.publicStatus.privacyDesc}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
