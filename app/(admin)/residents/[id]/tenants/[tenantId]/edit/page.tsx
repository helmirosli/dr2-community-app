import { notFound } from "next/navigation";

import { HouseHeader } from "@/app/(admin)/residents/[id]/vehicles/vehicle-list-view";
import { AdminPage } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TenantForm } from "../../tenant-form";

type EditTenantPageProps = {
  params: Promise<{ id: string; tenantId: string }>;
};

export default async function EditTenantPage({ params }: EditTenantPageProps) {
  await requireDashboardUser();
  const { id: residentId, tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      vehicles: {
        select: {
          id: true,
          make: true,
          model: true,
          plateNumber: true,
        },
      },
      resident: { select: { name: true, unitNumber: true } },
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <HouseHeader
        unitNumber={tenant.resident.unitNumber}
        title="Edit tenant"
        subtitle={`${tenant.name} · ${tenant.resident.name}`}
        back={{ href: `/residents/${residentId}/tenants`, label: "Back to tenants" }}
      />
      <TenantForm residentId={residentId} tenant={tenant} />
    </AdminPage>
  );
}
