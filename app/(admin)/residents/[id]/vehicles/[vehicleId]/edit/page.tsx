import { notFound } from "next/navigation";

import { AdminPage } from "@/app/components/page-header";
import { requireDashboardEditor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../../vehicle-form";
import { HouseHeader } from "../../vehicle-list-view";

type EditVehiclePageProps = {
  params: Promise<{ id: string; vehicleId: string }>;
};

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  await requireDashboardEditor();
  const { id: residentId, vehicleId } = await params;

  const [vehicle, resident] = await Promise.all([
    prisma.residentVehicle.findUnique({
      where: { id: vehicleId },
    }),
    prisma.resident.findUnique({
      where: { id: residentId },
      select: { name: true, unitNumber: true },
    }),
  ]);

  if (!vehicle || !resident) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <HouseHeader
        unitNumber={resident.unitNumber}
        title="Edit vehicle"
        subtitle={resident.name}
        back={{ href: `/residents/${residentId}/vehicles`, label: "Back to vehicles" }}
      />
      <VehicleForm residentId={residentId} vehicle={vehicle} owner={`${resident.name} · Resident`} />
    </AdminPage>
  );
}
