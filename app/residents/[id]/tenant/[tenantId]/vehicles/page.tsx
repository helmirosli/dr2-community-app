import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Edit, Trash2 } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteTenantVehicleForm } from "./delete-tenant-vehicle-form";

type TenantVehicleListPageProps = {
  params: Promise<{ id: string; tenantId: string }>;
};

export default async function TenantVehicleListPage({ params }: TenantVehicleListPageProps) {
  await requireDashboardUser();
  const { id: residentId, tenantId } = await params;

  const [tenant, resident] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        vehicles: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.resident.findUnique({
      where: { id: residentId },
      select: { unitNumber: true, name: true },
    }),
  ]);

  if (!tenant || !resident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/tenant`}>
              Back to tenants
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Vehicles</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tenant.vehicles.length} vehicle{tenant.vehicles.length !== 1 ? "s" : ""} for {tenant.name}
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" href={`/residents/${residentId}/tenant/${tenantId}/vehicles/new`}>
            <Plus aria-hidden="true" size={17} />
            Add vehicle
          </Link>
        </header>

        {tenant.vehicles.length === 0 ? (
          <p className="mt-8 rounded-lg border border-cyan-950/10 bg-white p-8 text-center text-sm text-slate-500">
            No vehicles recorded for this tenant.
          </p>
        ) : (
          <div className="mt-6 rounded-lg border border-cyan-950/10 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Make</th>
                  <th className="px-5 py-3 font-semibold">Model</th>
                  <th className="px-5 py-3 font-semibold">Plate Number</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenant.vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{vehicle.make}</td>
                    <td className="px-5 py-4 text-slate-600">{vehicle.model ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{vehicle.plateNumber}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/tenant/${tenantId}/vehicles/${vehicle.id}/edit`}>
                          <Edit size={16} />
                        </Link>
                        <DeleteTenantVehicleForm vehicleId={vehicle.id} />
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
