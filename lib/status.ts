import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";

/** The status language from the redesign spec §3, shared by every grid, tile and pill. */
export type MonthState = "paid" | "ahead" | "pending" | "partial" | "unpaid" | "hold" | "upcoming";

type ResidentStatus = "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";

export function monthState({
  amountSen,
  override,
  residentStatus,
  isFuture,
  pending,
}: {
  amountSen: number | null;
  override?: string | null;
  residentStatus: ResidentStatus;
  isFuture: boolean;
  pending?: boolean;
}): MonthState {
  // What was actually paid (or is waiting for review) always shows; the house's status only labels
  // months with no payment. Pass the month's own status (YearGridRow.monthStatus) where known.
  if (pending) return "pending";
  const amount = amountSen ?? 0;
  if (amount >= DEFAULT_MONTHLY_FEE_SEN) return isFuture ? "ahead" : "paid";
  if (amount > 0) return "partial";
  if (override || residentStatus !== "ACTIVE") return "hold";
  return isFuture ? "upcoming" : "unpaid";
}

/** True when (year, month) is after the current calendar month. */
export function isFutureMonth(year: number, month: number, now = new Date()) {
  return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
}

/** First name only, for public pages (spec §9). */
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Month name in the visitor's language, e.g. "Ogo" / "Aug" (short) or "Ogos 2026" (long). */
export function monthName(locale: string, year: number, month: number, style: "short" | "long" = "short") {
  const fmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", style === "long" ? { month: "long", year: "numeric" } : { month: "short" });
  return fmt.format(new Date(year, month - 1, 1));
}
