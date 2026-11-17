import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TenantListView } from "./tenant-list-view";

type TenantListPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function TenantListPage({ params, searchParams }: TenantListPageProps) {
  await requireDashboardUser();
  const { id: residentId } = await params;
  const params2 = await searchParams;
  const query = params2.q?.trim() ?? "";

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      tenants: {
        orderBy: { name: "asc" },
        where: query ? { name: { contains: query } } : undefined,
        include: { vehicles: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!resident) {
    notFound();
  }

  return (
    <TenantListView
      resident={{ id: resident.id, name: resident.name, unitNumber: resident.unitNumber, tenants: resident.tenants }}
      residentId={residentId}
      query={query}
    />
  );
}
