import { notFound } from "next/navigation";

import { VehicleListView } from "@/app/(admin)/residents/[id]/vehicles/vehicle-list-view";
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
    <VehicleListView
      unitNumber={resident.unitNumber}
      owner={tenant.name}
      ownerRole="Tenant"
      back={{ href: `/residents/${residentId}/tenants`, label: "Back to tenants" }}
      basePath={`/residents/${residentId}/tenant/${tenantId}/vehicles`}
      vehicles={tenant.vehicles}
      renderDelete={(v) => <DeleteTenantVehicleForm vehicleId={v.id} plate={v.plateNumber} />}
    />
  );
}
