import Link from "next/link";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "../payment-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NewPaymentPageProps = {
  searchParams?: Promise<{ residentId?: string }>;
};

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const residents = await prisma.resident.findMany({
    where: { status: "ACTIVE" },
    orderBy: { unitNumber: "asc" },
    select: {
      id: true,
      unitNumber: true,
      name: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <header>
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href="/payments">Payment records</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Record official payment</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Record monthly fees, backdated payments, upfront payments, or special collections for an active resident.
          </p>
        </header>
        {residents.length > 0 ? (
          <PaymentForm residents={residents} selectedResidentId={params?.residentId} />
        ) : (
          <div className="rounded-lg border border-cyan-950/10 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Add at least one active resident before recording payments.
          </div>
        )}
      </div>
    </main>
  );
}