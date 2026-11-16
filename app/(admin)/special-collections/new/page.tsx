import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { SpecialCollectionForm } from "../special-collection-form";
import { sortByUnit } from "@/lib/units";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewSpecialCollectionPage() {
  await requireDashboardUser();

  const residents = await prisma.resident.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, unitNumber: true, name: true },
    orderBy: { unitNumber: "asc" },
  });

  return (
    <AdminPage width="narrow">
      <PageHeader
        title="Create special collection"
        subtitle="Set up a one-time collection like festival guarded service or emergency repairs. Assign to all active households or select specific ones."
        back={{ href: "/special-collections", label: "Special Collections" }}
      />
      <SpecialCollectionForm residents={sortByUnit(residents)} />
    </AdminPage>
  );
}
