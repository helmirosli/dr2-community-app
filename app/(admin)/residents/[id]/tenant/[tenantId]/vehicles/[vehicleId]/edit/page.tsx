import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../../vehicle-form";

type EditTenantVehiclePageProps = {
  params: Promise<{ id: string; tenantId: string; vehicleId: string }>;
};

export default async function EditTenantVehiclePage({ params }: EditTenantVehiclePageProps) {
  await requireDashboardUser();
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
      <PageHeader
        title="Edit vehicle"
        subtitle={`${tenant.name} — unit ${resident.unitNumber}`}
        back={{ href: `/residents/${residentId}/tenant/${tenantId}/vehicles`, label: "Back to vehicles" }}
      />
      <VehicleForm tenantId={tenantId} vehicle={vehicle} />
    </AdminPage>
  );
}
