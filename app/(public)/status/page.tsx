import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProgressRing } from "@/app/components/progress-ring";
import { StatusPill } from "@/app/components/status";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { getDictionary, getLocale } from "@/lib/i18n";
import { clampReportYear, getMonthlyReport } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { prisma } from "@/lib/prisma";
import { isFutureMonth, monthName, monthState, type MonthState } from "@/lib/status";
import { StatusBoard, type BoardCell, type BoardRow } from "./status-board";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StatusPageProps = {
  searchParams: Promise<{ year?: string }>;
};

const LEGEND: MonthState[] = ["paid", "ahead", "pending", "partial", "unpaid", "hold"];

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

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

  const { rows, specialCollections } = await getYearGridData({
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

  // Pending special-collection submissions: key = "unitNumber:collectionId"
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

  const report = await getMonthlyReport({ year: currentYear, month: currentMonth, includeInactive: true });
  const paidUntilByUnit = new Map(
    report.rows.map((r) => [
      r.unitNumber,
      r.paidUntilYear && r.paidUntilMonth ? monthName(locale, r.paidUntilYear, r.paidUntilMonth, "long") : null,
    ]),
  );

  const holdLabel = (status: string, override: string | null) => {
    const s = override ?? status;
    return s === "FOR_SALE" ? t.residents.forSale : s === "MOVED_OUT" ? t.residents.movedOut : s === "EXEMPT" ? t.residents.exempt : "";
  };

  // Rows arrive in numeric house order from getYearGridData.
  const counts: Record<MonthState, number> = { paid: 0, ahead: 0, pending: 0, partial: 0, unpaid: 0, hold: 0, upcoming: 0 };

  const monthPaid = Array<number>(12).fill(0);
  const monthDue = Array<number>(12).fill(0);

  const boardRows: BoardRow[] = rows.map((row) => {
    const cells: BoardCell[] = row.months.map((amountSen, i) => {
      const pending = pendingMap.get(`${row.unitNumber}:${selectedYear}:${i + 1}`);
      const state = monthState({
        amountSen,
        override: row.monthStatusOverrides[i],
        residentStatus: row.monthStatus[i],
        isFuture: isFutureMonth(selectedYear, i + 1, now),
        pending: Boolean(pending),
      });
      counts[state] += 1;
      if (state === "paid" || state === "ahead") monthPaid[i] += 1;
      if (state === "paid" || state === "ahead" || state === "pending" || state === "partial" || state === "unpaid") monthDue[i] += 1;
      const text = pending
        ? fmtCell(pending.appliedSen)
        : state === "hold"
          ? holdLabel(row.monthStatus[i], row.monthStatusOverrides[i])
          : state === "paid" || state === "ahead"
            ? ""
            : amountSen
              ? fmtCell(amountSen)
              : "";
      return { state, text };
    });

    const extras = specialCollections.map((sc): BoardCell | null => {
      const assignment = row.assignments.find((a) => a.specialCollectionId === sc.id);
      const pendingAmountSen = pendingCollectionMap.get(`${row.unitNumber}:${sc.id}`) ?? 0;
      if (pendingAmountSen) return { state: "pending", text: fmtCell(pendingAmountSen) };
      if (!assignment) return null;
      return assignment.outstanding > 0 ? { state: "partial", text: fmtCell(assignment.outstanding) } : { state: "paid", text: "" };
    });

    const until = paidUntilByUnit.get(row.unitNumber);
    return {
      unit: row.unitNumber,
      name: row.name,
      paidUntil: until ? t.statusBoard.paidUntil.replace("{month}", until) : t.statusBoard.noPayment,
      cells,
      extras,
    };
  });

  // Year summary: of every month that has fallen due (or been paid ahead), how many are paid?
  const paidCells = counts.paid + counts.ahead;
  const dueCells = paidCells + counts.pending + counts.partial + counts.unpaid;
  const pct = dueCells ? Math.round((paidCells / dueCells) * 100) : 0;

  const inCurrentYear = selectedYear === currentYear;
  const monthNames = Array.from({ length: 12 }, (_, i) => monthName(locale, selectedYear, i + 1));
  const focusMonth = inCurrentYear ? currentMonth - 1 : selectedYear < currentYear ? 11 : 0;

  return (
    <>
      <section className="px-4 pb-24 pt-12 sm:pt-16">
        <div className="mx-auto grid max-w-3xl justify-items-center gap-4 text-center">
          <h1 className="font-heading text-[clamp(2.2rem,6vw,3.6rem)] font-bold leading-tight tracking-tight">{t.publicStatus.title}</h1>
          <p className="max-w-xl text-[#a1a1a6]">{t.publicStatus.subtitle.replace("{year}", String(selectedYear))}</p>
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/10">
            <Link aria-label={String(selectedYear - 1)} href={`?year=${selectedYear - 1}`} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
              <ChevronLeft size={20} />
            </Link>
            <span className="px-2 font-heading text-2xl font-bold tabular-nums">{selectedYear}</span>
            <Link aria-label={String(selectedYear + 1)} href={`?year=${selectedYear + 1}`} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--paper)] px-4 pb-10 text-[var(--ink)] sm:pb-14">
        <div className="mx-auto grid max-w-7xl gap-6">
          {/* Summary card: overlaps the night band above. */}
          <div className="relative z-10 -mt-16 flex flex-wrap items-center gap-x-5 gap-y-5 rounded-[28px] sm:gap-x-8 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,.04),0_24px_48px_-28px_rgba(0,0,0,.3)] ring-1 ring-black/5 sm:p-7">
            <ProgressRing value={paidCells} max={dueCells} size={96} stroke={6}>
              <span className="font-heading text-xl font-bold tabular-nums">{pct}%</span>
            </ProgressRing>
            <div className="grid min-w-0 flex-1 basis-40 gap-3">
              <div>
                <p className="font-heading text-sm font-semibold text-[var(--ink-2)]">{selectedYear}</p>
                <p className="font-heading text-xl font-bold leading-tight sm:text-2xl">{fill(t.statusBoard.monthsPaid, { paid: paidCells, due: dueCells })}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LEGEND.map((s) =>
                  counts[s] > 0 ? <StatusPill key={s} state={s} label={`${t.states[s]} · ${counts[s]}`} /> : null,
                )}
              </div>
            </div>
            {/* How much of each month was collected, at a glance. */}
            <div className="ml-auto hidden items-end gap-1.5 lg:flex" role="img" aria-label={monthNames.map((m, i) => `${m}: ${monthPaid[i]} / ${monthDue[i]}`).join(", ")}>
              {monthNames.map((m, i) => {
                const ratio = monthDue[i] ? monthPaid[i] / monthDue[i] : 0;
                const isNow = inCurrentYear && i === currentMonth - 1;
                return (
                  <div key={i} className="grid justify-items-center gap-1.5" title={`${m}: ${monthPaid[i]} / ${monthDue[i]}`}>
                    <span className="relative h-16 w-5 overflow-hidden rounded-full bg-[#eef0f4]">
                      <span
                        className="animate-grow absolute inset-x-0 bottom-0 origin-bottom rounded-full bg-[image:var(--blend)]"
                        style={{ height: `${Math.round(ratio * 100)}%`, animationDelay: `${i * 45}ms` }}
                      />
                    </span>
                    <span className={`text-[10px] font-semibold ${isNow ? "text-[var(--ink)]" : "text-[var(--ink-2)]"}`}>{m.slice(0, 1)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <StatusBoard
            rows={boardRows}
            months={monthNames}
            collections={specialCollections.map((sc) => ({
              id: sc.id,
              title: sc.title,
              note: sc.carriedFrom ? fill(t.statusBoard.carriedFrom, { year: sc.carriedFrom }) : null,
            }))}
            focusMonth={focusMonth}
            highlightMonth={inCurrentYear ? currentMonth - 1 : null}
            labels={{
              all: t.statusBoard.filterAll,
              unpaid: t.statusBoard.filterUnpaid,
              pending: t.statusBoard.filterPending,
              search: t.statusBoard.search,
              noMatch: t.statusBoard.noMatch,
              noRecords: t.publicStatus.noRecords,
              unit: t.publicStatus.unit,
              name: t.publicStatus.name,
              states: t.states,
            }}
          />
        </div>
      </section>
    </>
  );
}
