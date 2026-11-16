import Link from "next/link";
import { ChevronRight, Edit, Eye, Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SpecialCollectionsPage() {
  await requireDashboardUser();

  const t = await getDictionary();

  const collections = await prisma.specialCollection.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      amountPerResident: true,
      status: true,
      dueDate: true,
      _count: { select: { assignments: true } },
    },
  });

  const stats = await Promise.all(
    collections.map(async (c) => {
      const [paid, paidCount] = await Promise.all([
        prisma.specialCollectionAssignment.aggregate({
          where: { specialCollectionId: c.id },
          _sum: { amountPaid: true },
        }),
        prisma.specialCollectionAssignment.count({
          where: { specialCollectionId: c.id, amountPaid: { gte: c.amountPerResident } },
        }),
      ]);
      return { id: c.id, paidSen: paid._sum.amountPaid ?? 0, paidCount };
    }),
  );

  const statsMap = Object.fromEntries(stats.map((s) => [s.id, s]));

  const statusMeta: Record<string, { label: string; dot: string; muted: boolean }> = {
    DRAFT:  { label: t.collections.draft,  dot: "bg-slate-400",   muted: true  },
    ACTIVE: { label: t.collections.active, dot: "bg-emerald-500", muted: false },
    CLOSED: { label: t.collections.closed, dot: "bg-slate-400",   muted: true  },
  };

  const activeCount  = collections.filter((c) => c.status === "ACTIVE").length;
  const draftCount   = collections.filter((c) => c.status === "DRAFT").length;
  const closedCount  = collections.filter((c) => c.status === "CLOSED").length;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Operations</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.collections.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{t.collections.extra}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.collections.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{t.collections.subtitle}</p>
          </div>
          <Link className="ui-button-primary shrink-0" href="/special-collections/new">
            <Plus aria-hidden="true" size={16} />
            {t.collections.newCollection}
          </Link>
        </div>

        {/* Summary row */}
        {collections.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span>{collections.length} total</span>
            {activeCount  > 0 && <span className="font-semibold text-emerald-700">● {activeCount} active</span>}
            {draftCount   > 0 && <span className="text-slate-500">● {draftCount} draft</span>}
            {closedCount  > 0 && <span className="text-slate-400">● {closedCount} closed</span>}
          </div>
        )}

        {/* Collection cards */}
        {collections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => {
              const s    = statsMap[collection.id];
              const target = collection.amountPerResident * collection._count.assignments;
              const pct  = target > 0 ? Math.min(100, Math.round((s.paidSen / target) * 100)) : 0;
              const meta = statusMeta[collection.status] ?? statusMeta.DRAFT;
              const outstanding = target - s.paidSen;

              return (
                <div
                  key={collection.id}
                  className={`ui-card flex flex-col gap-4 p-5 transition ${meta.muted ? "opacity-70" : ""}`}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{collection.title}</p>
                      {collection.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{collection.description}</p>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <span className={`size-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 px-2 py-2.5">
                      <p className="text-xs text-slate-500">Per unit</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{formatRM(collection.amountPerResident)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2.5">
                      <p className="text-xs text-slate-500">Assigned</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{collection._count.assignments}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2.5">
                      <p className="text-xs text-slate-500">Paid</p>
                      <p className="mt-0.5 text-sm font-bold text-emerald-700">{s.paidCount}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{formatRM(s.paidSen)} collected</span>
                      <span className="font-semibold text-cyan-700">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-cyan-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {outstanding > 0 && (
                      <p className="mt-1 text-right text-xs text-amber-700">{formatRM(outstanding)} outstanding</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">
                      {collection.dueDate
                        ? `Due ${collection.dueDate.toLocaleDateString("en-MY")}`
                        : "No due date"}
                    </p>
                    <div className="flex items-center gap-3">
                      <Link
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                        href={`/special-collections/${collection.id}`}
                      >
                        <Eye size={13} />
                        View
                      </Link>
                      <Link
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                        href={`/special-collections/${collection.id}/edit`}
                      >
                        <Edit size={13} />
                        {t.common.edit}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ui-card flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-slate-500">{t.collections.noCollections}</p>
            <Link className="ui-button-primary mt-4" href="/special-collections/new">
              <Plus size={16} />
              {t.collections.newCollection}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
