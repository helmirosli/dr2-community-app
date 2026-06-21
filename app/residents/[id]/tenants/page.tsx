import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Edit, Trash2 } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteTenant } from "@/lib/actions/tenants";

type TenantListPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function TenantListPage({ params, searchParams }: TenantListPageProps) {
  await requireDashboardUser();
  const { id: residentId } = await params;
  const params2 = await searchParams;
  const query = params2.q?.trim() ?? "";

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      tenants: {
        orderBy: { name: "asc" },
        where: query ? { name: { contains: query } } : undefined,
      },
    },
  });

  if (!resident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}`}>
              Back to {resident.unitNumber}
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tenants</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {resident.tenants.length} tenant{resident.tenants.length !== 1 ? "s" : ""} for {resident.name}
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" href={`/residents/${residentId}/tenants/new`}>
            <Plus aria-hidden="true" size={17} />
            Add tenant
          </Link>
        </header>

        {resident.tenants.length === 0 ? (
          <p className="mt-8 rounded-lg border border-cyan-950/10 bg-white p-8 text-center text-sm text-slate-500">
            No tenants recorded for this resident.
          </p>
        ) : (
          <div className="mt-6 rounded-lg border border-cyan-950/10 bg-white shadow-sm">
            <form className="border-b border-slate-100 p-5" method="get">
              <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                <input className="w-full bg-transparent outline-none" defaultValue={query} name="q" placeholder="Search tenant name..." />
              </div>
            </form>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resident.tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{tenant.name}</td>
                    <td className="px-5 py-4 text-slate-600">{tenant.phone ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{tenant.email ?? "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/tenants/${tenant.id}/edit`}>
                          <Edit size={16} />
                        </Link>
                        <form action={async () => {
                          await deleteTenant(tenant.id);
                        }}>
                          <button type="submit" className="text-sm font-semibold text-red-700 hover:text-red-900" title="Delete tenant">
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
