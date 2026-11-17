import { prisma } from "@/lib/prisma";
import type { MonthState } from "@/lib/status";
import { compareUnits } from "@/lib/units";

export type CollectionHouse = {
  residentId: string;
  unit: string;
  name: string;
  phone: string | null;
  dueSen: number;
  /** Paid so far, from the payments actually linked to this collection. */
  paidSen: number;
  /** What the house's stored running total says it has paid (can differ from the linked payments). */
  recordedSen: number;
  /** paid / pending (a receipt is waiting) / partial / unpaid; "upcoming" while the collection is still a draft. */
  state: MonthState;
};

export type CollectionOverview = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  amountPerResident: number;
  dueDate: Date | null;
  eventStartDate: Date | null;
  eventEndDate: Date | null;
  houses: CollectionHouse[];
  dueSen: number;
  paidSen: number;
  /** What is still owed: each house's shortfall, so one house overpaying never hides another's debt. */
  outstandingSen: number;
  /** Houses that have paid in full. */
  paidCount: number;
  /** Receipts from residents waiting for the AJK to review. */
  waitingCount: number;
  /** Houses whose stored running total disagrees with the payments linked to them. */
  mismatchCount: number;
  /** 0–100, collected against what is due. */
  pct: number;
};

/**
 * Every special collection with its houses and totals, in three queries.
 * "Paid" comes from linked payments, the same source as the collection's detail page, so the list and the
 * detail always show the same numbers.
 */
export async function getCollectionsOverview(only?: string): Promise<CollectionOverview[]> {
  const [collections, linked, waiting] = await Promise.all([
    prisma.specialCollection.findMany({
      where: only ? { id: only } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        amountPerResident: true,
        status: true,
        dueDate: true,
        eventStartDate: true,
        eventEndDate: true,
        assignments: {
          select: { residentId: true, amountDue: true, amountPaid: true, resident: { select: { unitNumber: true, name: true, phone: true } } },
        },
      },
    }),
    prisma.payment.groupBy({
      by: ["specialCollectionId", "residentId"],
      where: { specialCollectionId: only ?? { not: null } },
      _sum: { amountSen: true },
    }),
    prisma.publicPaymentSubmission.findMany({
      where: { paymentType: "SPECIAL_COLLECTION", status: "PENDING_REVIEW", specialCollectionId: only ?? { not: null } },
      select: { specialCollectionId: true, unitNumber: true },
    }),
  ]);

  const paidBy = new Map<string, number>();
  for (const p of linked) {
    if (p.specialCollectionId) paidBy.set(`${p.specialCollectionId}:${p.residentId}`, p._sum.amountSen ?? 0);
  }
  const waitingUnits = new Set<string>();
  const waitingCount = new Map<string, number>();
  for (const w of waiting) {
    if (!w.specialCollectionId) continue;
    waitingUnits.add(`${w.specialCollectionId}:${w.unitNumber}`);
    waitingCount.set(w.specialCollectionId, (waitingCount.get(w.specialCollectionId) ?? 0) + 1);
  }

  return collections.map((c) => {
    let mismatchCount = 0;
    const houses: CollectionHouse[] = c.assignments
      .map((a) => {
        const paidSen = paidBy.get(`${c.id}:${a.residentId}`) ?? 0;
        if (a.amountPaid !== paidSen) mismatchCount += 1;
        const state: MonthState =
          paidSen >= a.amountDue
            ? "paid"
            : waitingUnits.has(`${c.id}:${a.resident.unitNumber}`)
              ? "pending"
              : paidSen > 0
                ? "partial"
                : c.status === "DRAFT"
                  ? "upcoming"
                  : "unpaid";
        return { residentId: a.residentId, unit: a.resident.unitNumber, name: a.resident.name, phone: a.resident.phone, dueSen: a.amountDue, paidSen, recordedSen: a.amountPaid, state };
      })
      .sort((x, y) => compareUnits(x.unit, y.unit));

    const dueSen = houses.reduce((sum, h) => sum + h.dueSen, 0);
    const paidSen = houses.reduce((sum, h) => sum + h.paidSen, 0);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status,
      amountPerResident: c.amountPerResident,
      dueDate: c.dueDate,
      eventStartDate: c.eventStartDate,
      eventEndDate: c.eventEndDate,
      houses,
      dueSen,
      paidSen,
      outstandingSen: houses.reduce((sum, h) => sum + Math.max(0, h.dueSen - h.paidSen), 0),
      paidCount: houses.filter((h) => h.state === "paid").length,
      waitingCount: waitingCount.get(c.id) ?? 0,
      mismatchCount,
      pct: dueSen > 0 ? Math.min(100, Math.round((paidSen / dueSen) * 100)) : 0,
    };
  });
}
