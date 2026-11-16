import Link from "next/link";
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
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/vehicles`}>
            Back to vehicles
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Edit vehicle</h1>
        </header>
        <VehicleForm residentId={residentId} vehicle={vehicle} />
      </div>
    </main>
  );
}
