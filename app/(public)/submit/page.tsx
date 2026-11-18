import { getDictionary, getLocale } from "@/lib/i18n";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { firstName, monthName } from "@/lib/status";
import { TourButton } from "@/app/components/tour/tour-button";
import { SubmitPaymentForm, type SubmitHouse } from "./submit-payment-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicSubmitPage({ searchParams }: { searchParams: Promise<{ unit?: string; count?: string }> }) {
  const now = new Date();
  const [{ unit, count }, t, locale, report, specialCollections] = await Promise.all([
    searchParams,
    getDictionary(),
    getLocale(),
    getMonthlyReport({ year: now.getFullYear(), month: now.getMonth() + 1, includeInactive: false }),
    prisma.specialCollection.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, amountPerResident: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // What each house still owes per active special collection (due − paid). The form asks for this, not the full amount.
  const assignments = await prisma.specialCollectionAssignment.findMany({
    where: { specialCollection: { status: "ACTIVE" } },
    select: { specialCollectionId: true, amountDue: true, amountPaid: true, resident: { select: { unitNumber: true } } },
  });
  const outstandingByUnit: Record<string, Record<string, number>> = {};
  for (const a of assignments) {
    (outstandingByUnit[a.resident.unitNumber] ??= {})[a.specialCollectionId] = Math.max(0, a.amountDue - a.amountPaid);
  }

  // Months that already have a receipt waiting for review, per house: they cannot be paid again.
  const waiting = await prisma.publicPaymentSubmission.findMany({
    where: { status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
    select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
  });
  const pendingByUnit: Record<string, string[]> = {};
  for (const key of getPendingSubmissionsMap(waiting).keys()) {
    const [unit, year, month] = key.split(":");
    (pendingByUnit[unit] ??= []).push(`${year}-${month}`);
  }

  // Step 1 needs: house list, paid-until, and the first month still owed (next after paid-until, never before this month's start of billing).
  const houses: SubmitHouse[] = report.rows
    .map((r) => {
      const hasPaid = r.paidUntilYear !== null && r.paidUntilMonth !== null;
      const next = hasPaid
        ? r.paidUntilMonth === 12
          ? { year: r.paidUntilYear! + 1, month: 1 }
          : { year: r.paidUntilYear!, month: r.paidUntilMonth! + 1 }
        : { year: now.getFullYear(), month: now.getMonth() + 1 };
      return {
        unit: r.unitNumber,
        name: firstName(r.name),
        paidUntil: hasPaid ? monthName(locale, r.paidUntilYear!, r.paidUntilMonth!, "long") : null,
        pending: pendingByUnit[r.unitNumber] ?? [],
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
