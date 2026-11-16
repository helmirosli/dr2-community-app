import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SpecialCollectionForm } from "../special-collection-form";

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
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-3xl gap-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/special-collections" className="transition-colors hover:text-slate-700">
            Operations
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">New Collection</span>
        </nav>

        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">New collection</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create special collection</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Set up a one-time collection like festival guarded service or emergency repairs. Assign to all active households or select specific ones.
          </p>
        </header>

        <SpecialCollectionForm residents={residents} />
      </div>
    </main>
  );
}
