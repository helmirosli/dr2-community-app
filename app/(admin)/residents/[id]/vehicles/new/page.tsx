import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../vehicle-form";

type NewVehiclePageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewVehiclePage({ params }: NewVehiclePageProps) {
  await requireDashboardUser();
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
        title="Add vehicle"
        subtitle={`Unit ${resident.unitNumber} — ${resident.name}`}
        back={{ href: `/residents/${residentId}/vehicles`, label: "Back to vehicles" }}
      />
      <VehicleForm residentId={residentId} />
    </AdminPage>
  );
}
