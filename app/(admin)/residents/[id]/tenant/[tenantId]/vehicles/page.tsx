import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Edit } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";
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
    <AdminPage>
      <PageHeader
        title="Vehicles"
        subtitle={`${tenant.vehicles.length} vehicle${tenant.vehicles.length !== 1 ? "s" : ""} for ${tenant.name}`}
        back={{ href: `/residents/${residentId}/tenants`, label: "Back to tenants" }}
        actions={
          <Link className="ui-button-primary" href={`/residents/${residentId}/tenant/${tenantId}/vehicles/new`}>
            <Plus aria-hidden="true" size={16} />
            Add vehicle
          </Link>
        }
      />

      <section className="ui-card overflow-hidden">
        {tenant.vehicles.length === 0 ? (
          <div className="ui-empty">No vehicles recorded for this tenant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table min-w-120">
              <thead>
                <tr>
                  <th>Make</th>
                  <th>Model</th>
                  <th>Plate Number</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenant.vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="font-medium text-[var(--ink)]">{vehicle.make}</td>
                    <td className="text-[var(--ink-2)]">{vehicle.model ?? "-"}</td>
                    <td className="font-semibold tabular-nums whitespace-nowrap text-[var(--ink)]">{vehicle.plateNumber}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          aria-label="Edit"
                          className="grid size-10 place-items-center rounded-full text-[var(--blue)] transition hover:bg-black/5"
                          href={`/residents/${residentId}/tenant/${tenantId}/vehicles/${vehicle.id}/edit`}
                        >
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
      </section>
    </AdminPage>
  );
}
