import Link from "next/link";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TenantForm } from "../tenant-form";

type NewTenantPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewTenantPage({ params }: NewTenantPageProps) {
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
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/tenants`}>
            Back to tenants
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Add tenant</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Unit {resident.unitNumber} — {resident.name}
          </p>
        </header>
        <TenantForm residentId={residentId} />
      </div>
    </main>
  );
}
