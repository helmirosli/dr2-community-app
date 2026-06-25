import { monthKey } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { normalizeMonthlyAppliedByMonth } from "@/lib/reports/monthly";

export type YearGridRow = {
  no: number;
  unitNumber: string;
  name: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  isForSale: boolean;
  months: (number | null)[];
  monthStatusOverrides: (("FOR_SALE" | "MOVED_OUT" | "EXEMPT") | null)[];
  extraOutstandingSen: number;
  extraPaidSen: number;
  extraDueSen: number;
};

export type YearGridSpecialCollection = {
  id: string;
  title: string;
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
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

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
          select: { amountDue: true, amountPaid: true },
        },
      },
    }),
    prisma.specialCollection.findMany({
      where: {
        status: { in: ["ACTIVE", "CLOSED"] },
        OR: [
          { dueDate: { gte: yearStart, lt: yearEnd } },
          { eventStartDate: { gte: yearStart, lt: yearEnd } },
          { status: "ACTIVE" },
        ],
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
  ]);

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

    const residentLogs = logsByResidentId.get(resident.id) ?? [];
    const latestMoveIn = [...residentLogs]
      .reverse()
      .find(
        (log) =>
          log.createdAt.getFullYear() === year &&
          log.beforeStatus === "FOR_SALE" &&
          log.afterStatus === "ACTIVE",
      );

    if (latestMoveIn) {
      const moveInMonth = latestMoveIn.createdAt.getMonth() + 1;
      for (let i = 1; i < moveInMonth && i <= YEAR_END_MONTH; i++) {
        monthStatusOverrides[i - 1] = "FOR_SALE";
      }
    }

    for (let i = 1; i <= 12; i++) {
      const key = monthKey(year, i);
      const amount = normalizedByMonth.get(key) ?? 0;
      if (amount > 0) {
        months[i - 1] = amount;
        monthStatusOverrides[i - 1] = null;
      }
    }

    const extraDueSen = resident.assignments.reduce((sum, a) => sum + a.amountDue, 0);
    const extraPaidSen = resident.assignments.reduce((sum, a) => sum + a.amountPaid, 0);
    const extraOutstandingSen = Math.max(0, extraDueSen - extraPaidSen);

    return {
      no: index + 1,
      unitNumber: resident.unitNumber,
      name: resident.name,
      status: resident.status,
      isForSale: resident.status === "FOR_SALE" || resident.status === "MOVED_OUT",
      months,
      monthStatusOverrides,
      extraDueSen,
      extraPaidSen,
      extraOutstandingSen,
    };
  });

  return {
    rows,
    specialCollections: specialCollections.map((c) => ({ id: c.id, title: c.title })),
    year,
  };
}
