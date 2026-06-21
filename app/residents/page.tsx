import Link from "next/link";
import { Home, Plus, Search } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = ["ACTIVE", "EXEMPT", "FOR_SALE", "MOVED_OUT"] as const;

type ResidentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 20;

export default async function ResidentsPage({ searchParams }: ResidentsPageProps) {
  await requireDashboardUser();

  const t = await getDictionary();

  function statusLabel(status: string) {
    if (status === "FOR_SALE") return t.residents.forSale;
    if (status === "MOVED_OUT") return t.residents.movedOut;
    if (status === "EXEMPT") return t.residents.exempt;
    return t.residents.active;
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedStatus = statuses.includes(params.status as (typeof statuses)[number]) ? params.status : "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const whereClause = {
    ...(selectedStatus ? { status: selectedStatus as (typeof statuses)[number] } : {}),
    ...(query
      ? {
          OR: [
            { unitNumber: { contains: query } },
            { name: { contains: query } },
            { phone: { contains: query } },
            { streetBlock: { contains: query } },
            { addressLine1: { contains: query } },
          ],
        }
      : {}),
  };

  const [residents, totalCount] = await Promise.all([
    prisma.resident.findMany({
      where: whereClause,
      orderBy: [{ status: "asc" }, { unitNumber: "asc" }],
      skip,
      take: ITEMS_PER_PAGE,
      include: {
        _count: {
          select: {
            payments: true,
            coverages: true,
          },
        },
      },
    }),
    prisma.resident.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const counts = await prisma.resident.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const totalResidents = counts.reduce((sum, item) => sum + item._count.status, 0);
  const activeResidents = counts.find((item) => item.status === "ACTIVE")?._count.status ?? 0;

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">{t.residents.inventory}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.residents.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t.residents.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700" href="/residents/new">
              <Plus aria-hidden="true" size={17} />
              {t.residents.addResident}
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t.residents.totalResidents}</p>
            <p className="mt-2 text-3xl font-semibold">{totalResidents}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t.residents.activeHouseholds}</p>
            <p className="mt-2 text-3xl font-semibold">{activeResidents}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t.residents.filteredResult}</p>
            <p className="mt-2 text-3xl font-semibold">{residents.length}</p>
          </div>
        </section>

        <section className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
          <form className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-end" method="get">
            <label className="grid flex-1 gap-2 text-sm font-medium text-slate-700">
              {t.common.search}
              <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                <Search aria-hidden="true" className="text-slate-400" size={16} />
                <input className="w-full bg-transparent outline-none" defaultValue={query} name="q" placeholder={t.residents.searchPlaceholder} />
              </div>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700 md:w-56">
              {t.common.status}
              <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue={selectedStatus} name="status">
                <option value="">{t.residents.allStatuses}</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>

            <button className="min-h-10 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" type="submit">
              {t.common.apply}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t.residents.unit}</th>
                  <th className="px-5 py-3 font-semibold">{t.residents.residentName}</th>
                  <th className="px-5 py-3 font-semibold">{t.residents.contact}</th>
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
                      <td className="px-5 py-4 font-semibold text-slate-950">{resident.unitNumber}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-950">{resident.name}</p>
                        {resident.notes ? <p className="mt-1 line-clamp-1 text-slate-500">{resident.notes}</p> : null}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{resident.phone ?? "-"}</p>
                        <p className="mt-1 text-slate-500">{resident.email ?? ""}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{resident.streetBlock ?? "-"}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-100">
                          {statusLabel(resident.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {resident._count.payments} {t.residents.payments} / {resident._count.coverages} {t.residents.months}
                      </td>
                      <td className="px-5 py-4">
                        <Link className="font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${resident.id}`}>
                          {t.common.view}
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                      {t.residents.noMatch}
                    </td>
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
                <span className="font-semibold">{totalCount}</span> residents
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={`/residents?q=${query}&status=${selectedStatus}&page=${page - 1}`}
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
                        href={`/residents?q=${query}&status=${selectedStatus}&page=${pageNum}`}
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
                    href={`/residents?q=${query}&status=${selectedStatus}&page=${page + 1}`}
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
