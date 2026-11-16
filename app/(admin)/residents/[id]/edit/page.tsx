import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResidentForm } from "../../resident-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditResidentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditResidentPage({ params }: EditResidentPageProps) {
  await requireDashboardUser();

  const { id } = await params;
  const resident = await prisma.resident.findUnique({
    where: { id },
  });

  if (!resident) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <PageHeader
        title={`Edit ${resident.unitNumber}`}
        subtitle="Update household contact details, block, status, and notes."
        back={{ href: `/residents/${resident.id}`, label: "Back to resident" }}
      />
      <ResidentForm resident={resident} />
    </AdminPage>
  );
}