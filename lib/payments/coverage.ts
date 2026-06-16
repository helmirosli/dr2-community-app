import { expandMonthRange, type MonthCoverage } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";

export function buildMonthlyCoverageRows(
  residentId: string,
  coveredMonths: MonthCoverage[],
  amountSen: number,
) {
  let remainingAmountSen = amountSen;

  return coveredMonths.flatMap((coverage) => {
    if (remainingAmountSen <= 0) {
      return [];
    }

    const amountApplied = Math.min(DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
    remainingAmountSen -= amountApplied;

    return [
      {
        residentId,
        year: coverage.year,
        month: coverage.month,
        amountApplied,
        status: amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? "PAID" as const : "PARTIAL" as const,
      },
    ];
  });
}

export function getCoverageMonthCount(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  return expandMonthRange(startYear, startMonth, endYear, endMonth).length;
}