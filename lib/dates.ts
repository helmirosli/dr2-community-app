import type { Locale } from "@/lib/i18n/locale";

const DAY_MS = 86_400_000;

/**
 * Whole days from today (Malaysia date) to a date stored as UTC midnight, such as a due date.
 * 0 = today, 1 = tomorrow, negative once it has passed.
 */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }); // "2026-11-17"
  return Math.round((Date.parse(date.toISOString().slice(0, 10)) - Date.parse(today)) / DAY_MS);
}

/** "31 Dec 2026" for a date stored as UTC midnight (so it shows the day that was picked, whatever the server's time zone). */
export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Today's date in Malaysia, month 1–12. */
export function malaysiaToday(now: Date = new Date()) {
  const [year, month, day] = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).split("-").map(Number);
  return { year, month, day };
}

/** First and last day of a month as "YYYY-MM-DD" strings (month 1–12). */
export function monthRange(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(last)}` };
}

/**
 * The month the community is collecting for right now: this month, except in its first 7 days when most
 * people have not paid yet, so it is last month (the home page uses the same rule).
 */
export function collectionMonth(now: Date = new Date()) {
  const today = malaysiaToday(now);
  const useLast = today.day <= 7;
  const previous = today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
  return { ...(useLast ? previous : { year: today.year, month: today.month }), isPrevious: useLast };
}
