import Link from "next/link";
import { ChevronRight, Plus, ReceiptText } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { FileViewer } from "@/app/components/file-viewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentsPageProps = {
  searchParams: Promise<{ created?: string; page?: string }>;
};

const ITEMS_PER_PAGE = 25;

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const t = await getDictionary();

  const page = Math.max(1, parseInt(params.page || "1", 10));
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const [payments, totalCount] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { paymentDate: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
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
        uploads: {
          select: {
            id: true,
            originalFilename: true,
            storagePath: true,
            mimeType: true,
            url: true,
          },
        },
      },
    }),
    prisma.payment.count(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Operations</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.payments.title}</span>
        </nav>
        <header className="ui-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{t.payments.ledger}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.payments.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t.payments.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="ui-button-primary" href="/payments/new">
              <Plus aria-hidden="true" size={17} />
              {t.payments.recordPayment}
            </Link>
          </div>
        </header>

        {params.created ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {t.payments.recordedSuccess}
          </div>
        ) : null}

        <section className="ui-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <ReceiptText aria-hidden="true" className="text-cyan-700" size={20} />
            <h2 className="text-lg font-semibold tracking-tight">{t.payments.recentPayments}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.dashboard.resident}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.payments.date}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.payments.type}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.payments.coverage}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.payments.amount}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.payments.proof}</th>
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
                      <td className="px-5 py-4 text-slate-600">{payment.paymentType === "MONTHLY_FEE" ? t.payments.monthlyFee : t.payments.specialCollection}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {firstCoverage && lastCoverage ? `${monthLabel(firstCoverage.year, firstCoverage.month)} to ${monthLabel(lastCoverage.year, lastCoverage.month)}` : "-"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">{formatRM(payment.amountSen)}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {payment.uploads.length > 0 ? <FileViewer files={payment.uploads} /> : "-"}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>{t.payments.noPayments}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-600">
                {t.common.showing} <span className="font-semibold">{skip + 1}</span> {t.common.to}{" "}
                <span className="font-semibold">{Math.min(skip + ITEMS_PER_PAGE, totalCount)}</span> {t.common.of}{" "}
                <span className="font-semibold">{totalCount}</span> payments
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={`/payments?page=${page - 1}`}
                  >
                    {t.common.previous}
                  </Link>
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Link
                        className={`rounded-md px-2.5 py-2 text-sm font-semibold transition ${
                          pageNum === page
                            ? "bg-cyan-600 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        href={`/payments?page=${pageNum}`}
                        key={pageNum}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>
                {page < totalPages && (
                  <Link
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={`/payments?page=${page + 1}`}
                  >
                    {t.common.next}
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
