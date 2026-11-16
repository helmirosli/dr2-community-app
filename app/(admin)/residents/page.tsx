import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { SearchableSelect } from "@/app/components/searchable-select";
import { TablePagination } from "@/app/components/table-pagination";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = ["ACTIVE", "EXEMPT", "FOR_SALE", "MOVED_OUT"] as const;

type ResidentsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; perPage?: string }>;
};

const PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PER_PAGE = 10;

export default async function ResidentsPage({ searchParams }: ResidentsPageProps) {
  await requireDashboardUser();

  const t = await getDictionary();

  function statusLabel(status: string) {
    if (status === "FOR_SALE") return t.residents.forSale;
    if (status === "MOVED_OUT") return t.residents.movedOut;
    if (status === "EXEMPT")   return t.residents.exempt;
    return t.residents.active;
  }

  function statusStyle(status: string) {
    if (status === "ACTIVE")    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (status === "EXEMPT")    return "bg-sky-50 text-sky-700 ring-sky-100";
    if (status === "FOR_SALE")  return "bg-amber-50 text-amber-700 ring-amber-100";
    if (status === "MOVED_OUT") return "bg-slate-100 text-slate-500 ring-slate-200";
    return "bg-slate-50 text-slate-600 ring-slate-100";
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedStatus = statuses.includes(params.status as (typeof statuses)[number]) ? params.status : "";
  const perPage = PER_PAGE_OPTIONS.includes(parseInt(params.perPage ?? "", 10))
    ? parseInt(params.perPage!, 10)
    : DEFAULT_PER_PAGE;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const skip = (page - 1) * perPage;

  const whereClause = {
    ...(selectedStatus ? { status: selectedStatus as (typeof statuses)[number] } : {}),
    ...(query ? {
      OR: [
        { unitNumber:   { contains: query } },
        { name:         { contains: query } },
        { phone:        { contains: query } },
        { streetBlock:  { contains: query } },
        { addressLine1: { contains: query } },
      ],
    } : {}),
  };

  const [allMatchingResidents, counts] = await Promise.all([
    prisma.resident.findMany({
      where: whereClause,
      include: { _count: { select: { payments: true, coverages: true } } },
    }),
    prisma.resident.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  // Numeric-aware sort: "2" < "10" < "20" instead of lexicographic "10" < "2" < "20"
  allMatchingResidents.sort((a, b) => {
    const na = parseInt(a.unitNumber, 10);
    const nb = parseInt(b.unitNumber, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.unitNumber.localeCompare(b.unitNumber);
  });

  const totalCount = allMatchingResidents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(page, totalPages);
  const residents = allMatchingResidents.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalResidents = counts.reduce((sum, c) => sum + c._count.status, 0);
  const activeResidents = counts.find((c) => c.status === "ACTIVE")?._count.status ?? 0;
  const exemptResidents = counts.find((c) => c.status === "EXEMPT")?._count.status ?? 0;
  const inactiveResidents = totalResidents - activeResidents - exemptResidents;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Resident Management</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.residents.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{t.residents.inventory}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.residents.title}</h1>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
              <span>{totalResidents} total</span>
              <span className="text-emerald-700">● {activeResidents} active</span>
              {exemptResidents > 0 && <span className="text-sky-700">● {exemptResidents} exempt</span>}
              {inactiveResidents > 0 && <span className="text-slate-400">● {inactiveResidents} inactive</span>}
            </p>
          </div>
          <Link className="ui-button-primary shrink-0" href="/residents/new">
            <Plus aria-hidden="true" size={16} />
            {t.residents.addResident}
          </Link>
        </div>

        {/* Table card */}
        <section className="ui-card overflow-hidden">
          {/* Filter bar */}
          <form className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center" method="get">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-500">
              <Search aria-hidden="true" className="shrink-0 text-slate-400" size={16} />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                defaultValue={query}
                name="q"
                placeholder={t.residents.searchPlaceholder}
              />
            </div>
            <div className="sm:w-48">
              <SearchableSelect
                name="status"
                defaultValue={selectedStatus}
                options={[
                  { value: "", label: t.residents.allStatuses },
                  ...statuses.map((s) => ({ value: s, label: statusLabel(s) })),
                ]}
              />
            </div>
            <button className="ui-button-primary shrink-0" type="submit">
              {t.common.apply}
            </button>
            {(query || selectedStatus) && (
              <Link className="shrink-0 text-sm text-slate-500 hover:text-slate-700" href="/residents">
                Clear
              </Link>
            )}
          </form>

          {/* Showing summary */}
          {(query || selectedStatus) && (
            <p className="border-b border-slate-100 px-5 py-2 text-xs text-slate-500">
              {totalCount} result{totalCount !== 1 ? "s" : ""}
              {query && <> for &ldquo;{query}&rdquo;</>}
              {selectedStatus && <> · {statusLabel(selectedStatus)}</>}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t.residents.unit}</th>
                  <th className="px-5 py-3 font-semibold">{t.residents.residentName}</th>
                  <th className="px-5 py-3 font-semibold">{t.residents.block}</th>
                  <th className="px-5 py-3 font-semibold">{t.common.status}</th>
                  <th className="px-5 py-3 font-semibold">{t.residents.records}</th>
                  <th className="px-5 py-3 font-semibold">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {residents.length > 0 ? (
                  residents.map((resident) => (
                    <tr className="transition hover:bg-cyan-50/40" key={resident.id}>
                      <td className="px-5 py-3 font-semibold text-slate-950">{resident.unitNumber}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-950">{resident.name}</p>
                        {resident.phone && <p className="mt-0.5 text-xs text-slate-500">{resident.phone}</p>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{resident.streetBlock ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle(resident.status)}`}>
                          {statusLabel(resident.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        <span className="text-xs">{resident._count.payments}pay · {resident._count.coverages}mo</span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          className="font-semibold text-cyan-700 hover:text-cyan-900"
                          href={`/residents/${resident.id}`}
                        >
                          {t.common.view}
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                      {t.residents.noMatch}
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
            pageLink={(p) => {
              const sp = new URLSearchParams({ q: query, status: selectedStatus ?? "", page: String(p), perPage: String(perPage) });
              return `/residents?${sp}`;
            }}
          />
        </section>
      </div>
    </main>
  );
}
