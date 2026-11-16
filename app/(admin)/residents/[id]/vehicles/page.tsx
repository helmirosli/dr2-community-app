import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Edit } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteVehicleForm } from "./delete-form";

type ResidentVehicleListPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResidentVehicleListPage({ params }: ResidentVehicleListPageProps) {
  await requireDashboardUser();
  const { id: residentId } = await params;

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      vehicles: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!resident) {
    notFound();
  }

  return (
    <AdminPage>
      <PageHeader
        title="Vehicles"
        subtitle={`${resident.vehicles.length} vehicle${resident.vehicles.length !== 1 ? "s" : ""} for ${resident.name}`}
        back={{ href: `/residents/${residentId}`, label: `Back to ${resident.unitNumber}` }}
        actions={
          <Link className="ui-button-primary" href={`/residents/${residentId}/vehicles/new`}>
            <Plus aria-hidden="true" size={16} />
            Add vehicle
          </Link>
        }
      />

      <section className="ui-card overflow-hidden">
        {resident.vehicles.length === 0 ? (
          <div className="ui-empty">No vehicles recorded for this resident.</div>
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
                {resident.vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="font-medium text-[var(--ink)]">{vehicle.make}</td>
                    <td className="text-[var(--ink-2)]">{vehicle.model ?? "-"}</td>
                    <td className="font-semibold tabular-nums whitespace-nowrap text-[var(--ink)]">{vehicle.plateNumber}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          aria-label="Edit"
                          className="grid size-10 place-items-center rounded-full text-[var(--blue)] transition hover:bg-black/5"
                          href={`/residents/${residentId}/vehicles/${vehicle.id}/edit`}
                        >
                          <Edit size={16} />
                        </Link>
                        <DeleteVehicleForm vehicleId={vehicle.id} />
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
