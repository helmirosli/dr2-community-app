import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { SearchableSelect } from "@/app/components/searchable-select";
import { TablePagination } from "@/app/components/table-pagination";
import { HouseMap } from "./house-map";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = ["ACTIVE", "EXEMPT", "FOR_SALE", "MOVED_OUT"] as const;

type ResidentsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; perPage?: string; view?: string }>;
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
    if (status === "ACTIVE")    return "bg-[#e2f7e1] text-[#1c7a33]";
    if (status === "EXEMPT")    return "bg-[#ddf5fd] text-[#0b6e8e]";
    if (status === "FOR_SALE")  return "bg-[#fff4d6] text-[#8a6300]";
    return "bg-[#eef0f4] text-[#5d6779]";
  }

  const params = await searchParams;
  const isMap = params.view === "map";
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
    <AdminPage>
        <PageHeader
          title={t.residents.title}
          subtitle={
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <span>{totalResidents} total</span>
              <span className="text-[#1c7a33]">● {activeResidents} active</span>
              {exemptResidents > 0 && <span className="text-[#0b6e8e]">● {exemptResidents} exempt</span>}
              {inactiveResidents > 0 && <span className="text-[#5d6779]">● {inactiveResidents} inactive</span>}
            </span>
          }
          actions={
            <>
              {/* Peta / Senarai toggle (spec §5.8) */}
              <div className="grid grid-cols-2 rounded-full bg-black/5 p-1 text-sm font-semibold" role="group">
                <Link href="/residents?view=map" aria-current={isMap ? "page" : undefined} className={`grid min-h-9 place-items-center rounded-full px-4 ${isMap ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)]"}`}>
                  {t.today.map}
                </Link>
                <Link href="/residents" aria-current={!isMap ? "page" : undefined} className={`grid min-h-9 place-items-center rounded-full px-4 ${!isMap ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-2)]"}`}>
                  {t.today.list}
                </Link>
              </div>
              <Link className="ui-button-primary" href="/residents/new">
                <Plus aria-hidden="true" size={16} />
                {t.residents.addResident}
              </Link>
            </>
          }
        />

        {isMap ? <HouseMap t={t} /> : (
        /* Table card */
        <section className="ui-card overflow-hidden">
          {/* Filter bar */}
          <form className="ui-toolbar" method="get">
            <label className="ui-search">
              <Search aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-2)]" />
              <input
                defaultValue={query}
                name="q"
                placeholder={t.residents.searchPlaceholder}
              />
            </label>
            <div className="w-full sm:w-48">
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
              <Link className="shrink-0 text-sm font-medium text-[var(--blue)] hover:underline" href="/residents">
                Clear
              </Link>
            )}
          </form>

          {/* Showing summary */}
          {(query || selectedStatus) && (
            <p className="border-b border-black/5 px-5 py-2 text-xs text-[var(--ink-2)]">
              {totalCount} result{totalCount !== 1 ? "s" : ""}
              {query && <> for &ldquo;{query}&rdquo;</>}
              {selectedStatus && <> · {statusLabel(selectedStatus)}</>}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="ui-table min-w-180">
              <thead>
                <tr>
                  <th>{t.residents.unit}</th>
                  <th>{t.residents.residentName}</th>
                  <th>{t.residents.block}</th>
                  <th>{t.common.status}</th>
                  <th>{t.residents.records}</th>
                  <th>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {residents.length > 0 ? (
                  residents.map((resident) => (
                    <tr key={resident.id}>
                      <td className="font-heading font-bold tabular-nums text-[var(--ink)]">{resident.unitNumber}</td>
                      <td>
                        <p className="font-medium text-[var(--ink)]">{resident.name}</p>
                        {resident.phone && <p className="mt-0.5 text-xs text-[var(--ink-2)]">{resident.phone}</p>}
                      </td>
                      <td className="text-[var(--ink-2)]">{resident.streetBlock ?? "—"}</td>
                      <td>
                        <span className={`ui-chip ${statusStyle(resident.status)}`}>
                          {statusLabel(resident.status)}
                        </span>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        <span className="text-xs tabular-nums">{resident._count.payments}pay · {resident._count.coverages}mo</span>
                      </td>
                      <td>
                        <Link
                          className="inline-flex min-h-10 items-center font-semibold text-[var(--blue)] hover:underline"
                          href={`/residents/${resident.id}`}
                        >
                          {t.common.view}
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="ui-empty">{t.residents.noMatch}</div>
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
        )}
    </AdminPage>
  );
}
