import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentsPageProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const payments = await prisma.payment.findMany({
    orderBy: { paymentDate: "desc" },
    take: 50,
    include: {
      resident: {
        select: {
          unitNumber: true,
          name: true,
        },
      },
      coverages: {
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
      uploads: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Payment ledger</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Official payment records</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Review payments recorded by admin/AJK or approved from public submissions.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href="/dashboard">
              Dashboard
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700" href="/payments/new">
              <Plus aria-hidden="true" size={17} />
              Record payment
            </Link>
          </div>
        </header>

        {params.created ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Payment recorded successfully.
          </div>
        ) : null}

        <section className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <ReceiptText aria-hidden="true" className="text-cyan-700" size={20} />
            <h2 className="text-lg font-semibold tracking-tight">Recent payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Resident</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Coverage</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length > 0 ? payments.map((payment) => {
                  const firstCoverage = payment.coverages[0];
                  const lastCoverage = payment.coverages[payment.coverages.length - 1];

                  return (
                    <tr className="transition hover:bg-cyan-50/40" key={payment.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{payment.resident.unitNumber}</p>
                        <p className="mt-1 text-slate-500">{payment.resident.name}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{payment.paymentDate.toLocaleDateString("en-MY")}</td>
                      <td className="px-5 py-4 text-slate-600">{payment.paymentType === "MONTHLY_FEE" ? "Monthly fee" : "Special collection"}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {firstCoverage && lastCoverage ? `${monthLabel(firstCoverage.year, firstCoverage.month)} to ${monthLabel(lastCoverage.year, lastCoverage.month)}` : "-"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">{formatRM(payment.amountSen)}</td>
                      <td className="px-5 py-4 text-slate-600">{payment.uploads.length > 0 ? `${payment.uploads.length} file` : "-"}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>No official payments recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}