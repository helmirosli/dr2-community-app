import Link from "next/link";
import { Home, Plus, Search } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = ["ACTIVE", "INACTIVE", "MOVED_OUT"] as const;

type ResidentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

function statusLabel(status: string) {
  return status === "MOVED_OUT" ? "Moved out" : status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function ResidentsPage({ searchParams }: ResidentsPageProps) {
  await requireDashboardUser();

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedStatus = statuses.includes(params.status as (typeof statuses)[number]) ? params.status : "";

  const residents = await prisma.resident.findMany({
    where: {
      ...(selectedStatus ? { status: selectedStatus as (typeof statuses)[number] } : {}),
      ...(query
        ? {
            OR: [
              { unitNumber: { contains: query } },
              { name: { contains: query } },
              { phone: { contains: query } },
              { streetBlock: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { unitNumber: "asc" }],
    include: {
      _count: {
        select: {
          payments: true,
          coverages: true,
        },
      },
    },
  });

  const counts = await prisma.resident.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const totalResidents = counts.reduce((sum, item) => sum + item._count.status, 0);
  const activeResidents = counts.find((item) => item.status === "ACTIVE")?._count.status ?? 0;

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Resident inventory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Household records</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Manage unit numbers, resident contacts, status, and payment history for DR2 households.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href="/dashboard">
              <Home aria-hidden="true" size={17} />
              Dashboard
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700" href="/residents/new">
              <Plus aria-hidden="true" size={17} />
              Add resident
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total residents</p>
            <p className="mt-2 text-3xl font-semibold">{totalResidents}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Active households</p>
            <p className="mt-2 text-3xl font-semibold">{activeResidents}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Filtered result</p>
            <p className="mt-2 text-3xl font-semibold">{residents.length}</p>
          </div>
        </section>

        <section className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
          <form className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-end" method="get">
            <label className="grid flex-1 gap-2 text-sm font-medium text-slate-700">
              Search
              <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                <Search aria-hidden="true" className="text-slate-400" size={16} />
                <input className="w-full bg-transparent outline-none" defaultValue={query} name="q" placeholder="Unit, name, phone, or block" />
              </div>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700 md:w-56">
              Status
              <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue={selectedStatus} name="status">
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>

            <button className="min-h-10 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" type="submit">
              Apply
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 font-semibold">Resident</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Block</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Records</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
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
                        {resident._count.payments} payments / {resident._count.coverages} months
                      </td>
                      <td className="px-5 py-4">
                        <Link className="font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${resident.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                      No resident records match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}