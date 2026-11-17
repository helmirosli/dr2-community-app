import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { monthState, type MonthState } from "@/lib/status";

export type HouseMonthState = { unit: string; name: string; state: MonthState };

/**
 * Every ACTIVE house with its status for one month. The home page's ring, house tiles and counts all
 * come from this one list, so they can never disagree with each other.
 */
export async function getMonthStates(year: number, month: number): Promise<HouseMonthState[]> {
  const [report, pending] = await Promise.all([
    getMonthlyReport({ year, month, includeInactive: false }),
    prisma.publicPaymentSubmission.findMany({
      where: { status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
      select: {
        unitNumber: true,
        amountSen: true,
        coverageStartYear: true,
        coverageStartMonth: true,
        coverageEndYear: true,
        coverageEndMonth: true,
      },
    }),
  ]);
  const pendingMap = getPendingSubmissionsMap(pending);

  return report.rows.map((r) => ({
    unit: r.unitNumber,
    name: r.name,
    state: monthState({
      amountSen: r.selectedAppliedSen,
      residentStatus: r.status,
      isFuture: false,
      // Money already applied wins over a waiting receipt (same rule as the year grid).
      pending: !r.selectedAppliedSen && pendingMap.has(`${r.unitNumber}:${year}:${month}`),
    }),
  }));
}

/** Paid, or paid ahead. */
export const isPaidState = (s: MonthState) => s === "paid" || s === "ahead";

export const countPaid = (houses: HouseMonthState[]) => houses.filter((h) => isPaidState(h.state)).length;
