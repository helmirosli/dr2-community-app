import Link from "next/link";
import { CalendarDays, Plus, Search } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { FileViewer } from "@/app/components/file-viewer";
import { TablePagination } from "@/app/components/table-pagination";
import { AdminPage, PageHeader } from "@/app/components/page-header";

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

  const [payments, totalCount, typeCounts] = await Promise.all([
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
    // Per-type counts under the other active filters, for the segmented control.
    prisma.payment.groupBy({ by: ["paymentType"], where: { ...whereClause, paymentType: undefined }, _count: { _all: true } }),
  ]);
  const typeCount = (type?: string) =>
    typeCounts.filter((c) => !type || c.paymentType === type).reduce((sum, c) => sum + c._count._all, 0);

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
  function typeLink(type: string) {
    const sp = new URLSearchParams({ perPage: String(perPage) });
    if (query)       sp.set("q",    query);
    if (type)        sp.set("type", type);
    if (params.from) sp.set("from", params.from!);
    if (params.to)   sp.set("to",   params.to!);
    return `/payments?${sp}`;
  }

  return (
    <AdminPage>
      <PageHeader
        title={t.payments.title}
        subtitle={t.payments.ledger}
        actions={
          <Link className="ui-button-primary" href="/payments/new">
            <Plus aria-hidden="true" size={16} />
            {t.payments.recordPayment}
          </Link>
        }
      />

      {params.created && <div className="ui-alert-success">{t.payments.recordedSuccess}</div>}

      <section className="ui-card overflow-hidden">
        {/* Fixed two-row layout so nothing reflows when a filter (and the Clear link) becomes active */}
        <form method="get" className="grid gap-3 border-b border-black/5 px-5 py-4">
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          <input type="hidden" name="perPage" value={perPage} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Segmented type filter with counts */}
            <nav aria-label="Filter by type" className="flex w-full overflow-x-auto rounded-full bg-[var(--paper)] p-1 sm:w-auto">
              {([
                ["", "All"],
                ["MONTHLY_FEE", t.payments.monthlyFee],
                ["SPECIAL_COLLECTION", t.payments.specialCollection],
              ] as const).map(([type, label]) => {
                const active = (typeFilter ?? "") === type;
                return (
                  <Link
                    key={type || "all"}
                    href={typeLink(type)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] sm:flex-none sm:px-4 ${
                      active ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`rounded-full px-1.5 text-[11px] leading-5 tabular-nums ${active ? "bg-[var(--paper)] text-[var(--ink-2)]" : "text-[#aeaeb2]"}`}>
                      {typeCount(type || undefined)}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <label className="flex h-11 items-center gap-2 rounded-full bg-[var(--paper)] px-4 focus-within:outline focus-within:outline-3 focus-within:outline-[rgba(34,199,242,0.35)] sm:w-72">
              <Search aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-2)]" />
              <input
                defaultValue={query}
                name="q"
                placeholder="Unit, name or reference"
                aria-label="Search unit, resident or reference"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aeaeb2]"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-11 w-full items-center gap-1 rounded-full bg-[var(--paper)] pl-4 pr-2 text-sm text-[var(--ink-2)] sm:w-auto">
              <CalendarDays aria-hidden="true" size={16} className="shrink-0" />
              <input aria-label="From date" defaultValue={params.from ?? ""} name="from" type="date" className="min-w-0 flex-1 bg-transparent px-1 text-[var(--ink)] outline-none sm:w-[8.5rem] sm:flex-none" />
              <span aria-hidden="true">–</span>
              <input aria-label="To date" defaultValue={params.to ?? ""} name="to" type="date" className="min-w-0 flex-1 bg-transparent px-1 text-[var(--ink)] outline-none sm:w-[8.5rem] sm:flex-none" />
            </div>
            <button className="h-11 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white hover:bg-black" type="submit">
              {t.common.apply}
            </button>
            {hasFilters && (
              <Link className="grid h-11 place-items-center rounded-full px-3 text-sm font-medium text-[var(--blue)] hover:bg-black/5" href="/payments">
                Clear
              </Link>
            )}
            <span className="ml-auto hidden text-xs text-[var(--ink-2)] sm:inline">{totalCount} payments</span>
          </div>
        </form>

        <p className="px-5 py-2 text-xs text-[var(--ink-2)]">
          {totalCount} payment{totalCount !== 1 ? "s" : ""}
          {hasFilters && " matching filters"}
          {!hasFilters && " total"}
        </p>

        <div className="overflow-x-auto">
          <table className="ui-table min-w-180">
            <thead>
              <tr>
                <th>{t.dashboard.resident}</th>
                <th>{t.payments.date}</th>
                <th>{t.payments.type}</th>
                <th>{t.payments.coverage}</th>
                <th className="text-right">{t.payments.amount}</th>
                <th>{t.payments.proof}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((payment) => {
                  const first = payment.coverages[0];
                  const last  = payment.coverages[payment.coverages.length - 1];
                  const isMonthly = payment.paymentType === "MONTHLY_FEE";
                  return (
                    <tr key={payment.id}>
                      <td>
                        <p className="font-semibold text-[var(--ink)]">{payment.resident.unitNumber}</p>
                        <p className="text-xs text-[var(--ink-2)]">{payment.resident.name}</p>
                      </td>
                      <td className="whitespace-nowrap tabular-nums text-[var(--ink-2)]">{payment.paymentDate.toLocaleDateString("en-MY")}</td>
                      <td>
                        <span className={`ui-chip ${isMonthly ? "bg-[#ddf5fd] text-[#0b6e8e]" : "bg-[#eef0f4] text-[#5d6779]"}`}>
                          {isMonthly ? t.payments.monthlyFee : t.payments.specialCollection}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-[var(--ink-2)]">
                        {first && last
                          ? `${monthLabel(first.year, first.month)} – ${monthLabel(last.year, last.month)}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold tabular-nums text-[var(--ink)]">{formatRM(payment.amountSen)}</td>
                      <td>
                        {payment.uploads.length > 0 ? <FileViewer files={payment.uploads} /> : <span className="text-[var(--ink-2)]">—</span>}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="ui-empty">{t.payments.noPayments}</div>
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
    </AdminPage>
  );
}
