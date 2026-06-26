import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { FileViewer } from "@/app/components/file-viewer";
import { TablePagination } from "@/app/components/table-pagination";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
    perPage?: string;
    created?: string;
  }>;
};

const PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PER_PAGE = 10;
const VALID_TYPES = ["MONTHLY_FEE", "SPECIAL_COLLECTION"] as const;

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const t = await getDictionary();

  const query     = params.q?.trim() ?? "";
  const typeFilter = VALID_TYPES.includes(params.type as (typeof VALID_TYPES)[number]) ? params.type : "";
  const fromDate  = params.from ? new Date(params.from) : undefined;
  const toDate    = params.to   ? new Date(params.to + "T23:59:59") : undefined;
  const perPage   = PER_PAGE_OPTIONS.includes(parseInt(params.perPage ?? "", 10))
    ? parseInt(params.perPage!, 10)
    : DEFAULT_PER_PAGE;
  const page      = Math.max(1, parseInt(params.page || "1", 10));
  const skip      = (page - 1) * perPage;

  const whereClause = {
    ...(typeFilter ? { paymentType: typeFilter as (typeof VALID_TYPES)[number] } : {}),
    ...(fromDate || toDate ? { paymentDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    ...(query ? {
      OR: [
        { referenceNo: { contains: query, mode: "insensitive" as const } },
        { notes: { contains: query, mode: "insensitive" as const } },
        { resident: {
          OR: [
            { unitNumber: { contains: query, mode: "insensitive" as const } },
            { name:       { contains: query, mode: "insensitive" as const } },
            { phone:      { contains: query, mode: "insensitive" as const } },
          ],
        }},
      ],
    } : {}),
  };

  const [payments, totalCount] = await Promise.all([
    prisma.payment.findMany({
      where: whereClause,
      orderBy: { paymentDate: "desc" },
      skip,
      take: perPage,
      include: {
        resident: { select: { unitNumber: true, name: true } },
        coverages: { orderBy: [{ year: "asc" }, { month: "asc" }] },
        uploads: { select: { id: true, originalFilename: true, storagePath: true, mimeType: true, url: true } },
      },
    }),
    prisma.payment.count({ where: whereClause }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(page, totalPages);
  const hasFilters = !!(query || typeFilter || fromDate || toDate);

  function pageLink(p: number) {
    const sp = new URLSearchParams({ page: String(p), perPage: String(perPage) });
    if (query)       sp.set("q",    query);
    if (typeFilter)  sp.set("type", typeFilter);
    if (params.from) sp.set("from", params.from!);
    if (params.to)   sp.set("to",   params.to!);
    return `/payments?${sp}`;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Operations</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.payments.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{t.payments.ledger}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.payments.title}</h1>
          </div>
          <Link className="ui-button-primary shrink-0" href="/payments/new">
            <Plus aria-hidden="true" size={16} />
            {t.payments.recordPayment}
          </Link>
        </div>

        {params.created && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {t.payments.recordedSuccess}
          </div>
        )}

        <section className="ui-card overflow-hidden">
          {/* Filter bar */}
          <form className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4" method="get">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-500 min-w-40">
                <Search aria-hidden="true" className="shrink-0 text-slate-400" size={15} />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  defaultValue={query}
                  name="q"
                  placeholder="Search unit, resident, reference..."
                />
              </div>
              {/* Type filter */}
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                name="type"
                defaultValue={typeFilter}
              >
                <option value="">All types</option>
                <option value="MONTHLY_FEE">{t.payments.monthlyFee}</option>
                <option value="SPECIAL_COLLECTION">{t.payments.specialCollection}</option>
              </select>
              <button className="ui-button-primary shrink-0" type="submit">{t.common.apply}</button>
              {hasFilters && (
                <Link className="text-sm text-slate-500 hover:text-slate-700" href="/payments">Clear</Link>
              )}
            </div>
            {/* Date range */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="text-xs font-medium text-slate-500">Date range:</span>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">From</span>
                <input
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  defaultValue={params.from ?? ""}
                  name="from"
                  type="date"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">To</span>
                <input
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  defaultValue={params.to ?? ""}
                  name="to"
                  type="date"
                />
              </label>
            </div>
          </form>

          {/* Showing summary */}
          <div className="border-b border-slate-100 px-5 py-2 text-xs text-slate-500">
            {totalCount} payment{totalCount !== 1 ? "s" : ""}
            {hasFilters && " matching filters"}
            {!hasFilters && " total"}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.resident}</th>
                  <th className="px-5 py-3 font-semibold">{t.payments.date}</th>
                  <th className="px-5 py-3 font-semibold">{t.payments.type}</th>
                  <th className="px-5 py-3 font-semibold">{t.payments.coverage}</th>
                  <th className="px-5 py-3 font-semibold">{t.payments.amount}</th>
                  <th className="px-5 py-3 font-semibold">{t.payments.proof}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length > 0 ? (
                  payments.map((payment) => {
                    const first = payment.coverages[0];
                    const last  = payment.coverages[payment.coverages.length - 1];
                    const isMonthly = payment.paymentType === "MONTHLY_FEE";
                    return (
                      <tr className="transition hover:bg-cyan-50/40" key={payment.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-950">{payment.resident.unitNumber}</p>
                          <p className="text-xs text-slate-500">{payment.resident.name}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{payment.paymentDate.toLocaleDateString("en-MY")}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            isMonthly
                              ? "bg-cyan-50 text-cyan-700 ring-cyan-100"
                              : "bg-sky-50 text-sky-700 ring-sky-100"
                          }`}>
                            {isMonthly ? t.payments.monthlyFee : t.payments.specialCollection}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {first && last
                            ? `${monthLabel(first.year, first.month)} – ${monthLabel(last.year, last.month)}`
                            : "—"}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-950">{formatRM(payment.amountSen)}</td>
                        <td className="px-5 py-3">
                          {payment.uploads.length > 0 ? <FileViewer files={payment.uploads} /> : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                      {t.payments.noPayments}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            perPage={perPage}
            rangeStart={totalCount === 0 ? 0 : skip + 1}
            rangeEnd={Math.min(skip + perPage, totalCount)}
            perPageOptions={PER_PAGE_OPTIONS}
            pageLink={pageLink}
          />
        </section>
      </div>
    </main>
  );
}
