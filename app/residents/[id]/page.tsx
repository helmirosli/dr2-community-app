import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, ReceiptText } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResidentDetailPageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(status: string) {
  return status === "MOVED_OUT" ? "Moved out" : status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function ResidentDetailPage({ params }: ResidentDetailPageProps) {
  await requireDashboardUser();

  const { id } = await params;
  const resident = await prisma.resident.findUnique({
    where: { id },
    include: {
      coverages: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 8,
        include: {
          uploads: true,
          coverages: {
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
      },
    },
  });

  if (!resident) {
    notFound();
  }

  const latestCoverage = resident.coverages[0];

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href="/residents">
              Back to residents
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{resident.unitNumber}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{resident.name}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href={`/payments/new?residentId=${resident.id}`}>
              <ReceiptText aria-hidden="true" size={17} />
              Record payment
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" href={`/residents/${resident.id}/edit`}>
              <Edit aria-hidden="true" size={17} />
              Edit resident
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Status</p>
            <p className="mt-2 text-xl font-semibold">{statusLabel(resident.status)}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Paid until</p>
            <p className="mt-2 text-xl font-semibold">{latestCoverage ? monthLabel(latestCoverage.year, latestCoverage.month) : "No coverage"}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Payments</p>
            <p className="mt-2 text-xl font-semibold">{resident.payments.length}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Block</p>
            <p className="mt-2 text-xl font-semibold">{resident.streetBlock ?? "-"}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Contact and notes</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Phone</dt>
                <dd className="mt-1 text-slate-950">{resident.phone ?? "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="mt-1 text-slate-950">{resident.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Notes</dt>
                <dd className="mt-1 leading-6 text-slate-700">{resident.notes ?? "No notes recorded."}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <ReceiptText aria-hidden="true" className="text-cyan-700" size={19} />
              <h2 className="text-lg font-semibold tracking-tight">Recent payment history</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {resident.payments.length > 0 ? (
                resident.payments.map((payment) => (
                  <div className="grid gap-3 px-5 py-4 text-sm" key={payment.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{formatRM(payment.amountSen)}</p>
                        <p className="mt-1 text-slate-500">{payment.paymentType === "MONTHLY_FEE" ? "Monthly fee" : "Special collection"} / {payment.method}</p>
                      </div>
                      <p className="font-medium text-slate-600">{payment.paymentDate.toLocaleDateString("en-MY")}</p>
                    </div>
                    <p className="text-slate-600">
                      Coverage: {payment.coverages.length > 0 ? `${monthLabel(payment.coverages[0].year, payment.coverages[0].month)} to ${monthLabel(payment.coverages[payment.coverages.length - 1].year, payment.coverages[payment.coverages.length - 1].month)}` : "Not monthly coverage"}
                    </p>
                    {payment.uploads.length > 0 ? <p className="text-slate-500">{payment.uploads.length} upload attached</p> : null}
                  </div>
                ))
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No official payment history yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}