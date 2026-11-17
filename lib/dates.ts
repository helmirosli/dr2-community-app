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
