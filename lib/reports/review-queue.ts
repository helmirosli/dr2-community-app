import { malaysiaToday, pad2 } from "@/lib/dates";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { expandMonthRange } from "@/lib/months";
import { findExistingOfficialCoverageByUnitNumber } from "@/lib/payments/duplicates";
import { prisma } from "@/lib/prisma";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { getMonthlyReport } from "@/lib/reports/monthly-data";

export type QueueItem = {
  id: string;
  unit: string;
  name: string;
  amountSen: number;
  type: "MONTHLY_FEE" | "SPECIAL_COLLECTION";
  collectionTitle: string | null;
  createdAt: Date;
  /** Whole days it has been waiting. */
  ageDays: number;
};

export type ReviewItem = {
  id: string;
  residentId: string | null;
  unit: string;
  name: string;
  /** The phone number given on the submission. */
  phone: string;
  type: "MONTHLY_FEE" | "SPECIAL_COLLECTION";
  amountSen: number;
  method: string;
  paymentDate: Date;
  referenceNo: string | null;
  notes: string | null;
  createdAt: Date;
  ageDays: number;
  /** The months a monthly fee says it covers. */
  months: { year: number; month: number }[];
  collectionTitle: string | null;
  /** What the house owes and has paid so far for the collection. */
  assignment: { dueSen: number; paidSen: number } | null;
  expectedSen: number;
  /** Claimed minus expected: positive means they paid more than expected. */
  diffSen: number;
  /** The first month in the claim that already has a full official payment. */
  overlap: { year: number; month: number } | null;
  /** The same receipt file was attached to another submission. */
  duplicateFile: boolean;
  /** Whether there is a file whose fingerprint could be compared. */
  fileChecked: boolean;
  paidUntil: { year: number; month: number } | null;
  uploads: { id: string; originalFilename: string; storagePath: string; mimeType: string; url: string | null }[];
};

export type RecentDecision = {
  id: string;
  unit: string;
  name: string;
  amountSen: number;
  status: string;
  reviewedAt: Date | null;
  reason: string | null;
};

export type ReviewData =
  | { kind: "empty"; approvedToday: number; rejectedToday: number; recent: RecentDecision[] }
  | { kind: "item"; queue: QueueItem[]; index: number; item: ReviewItem };

const DAY_MS = 86_400_000;

/** The name the house is registered under, so every row reads the same whatever the sender typed. */
async function registeredNames(units: string[]) {
  const rows = await prisma.resident.findMany({ where: { unitNumber: { in: units } }, select: { unitNumber: true, name: true } });
  return new Map(rows.map((r) => [r.unitNumber, r.name]));
}

