import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, CreditCard, Edit, MapPin, Phone, ReceiptText, Shield, Users } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { monthState } from "@/lib/status";
import { FileViewer } from "@/app/components/file-viewer";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { StatusPill } from "@/app/components/status";

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
  const t = await getDictionary();

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
          specialCollection: { select: { id: true, title: true } },
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

  // This month's state from the coverages already loaded (newest 12 rows). If every loaded row is
  // later than this month (long prepayment), the list doesn't reach it, so we skip the pill.
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const oldestLoaded = resident.coverages[resident.coverages.length - 1];
  const thisMonthKnown =
    resident.coverages.length < 12 || (!!oldestLoaded && oldestLoaded.year * 12 + oldestLoaded.month <= thisYear * 12 + thisMonth);
  const thisMonthState = monthState({
    amountSen: resident.coverages
      .filter((c) => c.year === thisYear && c.month === thisMonth)
      .reduce((sum, c) => sum + c.amountApplied, 0),
    residentStatus: resident.status,
    isFuture: false,
  });

  // Record-state chip colours (spec §3 tokens)
  const statusColors: Record<string, string> = {
    ACTIVE: "bg-[#e2f7e1] text-[#1c7a33]",
    FOR_SALE: "bg-[#fff4d6] text-[#8a6300]",
    MOVED_OUT: "bg-[#eef0f4] text-[#5d6779]",
    EXEMPT: "bg-[#ddf5fd] text-[#0b6e8e]",
  };
  const badgeClass = statusColors[resident.status] || statusColors.ACTIVE;

  const stats = [
    { icon: Shield, label: "Status", value: statusLabel(resident.status) },
    { icon: CreditCard, label: "Paid until", value: latestCoverage ? monthLabel(latestCoverage.year, latestCoverage.month) : "—" },
    { icon: ReceiptText, label: "Payments", value: resident.payments.length },
    {
      icon: Users,
      label: "Occupancy",
      value: `${resident.tenants.length} tenant${resident.tenants.length !== 1 ? "s" : ""} · ${resident.vehicles.length} vehicle${resident.vehicles.length !== 1 ? "s" : ""}`,
    },
  ];

  const hasLine = resident.addressLine1 || resident.addressLine2;
  const hasCity = resident.city || resident.state || resident.zipCode;

  return (
    <AdminPage>
      <PageHeader
        back={{ href: "/residents", label: "Back to residents" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="grid h-12 min-w-12 place-items-center rounded-2xl bg-[var(--ink)] px-2 text-xl text-white tabular-nums">
              {resident.unitNumber}
            </span>
            <span className="min-w-0">{resident.name}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className={`ui-chip ${badgeClass}`}>{statusLabel(resident.status)}</span>
            {thisMonthKnown && <StatusPill state={thisMonthState} label={`${t.house.thisMonth}: ${t.states[thisMonthState]}`} />}
            {resident.streetBlock && <span className="text-sm">{resident.streetBlock}</span>}
          </span>
        }
        actions={
          <>
            <Link className="ui-button-primary" href={`/residents/${resident.id}/edit`}>
              <Edit size={15} aria-hidden="true" />
              Edit
            </Link>
            <Link className="ui-button-secondary" href={`/payments/new?residentId=${resident.id}`}>
              <ReceiptText size={15} aria-hidden="true" />
              Payment
            </Link>
            <Link className="ui-button-secondary" href={`/residents/${resident.id}/tenants`}>
              <Users size={15} aria-hidden="true" />
              Tenants
            </Link>
            <Link className="ui-button-secondary" href={`/residents/${resident.id}/vehicles`}>
              <Car size={15} aria-hidden="true" />
              Vehicles
            </Link>
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="ui-card p-5">
            <Icon className="size-5 text-[var(--ink-2)]" aria-hidden="true" />
            <p className="mt-2 text-sm text-[var(--ink-2)]">{label}</p>
            <p className="mt-0.5 font-heading text-lg font-bold tracking-tight tabular-nums text-[var(--ink)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Contact / address */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ui-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-black/5 px-5 py-4">
            <Phone className="size-5 text-[var(--ink-2)]" aria-hidden="true" />
            <h2 className="ui-section-title">Contact &amp; Notes</h2>
          </div>
          <dl className="divide-y divide-black/5">
            {[
              { label: "Phone", value: resident.phone },
              { label: "Email", value: resident.email },
            ].map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[100px_1fr] items-center gap-2 px-5 py-3 text-sm">
                <dt className="text-[var(--ink-2)]">{label}</dt>
                <dd className="min-w-0 break-words text-[var(--ink)]">{value ?? <span className="text-[var(--ink-2)]">Not provided</span>}</dd>
              </div>
            ))}
            <div className="grid grid-cols-[100px_1fr] items-start gap-2 px-5 py-3 text-sm">
              <dt className="text-[var(--ink-2)]">Notes</dt>
              <dd className="leading-relaxed text-[var(--ink)]">{resident.notes ?? <span className="text-[var(--ink-2)]">No notes recorded.</span>}</dd>
            </div>
          </dl>
          <div className="border-t border-black/5 px-5 py-3">
            <Link className="text-sm font-semibold text-[var(--blue)] hover:underline" href={`/residents/${resident.id}/edit`}>
              Edit contact →
            </Link>
          </div>
        </section>

        <section className="ui-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-black/5 px-5 py-4">
            <MapPin className="size-5 text-[var(--ink-2)]" aria-hidden="true" />
            <h2 className="ui-section-title">Address</h2>
          </div>
          <dl className="divide-y divide-black/5">
            {hasLine && (
              <div className="grid grid-cols-[100px_1fr] items-center gap-2 px-5 py-3 text-sm">
                <dt className="text-[var(--ink-2)]">Address</dt>
                <dd className="text-[var(--ink)]">
                  {resident.addressLine1}
                  {resident.addressLine2 ? `, ${resident.addressLine2}` : ""}
                </dd>
              </div>
            )}
            {hasCity && (
              <div className="grid grid-cols-[100px_1fr] items-center gap-2 px-5 py-3 text-sm">
                <dt className="text-[var(--ink-2)]">Location</dt>
                <dd className="text-[var(--ink)]">{[resident.city, resident.state, resident.zipCode].filter(Boolean).join(", ")}</dd>
              </div>
            )}
            {!hasLine && !hasCity && <p className="px-5 py-4 text-sm text-[var(--ink-2)]">No address recorded.</p>}
          </dl>
          <div className="border-t border-black/5 px-5 py-3">
            <Link className="text-sm font-semibold text-[var(--blue)] hover:underline" href={`/residents/${resident.id}/edit`}>
              Edit address →
            </Link>
          </div>
        </section>
      </div>

      {/* Payment history */}
      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-[var(--ink-2)]" aria-hidden="true" />
            <h2 className="ui-section-title">Payment History</h2>
          </div>
          {resident.payments.length > 0 && (
            <Link className="text-sm font-semibold text-[var(--blue)] hover:underline" href={`/payments/new?residentId=${resident.id}`}>
              + Record payment
            </Link>
          )}
        </div>
        {resident.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="ui-table min-w-140">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>For</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {resident.payments.map((payment) => {
                  const first = payment.coverages[0];
                  const last = payment.coverages[payment.coverages.length - 1];
                  const months = !first
                    ? null
                    : first.year === last.year && first.month === last.month
                      ? monthLabel(first.year, first.month)
                      : `${monthLabel(first.year, first.month)} – ${monthLabel(last.year, last.month)}`;

                  return (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap tabular-nums text-[var(--ink)]">{payment.paymentDate.toLocaleDateString("en-MY")}</td>
                      <td className="whitespace-nowrap text-right font-semibold tabular-nums text-[var(--ink)]">{formatRM(payment.amountSen)}</td>
                      <td>
                        {/* What the payment was for: monthly fee months, or which special collection. */}
                        {payment.paymentType === "SPECIAL_COLLECTION" ? (
                          payment.specialCollection ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="ui-chip bg-[#e2f7e1] text-[#1c7a33]">Collection</span>
                              <Link href={`/special-collections/${payment.specialCollection.id}`} className="font-medium text-[var(--ink)] hover:text-[var(--blue)] hover:underline">
                                {payment.specialCollection.title}
                              </Link>
                            </span>
                          ) : (
                            <span className="ui-chip bg-[#fff4d6] text-[#8a6300]" title="Recorded before payments were linked to collections">
                              Collection not recorded
                            </span>
                          )
                        ) : (
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="ui-chip bg-[#ddf5fd] text-[#0b6e8e]">Monthly</span>
                            <span className="text-[var(--ink-2)]">{months ?? "—"}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {payment.uploads.length > 0 ? <FileViewer files={payment.uploads} /> : <span className="text-[var(--ink-2)]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ui-empty">No payment history recorded yet.</div>
        )}
      </section>
    </AdminPage>
  );
}
