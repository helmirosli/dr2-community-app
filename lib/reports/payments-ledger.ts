import type { Prisma } from "@/generated/prisma/client";
import { malaysiaToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PER_PAGE = 10;

export type PaymentTypeFilter = "" | "MONTHLY_FEE" | "SPECIAL_COLLECTION";

/** from / to are "YYYY-MM-DD", or "" when not set. */
export type LedgerFilters = { q: string; type: PaymentTypeFilter; from: string; to: string };

export type LedgerPayment = {
  id: string;
  residentId: string;
  unit: string;
  name: string;
  /** The stored calendar date, "YYYY-MM-DD". */
  date: string;
  type: "MONTHLY_FEE" | "SPECIAL_COLLECTION";
  amountSen: number;
  method: string;
  referenceNo: string | null;
  notes: string | null;
  /** Months a monthly fee paid for. */
  months: { first: { year: number; month: number }; last: { year: number; month: number }; count: number } | null;
  /** Collection a special payment was for. */
  collection: { id: string; title: string } | null;
  uploads: { id: string; originalFilename: string; storagePath: string; mimeType: string; url: string | null }[];
};

export type LedgerBar = { key: string; year: number; month: number; totalSen: number; count: number };

export type Ledger = {
  payments: LedgerPayment[];
  page: number;
  totalPages: number;
  /** Everything below is for the payments that match all the filters. */
  totalCount: number;
  totalSen: number;
  monthlySen: number;
  specialSen: number;
  /** Counts for the type tabs: under every filter except the type itself. */
  typeCounts: { all: number; MONTHLY_FEE: number; SPECIAL_COLLECTION: number };
  /** The last 12 months, collected per month. Honours type and search, but not the date range, so months stay clickable. */
  bars: LedgerBar[];
  /** Whole-month count and total for each month shown on this page ("2026-11"), so group headers are right even when a month spans pages. */
  monthTotals: Record<string, { count: number; sen: number }>;
  /** Public receipts waiting for the AJK. */
  waitingReview: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar date, or "". */
function validDate(value?: string) {
  if (!value || !DATE_RE.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? "" : value;
}

export function parseLedgerParams(params: { q?: string; type?: string; from?: string; to?: string; page?: string; perPage?: string }) {
  const filters: LedgerFilters = {
    q: params.q?.trim() ?? "",
    type: params.type === "MONTHLY_FEE" || params.type === "SPECIAL_COLLECTION" ? params.type : "",
    from: validDate(params.from),
    to: validDate(params.to),
  };
  const perPageNumber = parseInt(params.perPage ?? "", 10);
  return {
    filters,
    perPage: PER_PAGE_OPTIONS.includes(perPageNumber) ? perPageNumber : DEFAULT_PER_PAGE,
    page: Math.max(1, parseInt(params.page ?? "1", 10) || 1),
  };
}

function buildWhere(f: LedgerFilters, parts: { dates: boolean; type: boolean }): Prisma.PaymentWhereInput {
  const and: Prisma.PaymentWhereInput[] = [];
  if (parts.type && f.type) and.push({ paymentType: f.type });
  if (parts.dates && (f.from || f.to)) {
    and.push({
      paymentDate: {
        ...(f.from ? { gte: new Date(`${f.from}T00:00:00.000Z`) } : {}),
        ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (f.q) {
    and.push({
      OR: [
        { referenceNo: { contains: f.q, mode: "insensitive" } },
        { notes: { contains: f.q, mode: "insensitive" } },
        {
          resident: {
            OR: [
              { unitNumber: { contains: f.q, mode: "insensitive" } },
              { name: { contains: f.q, mode: "insensitive" } },
              { phone: { contains: f.q, mode: "insensitive" } },
            ],
          },
        },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

const monthKeyOf = (d: Date) => d.toISOString().slice(0, 7);

const rowSelect = {
  id: true,
  residentId: true,
  paymentType: true,
  amountSen: true,
  paymentDate: true,
  method: true,
  referenceNo: true,
  notes: true,
  resident: { select: { unitNumber: true, name: true } },
  coverages: { select: { year: true, month: true }, orderBy: [{ year: "asc" }, { month: "asc" }] },
  specialCollection: { select: { id: true, title: true } },
  uploads: { select: { id: true, originalFilename: true, storagePath: true, mimeType: true, url: true } },
} satisfies Prisma.PaymentSelect;

/** One page of the payment ledger plus the totals, month bars and counts the page shows. */
export async function getPaymentsLedger(filters: LedgerFilters, requestedPage: number, perPage: number): Promise<Ledger> {
  const whereFull = buildWhere(filters, { dates: true, type: true });
  const whereNoType = buildWhere(filters, { dates: true, type: false });
  const whereBars = buildWhere(filters, { dates: false, type: true });

  const today = malaysiaToday();
  const bars: LedgerBar[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(today.year, today.month - 1 - (11 - i), 1));
    return { key: monthKeyOf(d), year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, totalSen: 0, count: 0 };
  });
  const windowStart = new Date(Date.UTC(today.year, today.month - 12, 1));

  const fetchPage = (page: number) =>
    prisma.payment.findMany({
      where: whereFull,
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: rowSelect,
    });

  const [byType, barRows, waitingReview, firstTry] = await Promise.all([
    prisma.payment.groupBy({ by: ["paymentType"], where: whereNoType, _count: { _all: true }, _sum: { amountSen: true } }),
    prisma.payment.findMany({ where: { AND: [whereBars, { paymentDate: { gte: windowStart } }] }, select: { paymentDate: true, amountSen: true } }),
    prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } }),
    fetchPage(requestedPage),
  ]);

  const stat = (type: "MONTHLY_FEE" | "SPECIAL_COLLECTION") => {
    const row = byType.find((r) => r.paymentType === type);
    return { count: row?._count._all ?? 0, sen: row?._sum.amountSen ?? 0 };
  };
  const monthly = stat("MONTHLY_FEE");
  const special = stat("SPECIAL_COLLECTION");
  const typeCounts = { all: monthly.count + special.count, MONTHLY_FEE: monthly.count, SPECIAL_COLLECTION: special.count };
  const totalCount = filters.type ? typeCounts[filters.type] : typeCounts.all;
  const monthlySen = filters.type === "SPECIAL_COLLECTION" ? 0 : monthly.sen;
  const specialSen = filters.type === "MONTHLY_FEE" ? 0 : special.sen;

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const page = Math.min(requestedPage, totalPages);
  // A page number past the end shows the last page, not an empty list.
  const rows = page === requestedPage ? firstTry : await fetchPage(page);

  for (const r of barRows) {
    const bar = bars.find((b) => b.key === monthKeyOf(r.paymentDate));
    if (bar) {
      bar.totalSen += r.amountSen;
      bar.count += 1;
    }
  }

  // Whole-month totals for the months on this page.
  const monthTotals: Ledger["monthTotals"] = {};
  if (rows.length > 0) {
    const newest = rows[0].paymentDate;
    const oldest = rows[rows.length - 1].paymentDate;
    const start = new Date(Date.UTC(oldest.getUTCFullYear(), oldest.getUTCMonth(), 1));
    const end = new Date(Date.UTC(newest.getUTCFullYear(), newest.getUTCMonth() + 1, 1));
    const inRange = await prisma.payment.findMany({
      where: { AND: [whereFull, { paymentDate: { gte: start, lt: end } }] },
      select: { paymentDate: true, amountSen: true },
    });
    for (const r of inRange) {
      const key = monthKeyOf(r.paymentDate);
      const entry = (monthTotals[key] ??= { count: 0, sen: 0 });
      entry.count += 1;
      entry.sen += r.amountSen;
    }
  }

  return {
    payments: rows.map((p) => ({
      id: p.id,
      residentId: p.residentId,
      unit: p.resident.unitNumber,
      name: p.resident.name,
      date: p.paymentDate.toISOString().slice(0, 10),
      type: p.paymentType,
      amountSen: p.amountSen,
      method: p.method,
      referenceNo: p.referenceNo,
      notes: p.notes,
      months:
        p.coverages.length > 0
          ? { first: p.coverages[0], last: p.coverages[p.coverages.length - 1], count: p.coverages.length }
          : null,
      collection: p.specialCollection,
      uploads: p.uploads,
    })),
    page,
    totalPages,
    totalCount,
    totalSen: monthlySen + specialSen,
    monthlySen,
    specialSen,
    typeCounts,
    bars,
    monthTotals,
    waitingReview,
  };
}