/** The pending-receipt inbox, with the chosen item (or the oldest) worked out in full. */
export async function getReviewData(id?: string): Promise<ReviewData> {
  const now = Date.now();
  const ageOf = (d: Date) => Math.max(0, Math.floor((now - d.getTime()) / DAY_MS));

  const queueRows = await prisma.publicPaymentSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      uploads: { select: { id: true, originalFilename: true, storagePath: true, mimeType: true, url: true, contentHash: true } },
      specialCollection: { select: { title: true, amountPerResident: true } },
    },
  });

  if (queueRows.length === 0) {
    const today = malaysiaToday();
    const startOfDay = new Date(`${today.year}-${pad2(today.month)}-${pad2(today.day)}T00:00:00+08:00`);
    const [decided, recent] = await Promise.all([
      prisma.publicPaymentSubmission.groupBy({
        by: ["status"],
        where: { reviewedAt: { gte: startOfDay }, status: { in: ["APPROVED", "REJECTED"] } },
        _count: { _all: true },
      }),
      prisma.publicPaymentSubmission.findMany({
        where: { status: { in: ["APPROVED", "REJECTED"] }, reviewedAt: { not: null } },
        orderBy: { reviewedAt: "desc" },
        take: 5,
        select: { id: true, unitNumber: true, residentName: true, amountSen: true, status: true, reviewedAt: true, reviewReason: true },
      }),
    ]);
    const countOf = (s: string) => decided.find((d) => d.status === s)?._count._all ?? 0;
    const names = await registeredNames(recent.map((r) => r.unitNumber));
    return {
      kind: "empty",
      approvedToday: countOf("APPROVED"),
      rejectedToday: countOf("REJECTED"),
      recent: recent.map((r) => ({ id: r.id, unit: r.unitNumber, name: names.get(r.unitNumber) ?? r.residentName, amountSen: r.amountSen, status: r.status, reviewedAt: r.reviewedAt, reason: r.reviewReason })),
    };
  }

  const names = await registeredNames(queueRows.map((s) => s.unitNumber));
  const queue: QueueItem[] = queueRows.map((s) => ({
    id: s.id,
    unit: s.unitNumber,
    name: names.get(s.unitNumber) ?? s.residentName,
    amountSen: s.amountSen,
    type: s.paymentType,
    collectionTitle: s.specialCollection?.title ?? null,
    createdAt: s.createdAt,
    ageDays: ageOf(s.createdAt),
  }));

  const index = Math.max(0, queueRows.findIndex((s) => s.id === id));
  const row = queueRows[index];
  const isMonthly = row.paymentType === "MONTHLY_FEE";
  const months = isMonthly ? expandMonthRange(row.coverageStartYear, row.coverageStartMonth, row.coverageEndYear, row.coverageEndMonth) : [];

  // Special collections: expect what this house still owes (due − already paid), not the full per-house amount.
  const assignment =
    !isMonthly && row.specialCollectionId
      ? await prisma.specialCollectionAssignment.findFirst({
          where: { specialCollectionId: row.specialCollectionId, resident: { unitNumber: row.unitNumber } },
          select: { amountDue: true, amountPaid: true },
        })
      : null;
  // A month that already holds part of its fee (an earlier overpayment spilled into it) only needs the rest.
  // Read the amounts from the year grid, the same numbers the house pages show.
  const inByMonth = new Map<string, number>();
  if (isMonthly) {
    for (const year of new Set(months.map((m) => m.year))) {
      const gridRow = (await getYearGridData({ year, includeInactive: true })).rows.find((r) => r.unitNumber === row.unitNumber);
      gridRow?.months.forEach((amount, i) => inByMonth.set(`${year}-${i + 1}`, amount ?? 0));
    }
  }
  const inFor = (m: { year: number; month: number }) => Math.min(DEFAULT_MONTHLY_FEE_SEN, inByMonth.get(`${m.year}-${m.month}`) ?? 0);
  const expectedSen = isMonthly
    ? months.reduce((sum, m) => sum + DEFAULT_MONTHLY_FEE_SEN - inFor(m), 0)
    : assignment
      ? Math.max(0, assignment.amountDue - assignment.amountPaid)
      : row.specialCollection?.amountPerResident ?? 0;
  const hashes = row.uploads.map((u) => u.contentHash).filter((h): h is string => Boolean(h));
  const nowDate = new Date(now);

  const [resident, overlap, duplicateCount, report] = await Promise.all([
    prisma.resident.findUnique({ where: { unitNumber: row.unitNumber }, select: { id: true } }),
    isMonthly
      ? findExistingOfficialCoverageByUnitNumber(row.unitNumber, row.coverageStartYear, row.coverageStartMonth, row.coverageEndYear, row.coverageEndMonth)
      : null,
    hashes.length ? prisma.upload.count({ where: { contentHash: { in: hashes }, NOT: { submissionId: row.id } } }) : 0,
    getMonthlyReport({ year: nowDate.getFullYear(), month: nowDate.getMonth() + 1, includeInactive: true }),
  ]);
  const house = report.rows.find((r) => r.unitNumber === row.unitNumber);

  return {
    kind: "item",
    queue,
    index,
    item: {
      id: row.id,
      residentId: resident?.id ?? null,
      unit: row.unitNumber,
      name: names.get(row.unitNumber) ?? row.residentName,
      phone: row.phone,
      type: row.paymentType,
      amountSen: row.amountSen,
      method: row.method,
      paymentDate: row.paymentDate,
      referenceNo: row.referenceNo,
      notes: row.notes,
      createdAt: row.createdAt,
      ageDays: ageOf(row.createdAt),
      months,
      collectionTitle: row.specialCollection?.title ?? null,
      assignment: assignment ? { dueSen: assignment.amountDue, paidSen: assignment.amountPaid } : null,
      expectedSen,
      diffSen: row.amountSen - expectedSen,
      overlap: overlap ? { year: overlap.year, month: overlap.month } : null,
      duplicateFile: duplicateCount > 0,
      fileChecked: hashes.length > 0,
      paidUntil: house?.paidUntilYear && house.paidUntilMonth ? { year: house.paidUntilYear, month: house.paidUntilMonth } : null,
      uploads: row.uploads.map((u) => ({ id: u.id, originalFilename: u.originalFilename, storagePath: u.storagePath, mimeType: u.mimeType, url: u.url })),
    },
  };
}
