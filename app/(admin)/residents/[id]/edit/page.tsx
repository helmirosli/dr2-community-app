import Link from "next/link";
import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResidentForm } from "../../resident-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditResidentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditResidentPage({ params }: EditResidentPageProps) {
  await requireDashboardUser();

  const { id } = await params;
  const resident = await prisma.resident.findUnique({
    where: { id },
  });

  if (!resident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-3xl gap-6">
        <header>
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${resident.id}`}>
            Back to resident
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Edit {resident.unitNumber}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Update household contact details, block, status, and notes.
          </p>
        </header>
        <ResidentForm resident={resident} />
      </div>
    </main>
  );
}