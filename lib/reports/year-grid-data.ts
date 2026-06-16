import { prisma } from "@/lib/prisma";

export type YearGridRow = {
  no: number;
  unitNumber: string;
  name: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  isForSale: boolean;
  months: (number | null)[];
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
          where: { year },
          select: { month: true, amountApplied: true },
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

  const rows: YearGridRow[] = residents.map((resident, index) => {
    const months: (number | null)[] = Array(12).fill(null);

    for (const coverage of resident.coverages) {
      const idx = coverage.month - 1;
      months[idx] = (months[idx] ?? 0) + coverage.amountApplied;
    }

    const extraDueSen = resident.assignments.reduce((sum, a) => sum + a.amountDue, 0);
    const extraPaidSen = resident.assignments.reduce((sum, a) => sum + a.amountPaid, 0);
    const extraOutstandingSen = Math.max(0, extraDueSen - extraPaidSen);

    return {
      no: index + 1,
      unitNumber: resident.unitNumber,
      name: resident.name,
      status: resident.status,
      isForSale: resident.status !== "ACTIVE",
      months,
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
