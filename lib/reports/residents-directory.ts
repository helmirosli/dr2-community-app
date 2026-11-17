import type { Prisma } from "@/generated/prisma/client";
import { collectionMonth } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getMonthStates } from "@/lib/reports/month-states";
import type { MonthState } from "@/lib/status";
import { compareUnits } from "@/lib/units";

export const STATUSES = ["ACTIVE", "EXEMPT", "FOR_SALE", "MOVED_OUT"] as const;
export type ResidentStatus = (typeof STATUSES)[number];

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PER_PAGE = 10;

export type DirectoryFilters = { q: string; status: "" | ResidentStatus };

export type DirectoryResident = {
  id: string;
  unit: string;
  name: string;
  phone: string | null;
  block: string | null;
  status: ResidentStatus;
  payments: number;
  months: number;
  /** Where the house stands for the collection month. Houses that are not ACTIVE do not pay, so they are "hold". */
  state: MonthState;
};

export type Directory = {
  /** This page (or every match, for the map). */
  residents: DirectoryResident[];
  page: number;
  totalPages: number;
  totalCount: number;
  /** Tab counts: under the search, but not under the status filter itself. */
  tabCounts: { all: number } & Record<ResidentStatus, number>;
  /** Whole-community counts, unaffected by any filter. */
  houseCounts: { all: number } & Record<ResidentStatus, number>;
  /** How the ACTIVE houses stand for the collection month. */
  month: { year: number; month: number; isPrevious: boolean; paid: number; total: number; counts: Partial<Record<MonthState, number>> };
};

export function parseDirectoryParams(params: { q?: string; status?: string; page?: string; perPage?: string; view?: string }) {
  const filters: DirectoryFilters = {
    q: params.q?.trim() ?? "",
    status: (STATUSES as readonly string[]).includes(params.status ?? "") ? (params.status as ResidentStatus) : "",
  };
  const perPageNumber = parseInt(params.perPage ?? "", 10);
  return {
    filters,
    view: params.view === "map" ? ("map" as const) : ("list" as const),
    perPage: PER_PAGE_OPTIONS.includes(perPageNumber) ? perPageNumber : DEFAULT_PER_PAGE,
    page: Math.max(1, parseInt(params.page ?? "1", 10) || 1),
  };
}

function searchWhere(q: string): Prisma.ResidentWhereInput {
  if (!q) return {};
  return {
    OR: [
      { unitNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { streetBlock: { contains: q, mode: "insensitive" } },
      { addressLine1: { contains: q, mode: "insensitive" } },
    ],
  };
}

/** The resident directory: one page for the list, or `everyone` for the house map. */
export async function getDirectory(filters: DirectoryFilters, requestedPage: number, perPage: number, everyone = false): Promise<Directory> {
  const when = collectionMonth();
  const [matching, byStatusUnderSearch, byStatusOverall, monthStates] = await Promise.all([
    prisma.resident.findMany({
      where: { AND: [searchWhere(filters.q), filters.status ? { status: filters.status } : {}] },
      select: {
        id: true,
        unitNumber: true,
        name: true,
        phone: true,
        streetBlock: true,
        status: true,
        _count: { select: { payments: true, coverages: true } },
      },
    }),
    prisma.resident.groupBy({ by: ["status"], where: searchWhere(filters.q), _count: { _all: true } }),
    prisma.resident.groupBy({ by: ["status"], _count: { _all: true } }),
    getMonthStates(when.year, when.month),
  ]);

  const stateByUnit = new Map(monthStates.map((h) => [h.unit, h.state]));
  const sorted = matching.sort((a, b) => compareUnits(a.unitNumber, b.unitNumber));

  const totalCount = sorted.length;
  const totalPages = everyone ? 1 : Math.max(1, Math.ceil(totalCount / perPage));
  const page = everyone ? 1 : Math.min(requestedPage, totalPages);
  const slice = everyone ? sorted : sorted.slice((page - 1) * perPage, page * perPage);

  const countsOf = (rows: { status: string; _count: { _all: number } }[]) => {
    const get = (s: ResidentStatus) => rows.find((r) => r.status === s)?._count._all ?? 0;
    const counts = { ACTIVE: get("ACTIVE"), EXEMPT: get("EXEMPT"), FOR_SALE: get("FOR_SALE"), MOVED_OUT: get("MOVED_OUT") };
    return { all: counts.ACTIVE + counts.EXEMPT + counts.FOR_SALE + counts.MOVED_OUT, ...counts };
  };

  const stateCounts: Directory["month"]["counts"] = {};
  for (const h of monthStates) stateCounts[h.state] = (stateCounts[h.state] ?? 0) + 1;

  return {
    residents: slice.map((r) => ({
      id: r.id,
      unit: r.unitNumber,
      name: r.name,
      phone: r.phone,
      block: r.streetBlock,
      status: r.status,
      payments: r._count.payments,
      months: r._count.coverages,
      state: r.status === "ACTIVE" ? (stateByUnit.get(r.unitNumber) ?? "unpaid") : "hold",
    })),
    page,
    totalPages,
    totalCount,
    tabCounts: countsOf(byStatusUnderSearch),
    houseCounts: countsOf(byStatusOverall),
    month: {
      year: when.year,
      month: when.month,
      isPrevious: when.isPrevious,
      paid: (stateCounts.paid ?? 0) + (stateCounts.ahead ?? 0),
      total: monthStates.length,
      counts: stateCounts,
    },
  };
}
