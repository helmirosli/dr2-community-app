import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../vehicle-form";

type NewTenantVehiclePageProps = {
  params: Promise<{ id: string; tenantId: string }>;
};

export default async function NewTenantVehiclePage({ params }: NewTenantVehiclePageProps) {
  await requireDashboardUser();
  const { id: residentId, tenantId } = await params;

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

  return (
    <AdminPage width="narrow">
      <PageHeader
        title="Add vehicle"
        subtitle={`${tenant.name} — unit ${resident.unitNumber}`}
        back={{ href: `/residents/${residentId}/tenant/${tenantId}/vehicles`, label: "Back to vehicles" }}
      />
      <VehicleForm tenantId={tenantId} />
    </AdminPage>
  );
}
