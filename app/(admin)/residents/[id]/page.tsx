import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, ChevronLeft, CreditCard, Edit, MessageCircle, Phone, ReceiptText, Users } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN, formatRM } from "@/lib/money";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { isFutureMonth, monthState } from "@/lib/status";
import { FileViewer } from "@/app/components/file-viewer";
import { AdminPage } from "@/app/components/page-header";
import { StatusPill, stateStyles } from "@/app/components/status";

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

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  // Paid-until / owed come from the same report logic the AJK reports use; this year's months from
  // the same grid as the public pages (pending submissions shown as "pending").
  const [report, yearCoverages, pending, assignments, collectionPayments] = await Promise.all([
    getMonthlyReport({ year: thisYear, month: thisMonth, includeInactive: true }),
    prisma.paymentCoverage.findMany({ where: { residentId: resident.id, year: thisYear }, select: { month: true, amountApplied: true } }),
    prisma.publicPaymentSubmission.findMany({
      where: { unitNumber: resident.unitNumber, status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
      select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
    }),
    prisma.specialCollectionAssignment.findMany({
      where: { residentId: resident.id },
      select: { amountDue: true, specialCollection: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.groupBy({ by: ["specialCollectionId"], where: { residentId: resident.id, specialCollectionId: { not: null } }, _sum: { amountSen: true } }),
  ]);
  const row = report.rows.find((r) => r.unitNumber === resident.unitNumber);
  const pendingMap = getPendingSubmissionsMap(pending);
  const appliedByMonth = new Map<number, number>();
  for (const c of yearCoverages) appliedByMonth.set(c.month, (appliedByMonth.get(c.month) ?? 0) + c.amountApplied);
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const amountSen = Math.min(appliedByMonth.get(month) ?? 0, DEFAULT_MONTHLY_FEE_SEN) || null;
    return {
      month,
      amountSen,
      state: monthState({
        amountSen,
        residentStatus: resident.status,
        isFuture: isFutureMonth(thisYear, month, now),
        pending: !amountSen && pendingMap.has(`${resident.unitNumber}:${thisYear}:${month}`),
      }),
    };
  });
  const thisMonthState = months[thisMonth - 1].state;

  const paidByCollection = new Map(collectionPayments.map((p) => [p.specialCollectionId, p._sum.amountSen ?? 0]));
  const collections = assignments.map((a) => {
    const paid = paidByCollection.get(a.specialCollection.id) ?? 0;
    return { ...a.specialCollection, due: a.amountDue, paid, owed: Math.max(0, a.amountDue - paid) };
  });
  const collectionsOwed = collections.reduce((sum, c) => sum + c.owed, 0);

  const paidUntil = row?.paidUntilYear && row.paidUntilMonth ? monthLabel(row.paidUntilYear, row.paidUntilMonth) : "No payment yet";
  const owed = row && resident.status === "ACTIVE" ? row.outstandingAmountSen : 0;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-[#e2f7e1] text-[#1c7a33]",
    FOR_SALE: "bg-[#fff4d6] text-[#8a6300]",
    MOVED_OUT: "bg-[#eef0f4] text-[#5d6779]",
    EXEMPT: "bg-[#ddf5fd] text-[#0b6e8e]",
  };

  const address = [resident.streetBlock, resident.addressLine1, resident.addressLine2, [resident.city, resident.state, resident.zipCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const waNumber = resident.phone ? resident.phone.replace(/\D/g, "").replace(/^0/, "60") : "";

  return (
    <AdminPage>
      <Link href="/residents" className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to residents
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white sm:p-8">
        <div aria-hidden="true" className="absolute -right-16 -top-16 size-64 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,0.28),transparent_70%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-[image:var(--blend)] font-heading text-3xl font-extrabold text-[#06210b] tabular-nums">
              {resident.unitNumber}
            </span>
            <div className="min-w-0">
              <h1 className="font-heading text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight">{resident.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`ui-chip ${statusColors[resident.status] ?? statusColors.ACTIVE}`}>{statusLabel(resident.status)}</span>
                <StatusPill state={thisMonthState} label={`${t.house.thisMonth}: ${t.states[thisMonthState]}`} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/payments/new?residentId=${resident.id}`} className="flex items-center gap-1.5 rounded-full bg-[var(--lime)] px-5 py-2.5 font-heading text-sm font-semibold text-[#06210b] hover:brightness-105">
              <ReceiptText size={16} aria-hidden="true" /> Record payment
            </Link>
            <Link href={`/residents/${resident.id}/edit`} className="flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
              <Edit size={15} aria-hidden="true" /> Edit
            </Link>
          </div>
        </div>
        <dl className="relative mt-7 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
          <div>
            <dt className="text-xs text-[#8e9ab8]">Paid until</dt>
            <dd className="mt-1 font-heading text-lg font-bold">{paidUntil}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#8e9ab8]">Owed</dt>
            <dd className={`mt-1 font-heading text-lg font-bold tabular-nums ${owed ? "text-[#ff8a6e]" : ""}`}>
              {owed ? formatRM(owed) : "Up to date"}
              {owed && row ? <span className="ml-1 text-xs font-medium text-[#8e9ab8]">({row.outstandingMonths} mo)</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#8e9ab8]">Collections owed</dt>
            <dd className={`mt-1 font-heading text-lg font-bold tabular-nums ${collectionsOwed ? "text-[#f5b400]" : ""}`}>
              {collections.length ? (collectionsOwed ? formatRM(collectionsOwed) : "Cleared") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-6">
          {/* This year */}
          <section className="ui-card grid gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ui-section-title">{thisYear}</h2>
              <Link href={`/rumah/${encodeURIComponent(resident.unitNumber)}`} className="text-sm font-medium text-[var(--blue)] hover:underline">
                Resident view ›
              </Link>
            </div>
            <ol className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {months.map(({ month, amountSen, state }) => (
                <li key={month} className={`grid gap-0.5 rounded-2xl px-2 py-2.5 text-center ${stateStyles[state].tile} ${month === thisMonth ? "ring-2 ring-[var(--blue)] ring-offset-2" : ""}`}>
                  <span className="text-xs font-bold">{monthLabel(thisYear, month).split(" ")[0]}</span>
                  <span className="text-[10px] font-medium">{amountSen ? (state === "paid" || state === "ahead" ? "✓" : formatRM(amountSen)) : t.states[state]}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Special collections */}
          {collections.length > 0 && (
            <section className="ui-card grid gap-3 p-6">
              <h2 className="ui-section-title">Special collections</h2>
              <ul className="grid gap-3">
                {collections.map((c) => {
                  const pct = c.due ? Math.min(100, Math.round((c.paid / c.due) * 100)) : 0;
                  return (
                    <li key={c.id} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <Link href={`/special-collections/${c.id}`} className="min-w-0 truncate font-semibold text-[var(--ink)] hover:text-[var(--blue)] hover:underline">
                          {c.title}
                        </Link>
                        <span className="shrink-0 tabular-nums text-[var(--ink-2)]">
                          <span className={c.owed ? "font-semibold text-[#8a6300]" : "font-semibold text-[#1c7a33]"}>{formatRM(c.paid)}</span> / {formatRM(c.due)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
                        <div className={`h-full rounded-full ${c.owed ? "bg-[var(--amber)]" : "bg-[var(--leaf)]"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="grid content-start gap-6">
          {/* Details */}
          <section className="ui-card grid gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Details</h2>
              <Link href={`/residents/${resident.id}/edit`} className="text-sm font-medium text-[var(--blue)] hover:underline">
                Edit
              </Link>
            </div>
            {resident.phone ? (
              <div className="grid gap-2">
                <p className="font-heading text-lg font-semibold tabular-nums text-[var(--ink)]">{resident.phone}</p>
                <div className="flex gap-2">
                  <a href={`tel:${resident.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--paper)] py-2 text-sm font-semibold text-[var(--ink)] hover:bg-black/5">
                    <Phone size={15} aria-hidden="true" /> Call
                  </a>
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e7f9ee] py-2 text-sm font-semibold text-[#128c4a] hover:brightness-95">
                    <MessageCircle size={15} aria-hidden="true" /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-2)]">No phone number.</p>
            )}
            <dl className="grid gap-3 border-t border-black/5 pt-4 text-sm">
              <div>
                <dt className="text-xs text-[var(--ink-2)]">Email</dt>
                <dd className="break-words text-[var(--ink)]">{resident.email ?? "—"}</dd>
              </div>
              {address && (
                <div>
                  <dt className="text-xs text-[var(--ink-2)]">Address</dt>
                  <dd className="text-[var(--ink)]">{address}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[var(--ink-2)]">Notes</dt>
                <dd className="whitespace-pre-line text-[var(--ink)]">{resident.notes ?? "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Occupancy */}
          <section className="ui-card grid grid-cols-2 divide-x divide-black/5 overflow-hidden">
            <Link href={`/residents/${resident.id}/tenants`} className="grid gap-1 p-5 hover:bg-[var(--paper)]">
              <Users size={18} className="text-[var(--ink-2)]" aria-hidden="true" />
              <span className="font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{resident.tenants.length}</span>
              <span className="text-xs text-[var(--ink-2)]">Tenants ›</span>
            </Link>
            <Link href={`/residents/${resident.id}/vehicles`} className="grid gap-1 p-5 hover:bg-[var(--paper)]">
              <Car size={18} className="text-[var(--ink-2)]" aria-hidden="true" />
              <span className="font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{resident.vehicles.length}</span>
              <span className="text-xs text-[var(--ink-2)]">Vehicles ›</span>
            </Link>
          </section>
        </div>
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
