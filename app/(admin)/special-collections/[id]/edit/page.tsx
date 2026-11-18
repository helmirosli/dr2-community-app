import { notFound } from "next/navigation";

import { requireDashboardEditor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { SpecialCollectionForm } from "../../special-collection-form";
import { sortByUnit } from "@/lib/units";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSpecialCollectionPage({ params }: EditPageProps) {
  await requireDashboardEditor();

  const { id } = await params;
  const [collection, residents, assigned] = await Promise.all([
    prisma.specialCollection.findUnique({ where: { id } }),
    prisma.resident.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, unitNumber: true, name: true },
      orderBy: { unitNumber: "asc" },
    }),
    prisma.specialCollectionAssignment.findMany({
      where: { specialCollectionId: id },
      select: { residentId: true },
    }),
  ]);

  if (!collection) {
    notFound();
  }

  const assignedIds = assigned.map((a) => a.residentId);
  sortByUnit(residents);

  return (
    <AdminPage>
      <PageHeader title={collection.title} subtitle="Edit collection" back={{ href: `/special-collections/${id}`, label: "Back to collection" }} />

      <SpecialCollectionForm
        assignedResidents={assignedIds}
        collection={{
          id: collection.id,
          title: collection.title,
          description: collection.description,
          amountPerResident: collection.amountPerResident,
          dueDate: collection.dueDate ? collection.dueDate.toISOString().split("T")[0] : null,
          eventStartDate: collection.eventStartDate ? collection.eventStartDate.toISOString().split("T")[0] : null,
          eventEndDate: collection.eventEndDate ? collection.eventEndDate.toISOString().split("T")[0] : null,
          status: collection.status,
        }}
        residents={residents}
      />
    </AdminPage>
  );
}
