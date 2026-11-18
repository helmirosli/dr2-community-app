import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { getYearGridData } from "@/lib/reports/year-grid-data";

/** What each month of the given years already holds for one house, keyed "2026-5". Same numbers as the house pages (an overpayment spills into the next month). */
export async function getMonthAmounts(residentId: string, years: number[]) {
  const out: Record<string, number> = {};
  for (const year of new Set(years)) {
    const row = (await getYearGridData({ year, includeInactive: true })).rows.find((r) => r.residentId === residentId);
    row?.months.forEach((amount, i) => {
      out[`${year}-${i + 1}`] = amount ?? 0;
    });
  }
  return out;
}

/** Still to pay for these months: the fee minus what each month already holds. */
export const owedForMonths = (months: { year: number; month: number }[], amounts: Record<string, number>) =>
  months.reduce((sum, m) => sum + DEFAULT_MONTHLY_FEE_SEN - Math.min(DEFAULT_MONTHLY_FEE_SEN, amounts[`${m.year}-${m.month}`] ?? 0), 0);
