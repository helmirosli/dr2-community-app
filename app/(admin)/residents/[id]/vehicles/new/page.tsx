import { notFound } from "next/navigation";

import { AdminPage } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../vehicle-form";
import { HouseHeader } from "../vehicle-list-view";

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
      <HouseHeader
        unitNumber={resident.unitNumber}
        title="Add vehicle"
        subtitle={resident.name}
        back={{ href: `/residents/${residentId}/vehicles`, label: "Back to vehicles" }}
      />
      <VehicleForm residentId={residentId} owner={`${resident.name} · Resident`} />
    </AdminPage>
  );
}
