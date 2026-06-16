import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SpecialCollectionForm } from "../../special-collection-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSpecialCollectionPage({ params }: EditPageProps) {
  await requireDashboardUser();

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

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/special-collections/${id}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Back to collection
        </Link>

        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Edit collection</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{collection.title}</h1>
        </header>

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
      </div>
    </main>
  );
}
