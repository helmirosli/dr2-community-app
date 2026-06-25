import Link from "next/link";
import { ChevronRight, Edit, Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SpecialCollectionsPage() {
  await requireDashboardUser();

  const t = await getDictionary();

  function statusBadge(status: string) {
    const badges: Record<string, { label: string; className: string }> = {
      DRAFT: { label: t.collections.draft, className: "bg-slate-50 text-slate-700 ring-slate-100" },
      ACTIVE: { label: t.collections.active, className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
      CLOSED: { label: t.collections.closed, className: "bg-slate-100 text-slate-600 ring-slate-200" },
    };
    return badges[status] || badges.DRAFT;
  }

  const collections = await prisma.specialCollection.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      amountPerResident: true,
      status: true,
      dueDate: true,
      _count: { select: { assignments: true } },
    },
  });

  const stats = await Promise.all(
    collections.map(async (c) => {
      const paid = await prisma.specialCollectionAssignment.aggregate({
        where: { specialCollectionId: c.id },
        _sum: { amountPaid: true },
      });
      return { id: c.id, paidSen: paid._sum.amountPaid ?? 0 };
    }),
  );

  const statsMap = Object.fromEntries(stats.map((s) => [s.id, s.paidSen]));

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Operations</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.collections.title}</span>
        </nav>
        <header className="ui-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{t.collections.extra}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.collections.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t.collections.subtitle}
            </p>
          </div>
          <Link className="ui-button-primary" href="/special-collections/new">
            <Plus aria-hidden="true" size={17} />
            {t.collections.newCollection}
          </Link>
        </header>

        <section className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.collections.collectionTitle}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.collections.amountPerResident}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.collections.households}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.collections.amountCollected}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.collections.dueDate}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.common.status}</th>
                  <th className="sticky top-0 bg-slate-50 px-5 py-3 font-semibold">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.length > 0 ? (
                  collections.map((collection) => {
                    const badge = statusBadge(collection.status);
                    const collected = statsMap[collection.id] || 0;
                    const target = collection.amountPerResident * collection._count.assignments;

                    return (
                      <tr className="transition hover:bg-cyan-50/40" key={collection.id}>
                        <td className="px-5 py-4 font-semibold text-slate-950">{collection.title}</td>
                        <td className="px-5 py-4 text-slate-600">{formatRM(collection.amountPerResident)}</td>
                        <td className="px-5 py-4 text-slate-600">{collection._count.assignments}</td>
                        <td className="px-5 py-4 font-semibold text-slate-950">
                          {formatRM(collected)} / {formatRM(target)}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {collection.dueDate ? collection.dueDate.toLocaleDateString("en-MY") : "\u2014"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link className="inline-flex items-center gap-1.5 font-semibold text-cyan-700 hover:text-cyan-900" href={`/special-collections/${collection.id}/edit`}>
                            <Edit aria-hidden="true" size={14} />
                            {t.common.edit}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={7}>
                      {t.collections.noCollections}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
