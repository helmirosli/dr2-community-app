import { getDictionary, getLocale } from "@/lib/i18n";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { firstName, monthName } from "@/lib/status";
import { TourButton } from "@/app/components/tour/tour-button";
import { SubmitPaymentForm, type SubmitHouse } from "./submit-payment-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicSubmitPage({ searchParams }: { searchParams: Promise<{ unit?: string; count?: string }> }) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  // All independent reads run together (Prisma queries only start once awaited, so they go in this one Promise.all).
  const assignmentsQuery = prisma.specialCollectionAssignment.findMany({
    where: { specialCollection: { status: "ACTIVE" } },
    select: { specialCollectionId: true, amountDue: true, amountPaid: true, resident: { select: { unitNumber: true } } },
  });
  const waitingQuery = prisma.publicPaymentSubmission.findMany({
    where: { status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
    select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
  });
  const gridsQuery = Promise.all([thisYear, thisYear + 1].map((year) => getYearGridData({ year, includeInactive: false })));
  const [{ unit, count }, t, locale, report, specialCollections, assignments, waiting, grids] = await Promise.all([
    searchParams,
    getDictionary(),
    getLocale(),
    getMonthlyReport({ year: now.getFullYear(), month: now.getMonth() + 1, includeInactive: false }),
    prisma.specialCollection.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, amountPerResident: true },
      orderBy: { createdAt: "asc" },
    }),
    assignmentsQuery,
    waitingQuery,
    gridsQuery,
  ]);

  // What each house still owes per active special collection (due − paid). The form asks for this, not the full amount.
  const outstandingByUnit: Record<string, Record<string, number>> = {};
  for (const a of assignments) {
    (outstandingByUnit[a.resident.unitNumber] ??= {})[a.specialCollectionId] = Math.max(0, a.amountDue - a.amountPaid);
  }

  // Months that already have a receipt waiting for review, per house: they cannot be paid again.
  const pendingByUnit: Record<string, string[]> = {};
  for (const key of getPendingSubmissionsMap(waiting).keys()) {
    const [unit, year, month] = key.split(":");
    (pendingByUnit[unit] ??= []).push(`${year}-${month}`);
  }

  // Step 1 needs: house list, paid-until, and the first month still owed (next after paid-until, never before this month's start of billing).
  // Months already paid in full (this year and next) cannot be paid again, and the choice starts at the
  // first month still owed, even when it is older than the paid-until month (a gap such as Jan-Mar).
  const paidByUnit: Record<string, string[]> = {};
  const partialByUnit: Record<string, Record<string, number>> = {};
  const firstOwedByUnit: Record<string, { year: number; month: number }> = {};
  grids.forEach((grid, g) => {
    for (const row of grid.rows) {
      row.months.forEach((amount, i) => {
        const paid = amount ?? 0;
        if (paid >= DEFAULT_MONTHLY_FEE_SEN) {
          (paidByUnit[row.unitNumber] ??= []).push(`${grid.year}-${i + 1}`);
          return;
        }
        // Part of the fee is already in (e.g. an earlier overpayment spilled into this month).
        if (paid > 0) (partialByUnit[row.unitNumber] ??= {})[`${grid.year}-${i + 1}`] = paid;
        if (g === 0 && i + 1 <= thisMonth && !firstOwedByUnit[row.unitNumber] && row.monthStatus[i] === "ACTIVE" && !row.monthStatusOverrides[i]) {
          firstOwedByUnit[row.unitNumber] = { year: grid.year, month: i + 1 };
        }
      });
    }
  });

  const houses: SubmitHouse[] = report.rows
    .map((r) => {
      const hasPaid = r.paidUntilYear !== null && r.paidUntilMonth !== null;
      const next = firstOwedByUnit[r.unitNumber] ?? (hasPaid
        ? r.paidUntilMonth === 12
          ? { year: r.paidUntilYear! + 1, month: 1 }
          : { year: r.paidUntilYear!, month: r.paidUntilMonth! + 1 }
        : { year: thisYear, month: thisMonth });
      return {
        unit: r.unitNumber,
        name: firstName(r.name),
        paidUntil: hasPaid ? monthName(locale, r.paidUntilYear!, r.paidUntilMonth!, "long") : null,
        pending: pendingByUnit[r.unitNumber] ?? [],
        paid: paidByUnit[r.unitNumber] ?? [],
        partial: partialByUnit[r.unitNumber] ?? {},
        nextYear: next.year,
        nextMonth: next.month,
      };
    })
    .sort((a, b) => Number(a.unit) - Number(b.unit) || a.unit.localeCompare(b.unit));

  return (
    <>
      <section className="px-4 pb-10 pt-12 text-center sm:pt-16">
        <h1 className="font-heading text-[clamp(2.2rem,6vw,3.6rem)] font-bold leading-tight tracking-tight">{t.submitFlow.title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-[#a1a1a6]">{t.submitFlow.subtitle}</p>
        <div className="mt-5 flex justify-center">
          <TourButton id="resident-submit" />
        </div>
      </section>
      <section className="bg-[var(--paper)] px-4 py-10 text-[var(--ink)] sm:py-14">
        <div className="mx-auto max-w-xl">
          <SubmitPaymentForm
            houses={houses}
            initialUnit={unit ?? ""}
            initialCount={Math.min(12, Math.max(1, Number(count) || 1))}
            specialCollections={specialCollections}
            outstandingByUnit={outstandingByUnit}
            bank={{
              name: process.env.NEXT_PUBLIC_BANK_NAME ?? "—",
              holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "—",
              account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "—",
            }}
          />
        </div>
      </section>
    </>
  );
}
