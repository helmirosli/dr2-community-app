import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Edit } from "lucide-react";
import { TablePagination } from "@/app/components/table-pagination";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

type DetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; perPage?: string; filter?: string; search?: string }>;
};

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Active";
  if (status === "CLOSED") return "Closed";
  return "Draft";
}

function statusDot(status: string) {
  if (status === "ACTIVE") return "bg-emerald-500";
  if (status === "CLOSED") return "bg-slate-400";
  return "bg-slate-400";
}

export default async function SpecialCollectionDetailPage({ params, searchParams }: DetailPageProps) {
  await requireDashboardUser();

  const { id } = await params;
  const { page: pageParam, perPage: perPageParam, filter = "all", search = "" } = await searchParams;

  const perPage = PAGE_SIZE_OPTIONS.includes(parseInt(perPageParam ?? "", 10))
    ? parseInt(perPageParam!, 10)
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));

  const [collection, allAssignments] = await Promise.all([
    prisma.specialCollection.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        amountPerResident: true,
        dueDate: true,
        eventStartDate: true,
        eventEndDate: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.specialCollectionAssignment.findMany({
      where: { specialCollectionId: id },
      select: {
        id: true,
        resident: { select: { id: true, unitNumber: true, name: true } },
        amountDue: true,
        amountPaid: true,
        status: true,
      },
    }),
  ]);

  if (!collection) notFound();

  // Numeric sort by unit number
  allAssignments.sort((a, b) => {
    const ua = parseInt(a.resident.unitNumber, 10);
    const ub = parseInt(b.resident.unitNumber, 10);
    if (!isNaN(ua) && !isNaN(ub)) return ua - ub;
    return a.resident.unitNumber.localeCompare(b.resident.unitNumber);
  });

  const totalDue  = allAssignments.reduce((sum, a) => sum + a.amountDue,  0);
  const totalPaid = allAssignments.reduce((sum, a) => sum + a.amountPaid, 0);
  const outstanding = totalDue - totalPaid;
  const paidCount = allAssignments.filter((a) => a.amountPaid >= a.amountDue).length;
  const progressPct = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

  // Apply filter + search
  const searchLower = search.trim().toLowerCase();
  const filtered = allAssignments.filter((a) => {
    const matchesSearch = !searchLower
      || a.resident.unitNumber.toLowerCase().includes(searchLower)
      || a.resident.name.toLowerCase().includes(searchLower);
    const isPaid = a.amountPaid >= a.amountDue;
    const matchesFilter =
      filter === "paid"        ? isPaid  :
      filter === "outstanding" ? !isPaid :
      true;
    return matchesSearch && matchesFilter;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(page, totalPages);
  const assignments = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  function pageLink(p: number) {
    const sp = new URLSearchParams({ page: String(p), perPage: String(perPage), filter, search });
    return `/special-collections/${id}?${sp}`;
  }
  function filterLink(f: string) {
    const sp = new URLSearchParams({ page: "1", perPage: String(perPage), filter: f, search });
    return `/special-collections/${id}?${sp}`;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/special-collections" className="transition-colors hover:text-slate-700">
            Special Collections
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{collection.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${statusDot(collection.status)}`} />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {statusLabel(collection.status)}
              </span>
              {collection.dueDate && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">
                    Due {collection.dueDate.toLocaleDateString("en-MY")}
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{collection.title}</h1>
            {collection.description && (
              <p className="mt-1 text-sm text-slate-500">{collection.description}</p>
            )}
          </div>
          <Link className="ui-button-primary shrink-0" href={`/special-collections/${id}/edit`}>
            <Edit aria-hidden="true" size={15} />
            Edit
          </Link>
        </div>

        {/* Progress card */}
        <div className="ui-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500">Collected</p>
                  <p className="text-2xl font-bold text-slate-900">{formatRM(totalPaid)}</p>
                </div>
                <p className="text-lg font-bold text-cyan-700">{progressPct}%</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Per household</p>
              <p className="mt-1 font-semibold text-slate-900">{formatRM(collection.amountPerResident)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Assigned</p>
              <p className="mt-1 font-semibold text-slate-900">{allAssignments.length} households</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600">Paid</p>
              <p className="mt-1 font-semibold text-emerald-800">{paidCount} households</p>
            </div>
            <div className={`rounded-lg p-3 ${outstanding > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
              <p className={`text-xs ${outstanding > 0 ? "text-amber-600" : "text-slate-500"}`}>Outstanding</p>
              <p className={`mt-1 font-semibold ${outstanding > 0 ? "text-amber-800" : "text-slate-900"}`}>
                {formatRM(outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Assignment table */}
        <section className="ui-card overflow-hidden">
          {/* Table controls */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Household assignments
              <span className="ml-2 text-sm font-normal text-slate-500">{allAssignments.length} total</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <form method="GET" action={`/special-collections/${id}`} className="flex items-center gap-2">
                <input type="hidden" name="perPage" value={perPage} />
                <input type="hidden" name="filter" value={filter} />
                <input type="hidden" name="page" value="1" />
                <input
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  name="search"
                  defaultValue={search}
                  placeholder="Search unit or name..."
                />
              </form>
              {/* Status filter pills */}
              <div className="flex items-center gap-1">
                {(["all", "paid", "outstanding"] as const).map((f) => (
                  <Link
                    key={f}
                    href={filterLink(f)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      filter === f
                        ? "bg-cyan-700 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f === "all" ? "All" : f === "paid" ? "Paid" : "Outstanding"}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 font-semibold">Resident</th>
                  <th className="px-5 py-3 font-semibold">Due</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.length > 0 ? (
                  assignments.map((assignment) => {
                    const bal = assignment.amountDue - assignment.amountPaid;
                    const isPaid = bal <= 0;
                    return (
                      <tr className="transition hover:bg-cyan-50/40" key={assignment.id}>
                        <td className="px-5 py-3 font-semibold text-slate-900">{assignment.resident.unitNumber}</td>
                        <td className="px-5 py-3 text-slate-700">{assignment.resident.name}</td>
                        <td className="px-5 py-3 text-slate-700">{formatRM(assignment.amountDue)}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{formatRM(assignment.amountPaid)}</td>
                        <td className="px-5 py-3">
                          {isPaid ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                              {formatRM(bal)} left
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={5}>
                      {search ? `No results for "${search}"` : "No households match this filter."}
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
            rangeStart={totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1}
            rangeEnd={Math.min(currentPage * perPage, totalCount)}
            perPageOptions={PAGE_SIZE_OPTIONS}
            pageLink={pageLink}
          />
        </section>

        {/* Dates */}
        {(collection.eventStartDate || collection.eventEndDate) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {collection.eventStartDate && (
              <div className="ui-card p-4">
                <p className="text-xs font-medium text-slate-500">Event start date</p>
                <p className="mt-1 font-semibold text-slate-900">{collection.eventStartDate.toLocaleDateString("en-MY")}</p>
              </div>
            )}
            {collection.eventEndDate && (
              <div className="ui-card p-4">
                <p className="text-xs font-medium text-slate-500">Event end date</p>
                <p className="mt-1 font-semibold text-slate-900">{collection.eventEndDate.toLocaleDateString("en-MY")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
