import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { monthKey } from "@/lib/months";

export type MonthlyCoverageInput = {
  year: number;
  month: number;
  amountApplied: number;
};

export type MonthlyReportResidentInput = {
  id: string;
  unitNumber: string;
  name: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  createdAt: Date;
  coverages: MonthlyCoverageInput[];
  lastPaymentDate: Date | null;
  extraDueSen: number;
  extraPaidSen: number;
  extraOutstandingCount: number;
};

export type SelectedMonthStatus = "PAID" | "UPFRONT" | "PARTIAL" | "UNPAID";

export type MonthlyReportRow = {
  residentId: string;
  unitNumber: string;
  name: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  paidUntilYear: number | null;
  paidUntilMonth: number | null;
  selectedStatus: SelectedMonthStatus;
  selectedAppliedSen: number;
  outstandingMonths: number;
  outstandingAmountSen: number;
  lastPaymentDate: Date | null;
  extraDueSen: number;
  extraPaidSen: number;
  extraOutstandingSen: number;
  extraOutstandingCount: number;
};

export type MonthlyReportSummary = {
  residentCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  upfrontCount: number;
  outstandingAmountSen: number;
  collectedSelectedSen: number;
  extraOutstandingSen: number;
};

function nextMonth(year: number, month: number) {
  return month >= 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function keyToYearMonth(key: number) {
  return { year: Math.floor(key / 100), month: key % 100 };
}

function normalizeAppliedByMonth(rawByMonth: Map<number, number>) {
  if (rawByMonth.size === 0) {
    return new Map<number, number>();
  }

  const keys = [...rawByMonth.keys()].sort((a, b) => a - b);
  let currentKey = keys[0];
  const lastKey = keys[keys.length - 1];
  let carry = 0;
  const normalized = new Map<number, number>();

  while (currentKey <= lastKey || carry > 0) {
    const total = (rawByMonth.get(currentKey) ?? 0) + carry;
    const applied = Math.min(DEFAULT_MONTHLY_FEE_SEN, total);

    if (applied > 0) {
      normalized.set(currentKey, applied);
    }

    carry = Math.max(0, total - DEFAULT_MONTHLY_FEE_SEN);
    const { year, month } = keyToYearMonth(currentKey);
    const next = nextMonth(year, month);
    currentKey = monthKey(next.year, next.month);
  }

  return normalized;
}

export function normalizeMonthlyAppliedByMonth(coverages: MonthlyCoverageInput[]) {
  const rawByMonth = new Map<number, number>();
  for (const coverage of coverages) {
    const key = monthKey(coverage.year, coverage.month);
    rawByMonth.set(key, (rawByMonth.get(key) ?? 0) + coverage.amountApplied);
  }

  return normalizeAppliedByMonth(rawByMonth);
}

/**
 * Paid-until is the end of the continuous run of fully-paid months that starts
 * at the resident's earliest fully-paid month. Gaps after that run are arrears.
 */
function calculatePaidUntil(appliedByMonth: Map<number, number>) {
  const fullyPaidKeys = [...appliedByMonth.entries()]
    .filter(([, applied]) => applied >= DEFAULT_MONTHLY_FEE_SEN)
    .map(([key]) => key)
    .sort((a, b) => a - b);

  if (fullyPaidKeys.length === 0) {
    return { year: null, month: null, key: null } as const;
  }

  const firstKey = fullyPaidKeys[0];
  let year = Math.floor(firstKey / 100);
  let month = firstKey % 100;
  let lastKey = firstKey;

  while ((appliedByMonth.get(monthKey(year, month)) ?? 0) >= DEFAULT_MONTHLY_FEE_SEN) {
    lastKey = monthKey(year, month);
    const advanced = nextMonth(year, month);
    year = advanced.year;
    month = advanced.month;
  }

  return { year: Math.floor(lastKey / 100), month: lastKey % 100, key: lastKey } as const;
}

export function buildMonthlyReportRow(
  resident: MonthlyReportResidentInput,
  selectedYear: number,
  selectedMonth: number,
): MonthlyReportRow {
  const appliedByMonth = normalizeMonthlyAppliedByMonth(resident.coverages);
  const paidUntil = calculatePaidUntil(appliedByMonth);
  const selectedKey = monthKey(selectedYear, selectedMonth);
  const selectedApplied = appliedByMonth.get(selectedKey) ?? 0;

  let selectedStatus: SelectedMonthStatus;
  if (selectedApplied >= DEFAULT_MONTHLY_FEE_SEN) {
    selectedStatus = paidUntil.key !== null && paidUntil.key > selectedKey ? "UPFRONT" : "PAID";
  } else if (selectedApplied > 0) {
    selectedStatus = "PARTIAL";
  } else {
    selectedStatus = "UNPAID";
  }

  // Billing starts at the earliest covered month, or when the resident was added.
  const coveredKeys = [...appliedByMonth.keys()].sort((a, b) => a - b);
  const createdKey = monthKey(resident.createdAt.getFullYear(), resident.createdAt.getMonth() + 1);
  const startKey = coveredKeys.length > 0 ? Math.min(coveredKeys[0], createdKey) : createdKey;

  let outstandingMonths = 0;
  let outstandingAmountSen = 0;

  if (startKey <= selectedKey) {
    let cursorYear = Math.floor(startKey / 100);
    let cursorMonth = startKey % 100;

    while (monthKey(cursorYear, cursorMonth) <= selectedKey) {
      const applied = appliedByMonth.get(monthKey(cursorYear, cursorMonth)) ?? 0;

      if (applied < DEFAULT_MONTHLY_FEE_SEN) {
        outstandingMonths += 1;
        outstandingAmountSen += DEFAULT_MONTHLY_FEE_SEN - applied;
      }

      const advanced = nextMonth(cursorYear, cursorMonth);
      cursorYear = advanced.year;
      cursorMonth = advanced.month;
    }
  }

  const extraOutstandingSen = Math.max(0, resident.extraDueSen - resident.extraPaidSen);

  return {
    residentId: resident.id,
    unitNumber: resident.unitNumber,
    name: resident.name,
    status: resident.status,
    paidUntilYear: paidUntil.year,
    paidUntilMonth: paidUntil.month,
    selectedStatus,
    selectedAppliedSen: selectedApplied,
    outstandingMonths,
    outstandingAmountSen,
    lastPaymentDate: resident.lastPaymentDate,
    extraDueSen: resident.extraDueSen,
    extraPaidSen: resident.extraPaidSen,
    extraOutstandingSen,
    extraOutstandingCount: resident.extraOutstandingCount,
  };
}

export function buildMonthlyReport(
  residents: MonthlyReportResidentInput[],
  selectedYear: number,
  selectedMonth: number,
) {
  const rows = residents.map((resident) =>
    buildMonthlyReportRow(resident, selectedYear, selectedMonth),
  );

  const summary: MonthlyReportSummary = {
    residentCount: rows.length,
    paidCount: rows.filter((row) => row.selectedStatus === "PAID").length,
    upfrontCount: rows.filter((row) => row.selectedStatus === "UPFRONT").length,
    partialCount: rows.filter((row) => row.selectedStatus === "PARTIAL").length,
    unpaidCount: rows.filter((row) => row.selectedStatus === "UNPAID").length,
    outstandingAmountSen: rows.reduce((sum, row) => sum + row.outstandingAmountSen, 0),
    collectedSelectedSen: rows.reduce((sum, row) => sum + row.selectedAppliedSen, 0),
    extraOutstandingSen: rows.reduce((sum, row) => sum + row.extraOutstandingSen, 0),
  };

  return { rows, summary };
}
