import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { ResidentForm } from "../resident-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewResidentPage() {
  await requireDashboardUser();

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-3xl gap-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/residents" className="transition-colors hover:text-slate-700">
            Resident Management
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">Add Resident</span>
        </nav>
        <header>
          <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href="/residents">
            Back to residents
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Add resident</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a household record before recording official payments.
          </p>
        </header>
        <ResidentForm />
      </div>
    </main>
  );
}