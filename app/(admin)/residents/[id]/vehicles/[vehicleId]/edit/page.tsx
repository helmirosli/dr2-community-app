import { AdminPage, PageHeader } from "@/app/components/page-header";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../../vehicle-form";

type EditVehiclePageProps = {
  params: Promise<{ id: string; vehicleId: string }>;
};

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  await requireDashboardUser();
  const { id: residentId, vehicleId } = await params;

  const vehicle = await prisma.residentVehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    notFound();
  }

  return (
    <AdminPage width="narrow">
      <PageHeader title="Edit vehicle" back={{ href: `/residents/${residentId}/vehicles`, label: "Back to vehicles" }} />
      <VehicleForm residentId={residentId} vehicle={vehicle} />
    </AdminPage>
  );
}
