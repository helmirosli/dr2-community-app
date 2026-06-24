import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, ReceiptText, MapPin, Phone, Mail, FileText, CreditCard, Shield, Users, Car } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { FileViewer } from "@/app/components/file-viewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResidentDetailPageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(status: string) {
  if (status === "FOR_SALE") return "For sale";
  if (status === "MOVED_OUT") return "Moved out";
  if (status === "EXEMPT") return "Exempt";
  return status.charAt(0) + status.slice(1).toLowerCase();
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
        take: 10,
        include: {
          uploads: {
            select: {
              id: true,
              originalFilename: true,
              storagePath: true,
              mimeType: true,
              url: true,
            },
          },
          coverages: {
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
      },
      tenants: {
        orderBy: { createdAt: "asc" },
      },
      vehicles: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!resident) {
    notFound();
  }

  const latestCoverage = resident.coverages[0];

  // Status badge color mapping
  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    FOR_SALE: "bg-amber-50 text-amber-800 ring-amber-600/20",
    MOVED_OUT: "bg-slate-100 text-slate-600 ring-slate-400/30",
    EXEMPT: "bg-cyan-50 text-cyan-800 ring-cyan-600/20",
  };
  const badgeClass = statusColors[resident.status] || statusColors.ACTIVE;

  return (
    <main className="min-h-screen bg-[#f8fafa] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">

        {/* ── Hero header ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
            href="/residents"
          >
            <svg aria-hidden className="lucide lucide-arrow-left size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            Back to residents
          </Link>

          <div className="mt-4 flex flex-col gap-1 sm:items-center sm:flex-row sm:items-start lg:gap-6">
            {/* Unit number badge */}
            <div className={`flex size-16 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ring-1 ring-white/20 bg-cyan-700`}>
              {resident.unitNumber}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{resident.name}</h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}>
                  {statusLabel(resident.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {resident.streetBlock && <><span className="font-medium text-slate-600">Block/Street:</span> {resident.streetBlock}</>}
                {resident.phone && <span className="ms-4"><span className="font-medium text-slate-600">Phone:</span> {resident.phone}</span>}
                {resident.email && <span className="ms-4"><span className="font-medium text-slate-600">Email:</span> <span className="text-slate-700">{resident.email}</span></span>}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800"
                href={`/residents/${resident.id}/edit`}
              >
                <Edit size={15} />
                Edit
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                href={`/payments/new?residentId=${resident.id}`}
              >
                <ReceiptText size={15} />
                Payment
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                href={`/residents/${resident.id}/tenants`}
              >
                <Users size={15} />
                Tenants
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                href={`/residents/${resident.id}/vehicles`}
              >
                <Car size={15} />
                Vehicles
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Status */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <Shield className="size-5 text-cyan-600" />
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{statusLabel(resident.status)}</p>
          </div>

          {/* Paid until */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <CreditCard className="size-5 text-emerald-600" />
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Paid until</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {latestCoverage ? monthLabel(latestCoverage.year, latestCoverage.month) : "—"}
            </p>
          </div>

          {/* Total payments */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <ReceiptText className="size-5 text-sky-600" />
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Payments</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{resident.payments.length}</p>
          </div>

          {/* Tenants + Vehicles */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <Users className="size-5 text-violet-600" />
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Occupancy</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {resident.tenants.length} tenant{resident.tenants.length !== 1 ? "s" : ""} · {resident.vehicles.length} vehicle{resident.vehicles.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* ── Content grid: contact / address ────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Contact & Notes */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Phone className="size-5 text-cyan-600" />
              <h2 className="text-base font-semibold tracking-tight">Contact &amp; Notes</h2>
            </div>
            <dl className="divide-y divide-slate-100">
              {[
                { label: "Phone", value: resident.phone },
                { label: "Email", value: resident.email },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[100px_1fr] items-center px-5 py-3 text-sm">
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="text-slate-900">{value ?? <span className="text-slate-400">Not provided</span>}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[100px_1fr] items-start gap-2 px-5 py-3 text-sm">
                <dt className="font-medium text-slate-500 mt-0.5">Notes</dt>
                <dd className="leading-relaxed text-slate-700">{resident.notes ?? <span className="text-slate-400">No notes recorded.</span>}</dd>
              </div>
            </dl>
            <div className="border-t border-slate-100 px-5 py-3">
              <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-800" href={`/residents/${resident.id}/edit`}>
                Edit contact →
              </Link>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <MapPin className="size-5 text-cyan-600" />
              <h2 className="text-base font-semibold tracking-tight">Address</h2>
            </div>
            <dl className="divide-y divide-slate-100">
              {(() => {
                const hasLine = resident.addressLine1 || resident.addressLine2;
                const hasCity = resident.city || resident.state || resident.zipCode;
                return (
                  <>
                    {hasLine && (
                      <div className="grid grid-cols-[100px_1fr] items-center gap-2 px-5 py-3 text-sm">
                        <dt className="font-medium text-slate-500 mt-0.5">Address</dt>
                        <dd className="text-slate-900">
                          {resident.addressLine1}
                          {resident.addressLine2 ? `, ${resident.addressLine2}` : ""}
                        </dd>
                      </div>
                    )}
                    {hasCity && (
                      <div className="grid grid-cols-[100px_1fr] items-center gap-2 px-5 py-3 text-sm">
                        <dt className="font-medium text-slate-500 mt-0.5">Location</dt>
                        <dd className="text-slate-900">
                          {[resident.city, resident.state, resident.zipCode].filter(Boolean).join(", ")}
                        </dd>
                      </div>
                    )}
                    {!hasLine && !hasCity && (
                      <div className="grid grid-cols-[100px_1fr] items-center gap-2 px-5 py-4 text-sm">
                        <dt className="font-medium text-slate-500 mt-0.5">&nbsp;</dt>
                        <dd className="text-slate-400">No address recorded.</dd>
                      </div>
                    )}
                  </>
                );
              })()}
            </dl>
            <div className="border-t border-slate-100 px-5 py-3">
              <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-800" href={`/residents/${resident.id}/edit`}>
                Edit address →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Payment history ────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-cyan-600" />
              <h2 className="text-base font-semibold tracking-tight">Payment History</h2>
            </div>
            {resident.payments.length > 0 && (
              <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-800" href={`/payments/new?residentId=${resident.id}`}>
                + Record payment
              </Link>
            )}
          </div>
          {resident.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Coverage</th>
                    <th className="px-5 py-3 font-semibold">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resident.payments.map((payment) => {
                    const coverageRange =
                      payment.coverages.length > 0
                        ? `${monthLabel(payment.coverages[0].year, payment.coverages[0].month)} – ${monthLabel(payment.coverages[payment.coverages.length - 1].year, payment.coverages[payment.coverages.length - 1].month)}`
                        : "-";

                    return (
                      <tr key={payment.id} className="transition hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-700">
                          {payment.paymentDate.toLocaleDateString("en-MY")}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {formatRM(payment.amountSen)}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{coverageRange}</td>
                        <td className="px-5 py-3">
                          {payment.uploads.length > 0 ? (
                            <FileViewer files={payment.uploads} />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No payment history recorded yet.</p>
          )}
        </div>

      </div>
    </main>
  );
}