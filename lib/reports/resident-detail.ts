import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS, paymentRowSelect, toLedgerPayment, type LedgerPayment } from "@/lib/reports/payments-ledger";
import type { ResidentStatus } from "@/lib/reports/residents-directory";
import { getYearGridData, type YearGridRow } from "@/lib/reports/year-grid-data";
import { isFutureMonth, monthState, type MonthState } from "@/lib/status";

export { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS };

export function parseResidentParams(params: { year?: string; page?: string; perPage?: string }) {
  const perPageNumber = parseInt(params.perPage ?? "", 10);
  const year = parseInt(params.year ?? "", 10);
  return {
    /** null = this year. Clamped to the years the house has records for once they are known. */
    year: Number.isFinite(year) ? year : null,
    perPage: PER_PAGE_OPTIONS.includes(perPageNumber) ? perPageNumber : DEFAULT_PER_PAGE,
    page: Math.max(1, parseInt(params.page ?? "1", 10) || 1),
  };
}

export type YearMonth = { month: number; amountSen: number | null; state: MonthState };

export type ResidentCollection = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  dueSen: number;
  paidSen: number;
  owedSen: number;
};

export type ResidentDetail = {
  id: string;
  unit: string;
  name: string;
  status: ResidentStatus;
  phone: string | null;
  email: string | null;
  block: string | null;
  address: string;
  notes: string | null;

  thisYear: number;
  thisMonth: number;
  /** The year the month tiles show, and the first and last year worth browsing. */
  year: number;
  years: { min: number; max: number };
  months: YearMonth[];
  /** Months of this calendar year that are paid (or paid ahead): the ring. */
  paidThisYear: number;
  /** The same state the resident sees on their own page. */
  thisMonthState: MonthState;

  paidUntil: { year: number; month: number } | null;
  /** What is owed for monthly fees (0 unless the house is ACTIVE), and for how many months. */
  owedSen: number;
  owedMonths: number;
  /** Some of the months owed are from before the year shown. */
  earlierUnpaid: boolean;
  lastPaymentDate: string | null;

  collections: ResidentCollection[];
  collectionsOwedSen: number;
  /** Receipts the resident sent that the AJK has not reviewed yet. */
  waiting: { id: string; type: "MONTHLY_FEE" | "SPECIAL_COLLECTION"; amountSen: number }[];

  tenants: { id: string; name: string; phone: string | null; vehicles: number }[];
  vehicles: { id: string; make: string; model: string | null; plate: string }[];

  history: { payments: LedgerPayment[]; page: number; totalPages: number; totalCount: number; totalSen: number };
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** One house in full: where it stands, its year of months, collections, household and payment history. Null when there is no such house. */
export async function getResidentDetail(id: string, opts: { year: number | null; page: number; perPage: number }): Promise<ResidentDetail | null> {
  const resident = await prisma.resident.findUnique({
    where: { id },
    select: {
      id: true,
      unitNumber: true,
      name: true,
      status: true,
      phone: true,
      email: true,
      streetBlock: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zipCode: true,
      notes: true,
      createdAt: true,
      tenants: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true, _count: { select: { vehicles: true } } } },
      vehicles: { orderBy: { createdAt: "asc" }, select: { id: true, make: true, model: true, plateNumber: true } },
    },
  });
  if (!resident) return null;

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const loadHistory = async () => {
    const byType = await prisma.payment.groupBy({ by: ["paymentType"], where: { residentId: id }, _count: { _all: true }, _sum: { amountSen: true } });
    const totalCount = byType.reduce((sum, r) => sum + r._count._all, 0);
    const totalSen = byType.reduce((sum, r) => sum + (r._sum.amountSen ?? 0), 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / opts.perPage));
    // A page number past the end shows the last page, not an empty list.
    const page = Math.min(opts.page, totalPages);
    const rows = await prisma.payment.findMany({
      where: { residentId: id },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * opts.perPage,
      take: opts.perPage,
      select: paymentRowSelect,
    });
    return { payments: rows.map(toLedgerPayment), page, totalPages, totalCount, totalSen };
  };

  const [report, span, currentGrid, pending, waiting, assignments, collectionPaid, history] = await Promise.all([
    getMonthlyReport({ year: thisYear, month: thisMonth, includeInactive: true }),
    prisma.paymentCoverage.aggregate({ where: { residentId: id }, _min: { year: true }, _max: { year: true } }),
    getYearGridData({ year: thisYear, includeInactive: true }),
    prisma.publicPaymentSubmission.findMany({
      where: { unitNumber: resident.unitNumber, status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
      select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
    }),
    prisma.publicPaymentSubmission.findMany({
      where: { unitNumber: resident.unitNumber, status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      select: { id: true, paymentType: true, amountSen: true },
    }),
    prisma.specialCollectionAssignment.findMany({
      where: { residentId: id },
      orderBy: { createdAt: "desc" },
      select: { amountDue: true, specialCollection: { select: { id: true, title: true, status: true } } },
    }),
    prisma.payment.groupBy({ by: ["specialCollectionId"], where: { residentId: id, specialCollectionId: { not: null } }, _sum: { amountSen: true } }),
    loadHistory(),
  ]);

  const reportRow = report.rows.find((r) => r.residentId === id);
  const currentRow = currentGrid.rows.find((r) => r.residentId === id);
  if (!reportRow || !currentRow) return null;

  const years = {
    min: Math.min(thisYear, span._min.year ?? thisYear, resident.createdAt.getFullYear()),
    max: Math.max(thisYear + 1, span._max.year ?? thisYear),
  };
  const year = clamp(opts.year ?? thisYear, years.min, years.max);

  // Month tiles use the same rules as the resident's own page, so the AJK and the resident see the same colours.
  const pendingMap = getPendingSubmissionsMap(pending);
  const tilesOf = (row: YearGridRow, forYear: number): YearMonth[] =>
    row.months.map((amountSen, i) => ({
      month: i + 1,
      amountSen,
      state: monthState({
        amountSen,
        override: row.monthStatusOverrides[i],
        residentStatus: row.monthStatus[i],
        isFuture: isFutureMonth(forYear, i + 1, now),
        pending: !amountSen && pendingMap.has(`${resident.unitNumber}:${forYear}:${i + 1}`),
      }),
    }));

  const currentTiles = tilesOf(currentRow, thisYear);
  let months = currentTiles;
  if (year !== thisYear) {
    const shown = (await getYearGridData({ year, includeInactive: true })).rows.find((r) => r.residentId === id);
    months = shown ? tilesOf(shown, year) : currentTiles.map((m) => ({ ...m, amountSen: null, state: "upcoming" as const }));
  }

  const active = resident.status === "ACTIVE";
  const owedMonths = active ? reportRow.outstandingMonths : 0;
  const unpaidShown = months.filter((m) => m.state === "unpaid" || m.state === "partial" || m.state === "pending").length;

  const paidByCollection = new Map(collectionPaid.map((p) => [p.specialCollectionId, p._sum.amountSen ?? 0]));
  const collections: ResidentCollection[] = assignments.map((a) => {
    const paidSen = paidByCollection.get(a.specialCollection.id) ?? 0;
    return { id: a.specialCollection.id, title: a.specialCollection.title, status: a.specialCollection.status, dueSen: a.amountDue, paidSen, owedSen: Math.max(0, a.amountDue - paidSen) };
  });

  return {
    id: resident.id,
    unit: resident.unitNumber,
    name: resident.name,
    status: resident.status,
    phone: resident.phone,
    email: resident.email,
    block: resident.streetBlock,
    address: [resident.addressLine1, resident.addressLine2, [resident.city, resident.state, resident.zipCode].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    notes: resident.notes,

    thisYear,
    thisMonth,
    year,
    years,
    months,
    paidThisYear: currentTiles.filter((m) => m.state === "paid" || m.state === "ahead").length,
    thisMonthState: currentTiles[thisMonth - 1].state,

    paidUntil: reportRow.paidUntilYear && reportRow.paidUntilMonth ? { year: reportRow.paidUntilYear, month: reportRow.paidUntilMonth } : null,
    owedSen: active ? reportRow.outstandingAmountSen : 0,
    owedMonths,
    earlierUnpaid: year === thisYear && owedMonths > unpaidShown,
    lastPaymentDate: reportRow.lastPaymentDate ? reportRow.lastPaymentDate.toISOString().slice(0, 10) : null,

    collections,
    collectionsOwedSen: collections.reduce((sum, c) => sum + c.owedSen, 0),
    waiting: waiting.map((w) => ({ id: w.id, type: w.paymentType, amountSen: w.amountSen })),

    tenants: resident.tenants.map((t) => ({ id: t.id, name: t.name, phone: t.phone, vehicles: t._count.vehicles })),
    vehicles: resident.vehicles.map((v) => ({ id: v.id, make: v.make, model: v.model, plate: v.plateNumber })),

    history,
  };
}
