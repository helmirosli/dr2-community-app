import { cache } from "react";
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

async function loadMonthlyReport({ year, month, includeInactive }: MonthlyReportQuery) {
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

  // unitNumber is a string; sort 1, 2, … 10 rather than 1, 10, 11, 2.
  reportInput.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));

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

const monthlyReportOnce = cache((year: number, month: number, includeInactive: boolean) => loadMonthlyReport({ year, month, includeInactive }));

/** Read once per request: pages that need the report in several places share one load. */
export const getMonthlyReport = ({ year, month, includeInactive }: MonthlyReportQuery) => monthlyReportOnce(year, month, includeInactive);
