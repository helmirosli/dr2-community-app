import Link from "next/link";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../vehicle-form";

type NewTenantVehiclePageProps = {
  params: Promise<{ id: string; tenantId: string }>;
};

export default async function NewTenantVehiclePage({ params }: NewTenantVehiclePageProps) {
  await requireDashboardUser();
  const { id: residentId, tenantId } = await params;

  const [tenant, resident] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    }),
    prisma.resident.findUnique({
      where: { id: residentId },
      select: { unitNumber: true, name: true },
    }),
  ]);

  if (!tenant || !resident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/tenants/${tenantId}/vehicles`}>
            Back to vehicles
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Add vehicle</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {tenant.name} — unit {resident.unitNumber}
          </p>
        </header>
        <VehicleForm tenantId={tenantId} />
      </div>
    </main>
  );
}
