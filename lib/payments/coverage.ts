import { expandMonthRange, type MonthCoverage } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";

export function buildMonthlyCoverageRows(
  residentId: string,
  coveredMonths: MonthCoverage[],
  amountSen: number,
  existingCoverageMap?: Map<string, number>, // key: "year:month", value: amountApplied
) {
  const rows = [];
  let remainingAmountSen = amountSen;

  // Process initially selected months - smart distribution for partial payments
  for (const coverage of coveredMonths) {
    if (remainingAmountSen <= 0) break;

    const key = `${coverage.year}:${coverage.month}`;
    const existingAmount = existingCoverageMap?.get(key) ?? 0;
    const amountNeeded = Math.max(0, DEFAULT_MONTHLY_FEE_SEN - existingAmount);
    const amountApplied = Math.min(amountNeeded || DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
    remainingAmountSen -= amountApplied;

    rows.push({
      residentId,
      year: coverage.year,
      month: coverage.month,
      amountApplied,
      status: existingAmount + amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? ("PAID" as const) : ("PARTIAL" as const),
    });
  }

  // Auto-extend to next months if there's remaining amount (carry-forward)
  if (remainingAmountSen > 0 && coveredMonths.length > 0) {
    let currentYear = coveredMonths[coveredMonths.length - 1].year;
    let currentMonth = coveredMonths[coveredMonths.length - 1].month + 1;
    let monthsExtended = 0;
    const MAX_EXTEND_MONTHS = 24;

    while (remainingAmountSen > 0 && monthsExtended < MAX_EXTEND_MONTHS) {
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }

      const key = `${currentYear}:${currentMonth}`;
      const existingAmount = existingCoverageMap?.get(key) ?? 0;
      const amountNeeded = Math.max(0, DEFAULT_MONTHLY_FEE_SEN - existingAmount);
      const amountApplied = Math.min(amountNeeded || DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
      remainingAmountSen -= amountApplied;

      rows.push({
        residentId,
        year: currentYear,
        month: currentMonth,
        amountApplied,
        status: existingAmount + amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? ("PAID" as const) : ("PARTIAL" as const),
      });

      currentMonth += 1;
      monthsExtended += 1;
    }
  }

  return rows;
}

export function getCoverageMonthCount(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  return expandMonthRange(startYear, startMonth, endYear, endMonth).length;
}