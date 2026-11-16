import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

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
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <PageHeader title="Edit tenant" back={{ href: `/residents/${residentId}/tenants`, label: "Back to tenants" }} />
      <TenantForm residentId={residentId} tenant={tenant} />
    </AdminPage>
  );
}
