import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DetailPageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Active";
  if (status === "CLOSED") return "Closed";
  return "Draft";
}

export default async function SpecialCollectionDetailPage({ params }: DetailPageProps) {
  await requireDashboardUser();

  const { id } = await params;
  const [collection, assignments] = await Promise.all([
    prisma.specialCollection.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        amountPerResident: true,
        dueDate: true,
        eventStartDate: true,
        eventEndDate: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.specialCollectionAssignment.findMany({
      where: { specialCollectionId: id },
      orderBy: { resident: { unitNumber: "asc" } },
      select: {
        id: true,
        resident: { select: { id: true, unitNumber: true, name: true } },
        amountDue: true,
        amountPaid: true,
        status: true,
      },
    }),
  ]);

  if (!collection) {
    notFound();
  }

  const totalDue = assignments.reduce((sum, a) => sum + a.amountDue, 0);
  const totalPaid = assignments.reduce((sum, a) => sum + a.amountPaid, 0);
  const outstanding = totalDue - totalPaid;
  const paidCount = assignments.filter((a) => a.amountPaid >= a.amountDue).length;

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900" href="/special-collections">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to collections
        </Link>

        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Collection details</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{collection.title}</h1>
            {collection.description && <p className="mt-2 text-sm leading-6 text-slate-600">{collection.description}</p>}
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" href={`/special-collections/${id}/edit`}>
            <Edit aria-hidden="true" size={17} />
            Edit
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Amount per household</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{formatRM(collection.amountPerResident)}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Assigned households</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{assignments.length}</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Collected</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{formatRM(totalPaid)}</p>
            <p className="mt-1 text-xs text-slate-500">{paidCount} households paid</p>
          </div>
          <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Outstanding</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-600">{formatRM(outstanding)}</p>
          </div>
        </section>

        <section className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight">Household assignments</h2>
            <p className="mt-1 text-sm text-slate-500">{assignments.length} households assigned</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 font-semibold">Resident</th>
                  <th className="px-5 py-3 font-semibold">Amount due</th>
                  <th className="px-5 py-3 font-semibold">Amount paid</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.length > 0 ? (
                  assignments.map((assignment) => {
                    const outstanding = assignment.amountDue - assignment.amountPaid;
                    const isPaid = outstanding <= 0;

                    return (
                      <tr className="transition hover:bg-cyan-50/40" key={assignment.id}>
                        <td className="px-5 py-4 font-semibold text-slate-950">{assignment.resident.unitNumber}</td>
                        <td className="px-5 py-4">{assignment.resident.name}</td>
                        <td className="px-5 py-4 font-semibold text-slate-950">{formatRM(assignment.amountDue)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-950">{formatRM(assignment.amountPaid)}</td>
                        <td className="px-5 py-4">
                          {isPaid ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                              Outstanding: {formatRM(outstanding)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={5}>
                      No households assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {collection.dueDate && (
            <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Due date</p>
              <p className="mt-2 font-semibold text-slate-950">{collection.dueDate.toLocaleDateString("en-MY")}</p>
            </div>
          )}
          {collection.eventStartDate && (
            <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Event start date</p>
              <p className="mt-2 font-semibold text-slate-950">{collection.eventStartDate.toLocaleDateString("en-MY")}</p>
            </div>
          )}
          {collection.eventEndDate && (
            <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Event end date</p>
              <p className="mt-2 font-semibold text-slate-950">{collection.eventEndDate.toLocaleDateString("en-MY")}</p>
            </div>
          )}
        </section>

        <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status</p>
          <p className="mt-2 font-semibold text-slate-950">{statusLabel(collection.status)}</p>
        </div>
      </div>
    </main>
  );
}
