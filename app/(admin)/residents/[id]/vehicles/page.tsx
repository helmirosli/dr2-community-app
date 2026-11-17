import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteVehicleForm } from "./delete-form";
import { VehicleListView } from "./vehicle-list-view";

type ResidentVehicleListPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResidentVehicleListPage({ params }: ResidentVehicleListPageProps) {
  await requireDashboardUser();
  const { id: residentId } = await params;

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      vehicles: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!resident) {
    notFound();
  }

  return (
    <VehicleListView
      unitNumber={resident.unitNumber}
      owner={resident.name}
      ownerRole="Resident"
      back={{ href: `/residents/${residentId}`, label: `Back to house ${resident.unitNumber}` }}
      basePath={`/residents/${residentId}/vehicles`}
      vehicles={resident.vehicles}
      renderDelete={(v) => <DeleteVehicleForm vehicleId={v.id} plate={v.plateNumber} />}
    />
  );
}
