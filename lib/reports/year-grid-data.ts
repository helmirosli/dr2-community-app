import { monthKey } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { normalizeMonthlyAppliedByMonth } from "@/lib/reports/monthly";
import { sortByUnit } from "@/lib/units";

export type YearGridAssignment = {
  specialCollectionId: string;
  amountDue: number;
  amountPaid: number;
  outstanding: number;
};

export type YearGridRow = {
  no: number;
  unitNumber: string;
  name: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  isForSale: boolean;
  months: (number | null)[];
  monthStatusOverrides: (("FOR_SALE" | "MOVED_OUT" | "EXEMPT") | null)[];
  /** The house's status at the end of each month (from status-change history), so a house that became
   *  "For sale" in November still shows its earlier months as normal (paid / unpaid). */
  monthStatus: ("ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT")[];
  assignments: YearGridAssignment[];
  /** @deprecated use assignments map instead */
  extraOutstandingSen: number;
  /** @deprecated use assignments map instead */
  extraPaidSen: number;
  /** @deprecated use assignments map instead */
  extraDueSen: number;
};

export type YearGridSpecialCollection = {
  id: string;
  title: string;
  /** Set when the collection belongs to an earlier year but is carried into this one (still running or owed). */
  carriedFrom?: number;
};

export type YearGridData = {
  rows: YearGridRow[];
  specialCollections: YearGridSpecialCollection[];
  year: number;
};

const YEAR_END_MONTH = 12;

function parseResidentStatusFromJson(json: string | null) {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { status?: unknown };
    const status = parsed.status;
    if (status === "ACTIVE" || status === "EXEMPT" || status === "FOR_SALE" || status === "MOVED_OUT") {
      return status;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getYearGridData({
  year,
  includeInactive = false,
}: {
  year: number;
  includeInactive?: boolean;
}): Promise<YearGridData> {

  const [residents, specialCollections] = await Promise.all([
    prisma.resident.findMany({
      where: includeInactive ? {} : { status: "ACTIVE" },
      orderBy: { unitNumber: "asc" },
      select: {
        id: true,
        unitNumber: true,
        name: true,
        status: true,
        coverages: {
          select: { year: true, month: true, amountApplied: true },
        },
        assignments: {
          select: { specialCollectionId: true, amountDue: true, amountPaid: true },
        },
      },
    }),
    prisma.specialCollection.findMany({
      where: { status: { in: ["ACTIVE", "CLOSED"] } }, // year is decided below from the dates
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        eventStartDate: true,
        createdAt: true,
        assignments: { select: { amountDue: true, amountPaid: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  sortByUnit(residents); // numeric house order, so row "no" follows 1, 2, … 10
  // Which collections appear in this year's grid:
  // - its own year (due date, else event date, else creation date) always shows there;
  // - from the current year onward, an earlier collection is carried forward while it is still
  //   ACTIVE or any house still owes, so the AJK can see who hasn't paid. Past years never carry.
  const currentYear = new Date().getFullYear();
  const yearCollections: YearGridSpecialCollection[] = specialCollections
    .map((c) => {
      const ownYear = (c.dueDate ?? c.eventStartDate ?? c.createdAt).getFullYear();
      const unfinished = c.status === "ACTIVE" || c.assignments.some((a) => a.amountPaid < a.amountDue);
      if (ownYear === year) return { id: c.id, title: c.title, ownYear };
      if (ownYear < year && year >= currentYear && unfinished) return { id: c.id, title: c.title, ownYear, carriedFrom: ownYear };
      return null;
    })
    .filter((c): c is YearGridSpecialCollection & { ownYear: number } => c !== null)
    .sort((a, b) => a.ownYear - b.ownYear)
    .slice(0, 5)
    .map(({ id, title, carriedFrom }) => ({ id, title, ...(carriedFrom ? { carriedFrom } : {}) }));

  const residentIds = residents.map((resident) => resident.id);
  const residentAuditLogs = residentIds.length
    ? await prisma.auditLog.findMany({
        where: {
          entityType: "Resident",
          action: "UPDATE",
          entityId: { in: residentIds },
          createdAt: { lt: new Date(year + 1, 0, 1) },
        },
        orderBy: { createdAt: "asc" },
        select: {
          entityId: true,
          beforeJson: true,
          afterJson: true,
          createdAt: true,
        },
      })
    : [];

  const logsByResidentId = new Map<
    string,
    Array<{ beforeStatus: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT" | null; afterStatus: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT" | null; createdAt: Date }>
  >();
  for (const log of residentAuditLogs) {
    const beforeStatus = parseResidentStatusFromJson(log.beforeJson);
    const afterStatus = parseResidentStatusFromJson(log.afterJson);
    const existing = logsByResidentId.get(log.entityId) ?? [];
    existing.push({ beforeStatus, afterStatus, createdAt: log.createdAt });
    logsByResidentId.set(log.entityId, existing);
  }

  const rows: YearGridRow[] = residents.map((resident, index) => {
    const months: (number | null)[] = Array(12).fill(null);
    const monthStatusOverrides: (("FOR_SALE" | "MOVED_OUT" | "EXEMPT") | null)[] = Array(12).fill(null);
    const normalizedByMonth = normalizeMonthlyAppliedByMonth(
      resident.coverages.map((coverage) => ({
        year: coverage.year,
        month: coverage.month,
        amountApplied: coverage.amountApplied,
      })),
    );

    // Status at the end of each month: the last status change before that month ended; before the
    // first recorded change, the status it changed from; with no history, today's status.
    const residentLogs = (logsByResidentId.get(resident.id) ?? []).filter((log) => log.afterStatus);
    const monthStatus = Array.from({ length: YEAR_END_MONTH }, (_, i) => {
      const monthEnd = new Date(year, i + 1, 1);
      const last = [...residentLogs].reverse().find((log) => log.createdAt < monthEnd);
      if (last?.afterStatus) return last.afterStatus;
      return residentLogs[0]?.beforeStatus ?? resident.status;
    });

    for (let i = 1; i <= 12; i++) {
      const key = monthKey(year, i);
      const amount = normalizedByMonth.get(key) ?? 0;
      if (amount > 0) {
        // Payments always show, whatever the house's status was.
        months[i - 1] = amount;
      } else if (monthStatus[i - 1] !== "ACTIVE") {
        monthStatusOverrides[i - 1] = monthStatus[i - 1] as "FOR_SALE" | "MOVED_OUT" | "EXEMPT";
      }
    }

    const assignments: YearGridAssignment[] = resident.assignments.map((a) => ({
      specialCollectionId: a.specialCollectionId,
      amountDue: a.amountDue,
      amountPaid: a.amountPaid,
      outstanding: Math.max(0, a.amountDue - a.amountPaid),
    }));

    const extraDueSen = assignments.reduce((sum, a) => sum + a.amountDue, 0);
    const extraPaidSen = assignments.reduce((sum, a) => sum + a.amountPaid, 0);
    const extraOutstandingSen = Math.max(0, extraDueSen - extraPaidSen);

    return {
      no: index + 1,
      unitNumber: resident.unitNumber,
      name: resident.name,
      status: resident.status,
      isForSale: resident.status === "FOR_SALE" || resident.status === "MOVED_OUT",
      months,
      monthStatusOverrides,
      monthStatus,
      assignments,
      extraDueSen,
      extraPaidSen,
      extraOutstandingSen,
    };
  });

  return {
    rows,
    specialCollections: yearCollections,
    year,
  };
}
