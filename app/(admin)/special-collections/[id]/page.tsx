import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Search } from "lucide-react";
import { TablePagination } from "@/app/components/table-pagination";
import { AdminPage, PageHeader } from "@/app/components/page-header";

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

function statusChip(status: string) {
  if (status === "ACTIVE") return "bg-[#e2f7e1] text-[#1c7a33]";
  return "bg-[#eef0f4] text-[#5d6779]";
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
    <AdminPage>
      <PageHeader
        title={collection.title}
        subtitle={collection.description || undefined}
        back={{ href: "/special-collections", label: "Special Collections" }}
        actions={
          <Link className="ui-button-primary" href={`/special-collections/${id}/edit`}>
            <Edit aria-hidden="true" size={15} />
            Edit
          </Link>
        }
      />

      {/* Progress card */}
      <section className="ui-card grid gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-2)]">
          <span className={`ui-chip ${statusChip(collection.status)}`}>{statusLabel(collection.status)}</span>
          {collection.dueDate && <span>Due {collection.dueDate.toLocaleDateString("en-MY")}</span>}
        </div>
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--ink-2)]">Collected</p>
              <p className="font-heading text-3xl font-bold tracking-tight tabular-nums text-[var(--ink)]">{formatRM(totalPaid)}</p>
            </div>
            <p className="font-heading text-lg font-bold tabular-nums text-[var(--ink)]">{progressPct}%</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
            <div className="h-full rounded-full bg-[var(--leaf)]" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-[var(--paper)] p-3">
            <p className="text-xs text-[var(--ink-2)]">Per household</p>
            <p className="mt-1 font-semibold tabular-nums text-[var(--ink)]">{formatRM(collection.amountPerResident)}</p>
          </div>
          <div className="rounded-2xl bg-[var(--paper)] p-3">
            <p className="text-xs text-[var(--ink-2)]">Assigned</p>
            <p className="mt-1 font-semibold tabular-nums text-[var(--ink)]">{allAssignments.length} households</p>
          </div>
          <div className="rounded-2xl bg-[#e2f7e1] p-3">
            <p className="text-xs text-[#1c7a33]">Paid</p>
            <p className="mt-1 font-semibold tabular-nums text-[#1c7a33]">{paidCount} households</p>
          </div>
          <div className={`rounded-2xl p-3 ${outstanding > 0 ? "bg-[#fff4d6] text-[#8a6300]" : "bg-[var(--paper)] text-[var(--ink)]"}`}>
            <p className={`text-xs ${outstanding > 0 ? "" : "text-[var(--ink-2)]"}`}>Outstanding</p>
            <p className="mt-1 font-semibold tabular-nums">{formatRM(outstanding)}</p>
          </div>
        </div>
      </section>

      {/* Assignment table */}
      <section className="ui-card overflow-hidden">
        <div className="ui-toolbar justify-between">
          <h2 className="ui-section-title">
            Household assignments
            <span className="ml-2 font-sans text-sm font-normal text-[var(--ink-2)]">{allAssignments.length} total</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" action={`/special-collections/${id}`} className="ui-search">
              <input type="hidden" name="perPage" value={perPage} />
              <input type="hidden" name="filter" value={filter} />
              <input type="hidden" name="page" value="1" />
              <Search aria-hidden="true" size={16} className="text-[var(--ink-2)]" />
              <input name="search" defaultValue={search} placeholder="Search unit or name..." aria-label="Search unit or name" />
            </form>
            <div className="flex items-center gap-1 rounded-full bg-[var(--paper)] p-1">
              {(["all", "paid", "outstanding"] as const).map((f) => (
                <Link
                  key={f}
                  href={filterLink(f)}
                  className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                    filter === f
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  {f === "all" ? "All" : f === "paid" ? "Paid" : "Outstanding"}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="ui-table min-w-160">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Resident</th>
                <th className="text-right">Due</th>
                <th className="text-right">Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length > 0 ? (
                assignments.map((assignment) => {
                  const bal = assignment.amountDue - assignment.amountPaid;
                  const isPaid = bal <= 0;
                  return (
                    <tr key={assignment.id}>
                      <td className="font-semibold text-[var(--ink)]">{assignment.resident.unitNumber}</td>
                      <td className="text-[var(--ink)]">{assignment.resident.name}</td>
                      <td className="text-right tabular-nums text-[var(--ink-2)]">{formatRM(assignment.amountDue)}</td>
                      <td className="text-right font-semibold tabular-nums text-[var(--ink)]">{formatRM(assignment.amountPaid)}</td>
                      <td>
                        {isPaid ? (
                          <span className="ui-chip bg-[#e2f7e1] text-[#1c7a33]">Paid</span>
                        ) : (
                          <span className="ui-chip bg-[#fff4d6] text-[#8a6300] tabular-nums">{formatRM(bal)} left</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="ui-empty">
                      {search ? `No results for "${search}"` : "No households match this filter."}
                    </div>
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
              <p className="text-xs text-[var(--ink-2)]">Event start date</p>
              <p className="mt-1 font-semibold text-[var(--ink)]">{collection.eventStartDate.toLocaleDateString("en-MY")}</p>
            </div>
          )}
          {collection.eventEndDate && (
            <div className="ui-card p-4">
              <p className="text-xs text-[var(--ink-2)]">Event end date</p>
              <p className="mt-1 font-semibold text-[var(--ink)]">{collection.eventEndDate.toLocaleDateString("en-MY")}</p>
            </div>
          )}
        </div>
      )}
    </AdminPage>
  );
}
