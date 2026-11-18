import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

import { requireDashboardEditor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TenantForm } from "../tenant-form";

type NewTenantPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewTenantPage({ params }: NewTenantPageProps) {
  await requireDashboardEditor();
  const { id: residentId } = await params;

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { id: true, name: true, unitNumber: true },
  });

  if (!resident) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <PageHeader
        title="Add tenant"
        subtitle={`Unit ${resident.unitNumber} — ${resident.name}`}
        back={{ href: `/residents/${residentId}/tenants`, label: "Back to tenants" }}
      />
      <TenantForm residentId={residentId} />
    </AdminPage>
  );
}
