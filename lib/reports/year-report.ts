import { malaysiaToday } from "@/lib/dates";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { clampReportYear } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { isFutureMonth, monthState, type MonthState } from "@/lib/status";
import { billingNow } from "@/lib/months";

export const SHOWS = ["all", "paid", "arrears", "pending", "hold"] as const;
export type Show = (typeof SHOWS)[number];

export type HoldKind = "FOR_SALE" | "MOVED_OUT" | "EXEMPT";

export type ReportCell = {
  state: MonthState;
  /** What was paid for this month (applied), in sen. */
  amountSen: number;
  /** A receipt waiting for review that would cover this month. */
  pending: { sen: number; carry: boolean } | null;
  /** Why a month does not apply to this house (for sale, moved out, exempt). */
  hold: HoldKind | null;
};

export type ReportExtra = { state: MonthState; sen: number } | null;

export type ReportRow = {
  residentId: string;
  no: number;
  unit: string;
  name: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  isForSale: boolean;
  cells: ReportCell[];
  /** One per special-collection column: pending, outstanding, or settled (sen is the amount shown). */
  extras: ReportExtra[];
  /** Everything paid towards this year's months. */
  paidSen: number;
  /** Shortfall in months that have fallen due and are unpaid or part paid (receipts waiting do not count). */
  arrearsSen: number;
  pendingCount: number;
  /** ACTIVE and every month so far is paid. */
  paidAll: boolean;
  /** ACTIVE and at least one month so far is not fully paid. */
  hasArrears: boolean;
};

export type YearReport = {
  year: number;
  rows: ReportRow[];
  collections: { id: string; title: string }[];
  /** 0-based month to highlight (this month), or null when the year is not the current one. */
  highlightMonth: number | null;
};

export function parseReportParams(params: { year?: string; includeInactive?: string; q?: string; show?: string; totals?: string }) {
  const today = malaysiaToday(billingNow());
  return {
    year: clampReportYear(params.year, today.year),
    includeInactive: params.includeInactive !== "off",
    q: params.q?.trim() ?? "",
    /** Paid / Owes columns and the Total row are hidden unless asked for. */
    totals: params.totals === "1",
    show: ((SHOWS as readonly string[]).includes(params.show ?? "") ? params.show : "all") as Show,
  };
}

/** The year-by-month grid with every cell's state, per-house totals and arrears worked out. */
export async function getYearReport(year: number, includeInactive: boolean): Promise<YearReport> {
  const now = billingNow();
  const today = malaysiaToday(now);

  const [{ rows: gridRows, specialCollections }, pendingMonthly, pendingCollections] = await Promise.all([
    getYearGridData({ year, includeInactive }),
    prisma.publicPaymentSubmission.findMany({
      where: { paymentType: "MONTHLY_FEE", status: "PENDING_REVIEW", coverageStartYear: { lte: year }, coverageEndYear: { gte: year } },
      select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
    }),
    prisma.publicPaymentSubmission.findMany({
      where: { paymentType: "SPECIAL_COLLECTION", status: "PENDING_REVIEW", specialCollectionId: { not: null } },
      select: { unitNumber: true, amountSen: true, specialCollectionId: true },
    }),
  ]);
  const pendingMap = getPendingSubmissionsMap(pendingMonthly);
  const pendingCollectionMap = new Map<string, number>();
  for (const sub of pendingCollections) {
    if (!sub.specialCollectionId) continue;
    const key = `${sub.unitNumber}:${sub.specialCollectionId}`;
    pendingCollectionMap.set(key, (pendingCollectionMap.get(key) ?? 0) + sub.amountSen);
  }

  // Months that have fallen due: all of a past year, up to this month in the current year, none in a future year.
  const monthsDue = year < today.year ? 12 : year === today.year ? today.month : 0;

  const rows: ReportRow[] = gridRows.map((row) => {
    let paidSen = 0;
    let arrearsSen = 0;
    let pendingCount = 0;

    const cells: ReportCell[] = row.months.map((amountSen, i) => {
      const pending = pendingMap.get(`${row.unitNumber}:${year}:${i + 1}`);
      const state = monthState({
        amountSen,
        override: row.monthStatusOverrides[i],
        residentStatus: row.monthStatus[i],
        isFuture: isFutureMonth(year, i + 1, now),
        pending: Boolean(pending),
      });
      paidSen += amountSen ?? 0;
      if (pending) pendingCount += 1;
      if (i < monthsDue && (state === "unpaid" || state === "partial")) arrearsSen += DEFAULT_MONTHLY_FEE_SEN - (amountSen ?? 0);
      const holdStatus = row.monthStatusOverrides[i] ?? row.monthStatus[i];
      return {
        state,
        amountSen: amountSen ?? 0,
        pending: pending ? { sen: pending.appliedSen, carry: Boolean(pending.isCarryForward) } : null,
        hold: state === "hold" && holdStatus !== "ACTIVE" ? holdStatus : null,
      };
    });

    const extras = specialCollections.map((sc): ReportExtra => {
      const assignment = row.assignments.find((a) => a.specialCollectionId === sc.id);
      const waiting = pendingCollectionMap.get(`${row.unitNumber}:${sc.id}`) ?? 0;
      if (waiting) return { state: "pending", sen: waiting };
      if (!assignment) return null;
      return assignment.outstanding > 0 ? { state: "partial", sen: assignment.outstanding } : { state: "paid", sen: 0 };
    });

    const soFar = row.months.slice(0, monthsDue);
    return {
      residentId: row.residentId,
      no: row.no,
      unit: row.unitNumber,
      name: row.name,
      status: row.status,
      isForSale: row.isForSale,
      cells,
      extras,
      paidSen,
      arrearsSen,
      pendingCount,
      paidAll: row.status === "ACTIVE" && monthsDue > 0 && soFar.every((m) => (m ?? 0) >= DEFAULT_MONTHLY_FEE_SEN),
      hasArrears: row.status === "ACTIVE" && soFar.some((m) => (m ?? 0) < DEFAULT_MONTHLY_FEE_SEN),
    };
  });

  return {
    year,
    rows,
    collections: specialCollections.map((sc) => ({ id: sc.id, title: sc.title })),
    highlightMonth: year === today.year ? today.month - 1 : null,
  };
}
