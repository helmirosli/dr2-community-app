export type MonthCoverage = {
  year: number;
  month: number;
};

/** The system starts billing here; nothing earlier is owed or shown. Earlier years live in prisma/seed/official-residents-archive.json. */
export const BILLING_START: MonthCoverage = { year: 2027, month: 1 };

/** "Now" for anything that picks the current month: the real time, but never before the billing start (so nothing shows 2026 as due). */
export function billingNow(now: Date = new Date()): Date {
  const start = new Date(Date.UTC(BILLING_START.year, BILLING_START.month - 1, 1, 12));
  return now < start ? start : now;
}

/** Never earlier than the billing start. */
export function clampToBilling(m: MonthCoverage): MonthCoverage {
  return m.year * 100 + m.month < BILLING_START.year * 100 + BILLING_START.month ? BILLING_START : m;
}

export function expandMonthRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  const months: MonthCoverage[] = [];
  let cursorYear = startYear;
  let cursorMonth = startMonth;

  while (
    cursorYear < endYear ||
    (cursorYear === endYear && cursorMonth <= endMonth)
  ) {
    months.push({ year: cursorYear, month: cursorMonth });
    cursorMonth += 1;

    if (cursorMonth > 12) {
      cursorMonth = 1;
      cursorYear += 1;
    }
  }

  return months;
}

export function isValidMonthRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
    return false;
  }

  return startYear < endYear || (startYear === endYear && startMonth <= endMonth);
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function monthKey(year: number, month: number) {
  return year * 100 + month;
}

export function isSameMonthCoverage(
  first: MonthCoverage,
  second: MonthCoverage,
) {
  return first.year === second.year && first.month === second.month;
}

export function areMonthRangesOverlapping(
  firstStartYear: number,
  firstStartMonth: number,
  firstEndYear: number,
  firstEndMonth: number,
  secondStartYear: number,
  secondStartMonth: number,
  secondEndYear: number,
  secondEndMonth: number,
) {
  const firstStart = monthKey(firstStartYear, firstStartMonth);
  const firstEnd = monthKey(firstEndYear, firstEndMonth);
  const secondStart = monthKey(secondStartYear, secondStartMonth);
  const secondEnd = monthKey(secondEndYear, secondEndMonth);

  return firstStart <= secondEnd && secondStart <= firstEnd;
}