import { prisma } from "@/lib/prisma";
import {
  buildMonthlyReport,
  type MonthlyReportResidentInput,
} from "@/lib/reports/monthly";

export type MonthlyReportQuery = {
  year: number;
  month: number;
  includeInactive: boolean;
};

export async function getMonthlyReport({ year, month, includeInactive }: MonthlyReportQuery) {
  const residents = await prisma.resident.findMany({
    where: includeInactive ? {} : { status: "ACTIVE" },
    orderBy: { unitNumber: "asc" },
    select: {
      id: true,
      unitNumber: true,
      name: true,
      status: true,
      createdAt: true,
      coverages: {
        select: { year: true, month: true, amountApplied: true },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 1,
        select: { paymentDate: true },
      },
      assignments: {
        select: { amountDue: true, amountPaid: true },
      },
    },
  });

  const reportInput: MonthlyReportResidentInput[] = residents.map((resident) => ({
    id: resident.id,
    unitNumber: resident.unitNumber,
    name: resident.name,
    status: resident.status,
    createdAt: resident.createdAt,
    coverages: resident.coverages,
    lastPaymentDate: resident.payments[0]?.paymentDate ?? null,
    extraDueSen: resident.assignments.reduce((sum, item) => sum + item.amountDue, 0),
    extraPaidSen: resident.assignments.reduce((sum, item) => sum + item.amountPaid, 0),
    extraOutstandingCount: resident.assignments.filter((item) => item.amountPaid < item.amountDue).length,
  }));

  return buildMonthlyReport(reportInput, year, month);
}

export function clampReportMonth(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

export function clampReportYear(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100 ? parsed : fallback;
}
