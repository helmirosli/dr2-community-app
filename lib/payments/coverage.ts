import { expandMonthRange, type MonthCoverage } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";

const MAX_CARRY_FORWARD_MONTHS = 24;

/**
 * Spreads a payment over the selected months, topping up partially paid months
 * first, then carries any remainder forward month by month (max 24 months).
 * The single allocator for official payments, approved submissions and the
 * pending preview on /status and /reports.
 */
export function buildMonthlyCoverageRows(
  residentId: string,
  coveredMonths: MonthCoverage[],
  amountSen: number,
  existingCoverageMap?: Map<string, number>, // key: "year:month", value: amountApplied
) {
  const months = [...coveredMonths];
  const last = coveredMonths.at(-1);

  if (last) {
    let { year, month } = last;
    for (let i = 0; i < MAX_CARRY_FORWARD_MONTHS; i += 1) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      months.push({ year, month });
    }
  }

  const rows = [];
  let remainingAmountSen = amountSen;

  for (const { year, month } of months) {
    if (remainingAmountSen <= 0) break;

    const existingAmount = existingCoverageMap?.get(`${year}:${month}`) ?? 0;
    const amountNeeded = Math.max(0, DEFAULT_MONTHLY_FEE_SEN - existingAmount);
    // ponytail: a month that's already fully paid still takes a full fee (kept from the original logic).
    const amountApplied = Math.min(amountNeeded || DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
    remainingAmountSen -= amountApplied;

    rows.push({
      residentId,
      year,
      month,
      amountApplied,
      status: existingAmount + amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? ("PAID" as const) : ("PARTIAL" as const),
    });
  }

  return rows;
}

export type PendingSubmission = {
  unitNumber: string;
  amountSen: number;
  coverageStartYear: number;
  coverageStartMonth: number;
  coverageEndYear: number;
  coverageEndMonth: number;
};

export type PendingMonthInfo = {
  appliedSen: number;
  isCarryForward: boolean;
  totalPending: number;
};

/** Pending (not yet approved) submissions, keyed "unit:year:month", for the status grids. */
export function getPendingSubmissionsMap(submissions: PendingSubmission[]) {
  const map = new Map<string, PendingMonthInfo>();

  for (const sub of submissions) {
    const months = expandMonthRange(sub.coverageStartYear, sub.coverageStartMonth, sub.coverageEndYear, sub.coverageEndMonth);
    const rows = buildMonthlyCoverageRows(sub.unitNumber, months, sub.amountSen);

    rows.forEach((row, index) => {
      map.set(`${sub.unitNumber}:${row.year}:${row.month}`, {
        appliedSen: row.amountApplied,
        isCarryForward: index > 0,
        totalPending: sub.amountSen,
      });
    });
  }

  return map;
}

export function getCoverageMonthCount(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  return expandMonthRange(startYear, startMonth, endYear, endMonth).length;
}
