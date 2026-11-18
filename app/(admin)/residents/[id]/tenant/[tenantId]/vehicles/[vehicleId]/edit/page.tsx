import { notFound } from "next/navigation";

import { HouseHeader } from "@/app/(admin)/residents/[id]/vehicles/vehicle-list-view";
import { AdminPage } from "@/app/components/page-header";
import { requireDashboardEditor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../../vehicle-form";

type EditTenantVehiclePageProps = {
  params: Promise<{ id: string; tenantId: string; vehicleId: string }>;
};

export default async function EditTenantVehiclePage({ params }: EditTenantVehiclePageProps) {
  await requireDashboardEditor();
  const { id: residentId, tenantId, vehicleId } = await params;

  const [tenant, resident] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    }),
    prisma.resident.findUnique({
      where: { id: residentId },
      select: { unitNumber: true, name: true },
    }),
  ]);

  if (!tenant || !resident) {
    notFound();
  }

  const vehicle = await prisma.tenantVehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <HouseHeader
        unitNumber={resident.unitNumber}
        title="Edit vehicle"
        subtitle={`${tenant.name} · tenant of ${resident.name}`}
        back={{ href: `/residents/${residentId}/tenant/${tenantId}/vehicles`, label: "Back to vehicles" }}
      />
      <VehicleForm residentId={residentId} tenantId={tenantId} vehicle={vehicle} owner={`${tenant.name} · Tenant`} />
    </AdminPage>
  );
}
