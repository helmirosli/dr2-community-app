import Link from "next/link";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TenantForm } from "../../tenant-form";

type EditTenantPageProps = {
  params: Promise<{ id: string; tenantId: string }>;
};

export default async function EditTenantPage({ params }: EditTenantPageProps) {
  await requireDashboardUser();
  const { id: residentId, tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      vehicles: {
        select: {
          id: true,
          make: true,
          model: true,
          plateNumber: true,
        },
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900 transition-colors" href={`/residents/${residentId}/tenants`}>
            Back to tenants
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Edit tenant</h1>
        </header>
        <TenantForm residentId={residentId} tenant={tenant} />
      </div>
    </main>
  );
}
