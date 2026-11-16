import Link from "next/link";
import { Edit, Eye, Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { AdminPage, PageHeader } from "@/app/components/page-header";

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

  const statusMeta: Record<string, { label: string; chip: string; muted: boolean }> = {
    DRAFT:  { label: t.collections.draft,  chip: "bg-[#eef0f4] text-[#5d6779]", muted: true  },
    ACTIVE: { label: t.collections.active, chip: "bg-[#e2f7e1] text-[#1c7a33]", muted: false },
    CLOSED: { label: t.collections.closed, chip: "bg-[#eef0f4] text-[#5d6779]", muted: true  },
  };

  const activeCount  = collections.filter((c) => c.status === "ACTIVE").length;
  const draftCount   = collections.filter((c) => c.status === "DRAFT").length;
  const closedCount  = collections.filter((c) => c.status === "CLOSED").length;

  return (
    <AdminPage>
      <PageHeader
        title={t.collections.title}
        subtitle={t.collections.subtitle}
        actions={
          <Link className="ui-button-primary" href="/special-collections/new">
            <Plus aria-hidden="true" size={16} />
            {t.collections.newCollection}
          </Link>
        }
      />

      {/* Summary row */}
      {collections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-2)]">
          <span className="mr-1">{collections.length} total</span>
          {activeCount  > 0 && <span className={`ui-chip ${statusMeta.ACTIVE.chip}`}>{activeCount} active</span>}
          {draftCount   > 0 && <span className={`ui-chip ${statusMeta.DRAFT.chip}`}>{draftCount} draft</span>}
          {closedCount  > 0 && <span className={`ui-chip ${statusMeta.CLOSED.chip}`}>{closedCount} closed</span>}
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
                className={`ui-card flex flex-col gap-4 p-5 ${meta.muted ? "opacity-75" : ""}`}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-heading text-base font-bold text-[var(--ink)]">{collection.title}</p>
                    {collection.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--ink-2)]">{collection.description}</p>
                    )}
                  </div>
                  <span className={`ui-chip shrink-0 ${meta.chip}`}>{meta.label}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-[var(--paper)] px-2 py-2.5">
                    <p className="text-xs text-[var(--ink-2)]">Per unit</p>
                    <p className="mt-0.5 font-heading text-sm font-bold tabular-nums text-[var(--ink)]">{formatRM(collection.amountPerResident)}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--paper)] px-2 py-2.5">
                    <p className="text-xs text-[var(--ink-2)]">Assigned</p>
                    <p className="mt-0.5 font-heading text-sm font-bold tabular-nums text-[var(--ink)]">{collection._count.assignments}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--paper)] px-2 py-2.5">
                    <p className="text-xs text-[var(--ink-2)]">Paid</p>
                    <p className="mt-0.5 font-heading text-sm font-bold tabular-nums text-[#1c7a33]">{s.paidCount}</p>
                  </div>
                </div>

                {/* Progress: collected vs assigned target */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="tabular-nums text-[var(--ink-2)]">{formatRM(s.paidSen)} collected</span>
                    <span className="font-semibold tabular-nums text-[var(--ink)]">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
                    <div className="h-full rounded-full bg-[var(--leaf)]" style={{ width: `${pct}%` }} />
                  </div>
                  {outstanding > 0 && (
                    <p className="mt-1 text-right text-xs tabular-nums text-[#8a6300]">{formatRM(outstanding)} outstanding</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] pt-2">
                  <p className="text-xs text-[var(--ink-2)]">
                    {collection.dueDate
                      ? `Due ${collection.dueDate.toLocaleDateString("en-MY")}`
                      : "No due date"}
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]"
                      href={`/special-collections/${collection.id}`}
                    >
                      <Eye aria-hidden="true" size={14} />
                      View
                    </Link>
                    <Link
                      className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[var(--blue)] hover:underline"
                      href={`/special-collections/${collection.id}/edit`}
                    >
                      <Edit aria-hidden="true" size={14} />
                      {t.common.edit}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ui-card ui-empty">
          <p>{t.collections.noCollections}</p>
          <Link className="ui-button-primary mt-2" href="/special-collections/new">
            <Plus aria-hidden="true" size={16} />
            {t.collections.newCollection}
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
