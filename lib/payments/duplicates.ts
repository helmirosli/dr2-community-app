import { areMonthRangesOverlapping, expandMonthRange } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type PublicDuplicateInput = {
  unitNumber: string;
  paymentType: "MONTHLY_FEE" | "SPECIAL_COLLECTION";
  amountSen: number;
  coverageStartYear: number;
  coverageStartMonth: number;
  coverageEndYear: number;
  coverageEndMonth: number;
  referenceNo?: string;
  uploadContentHash?: string;
};

export async function findDuplicatePublicSubmission(input: PublicDuplicateInput) {
  const candidates = await prisma.publicPaymentSubmission.findMany({
    where: {
      status: "PENDING_REVIEW",
      unitNumber: input.unitNumber,
      paymentType: input.paymentType,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountSen: true,
      referenceNo: true,
      coverageStartYear: true,
      coverageStartMonth: true,
      coverageEndYear: true,
      coverageEndMonth: true,
      createdAt: true,
      uploads: {
        select: {
          contentHash: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
  });

  return candidates.find((candidate) => {
    const hasOverlap = areMonthRangesOverlapping(
      candidate.coverageStartYear,
      candidate.coverageStartMonth,
      candidate.coverageEndYear,
      candidate.coverageEndMonth,
      input.coverageStartYear,
      input.coverageStartMonth,
      input.coverageEndYear,
      input.coverageEndMonth,
    );

    if (!hasOverlap) {
      return false;
    }

    const hasSameProof = Boolean(
      input.uploadContentHash &&
      candidate.uploads.some((upload) => upload.contentHash === input.uploadContentHash),
    );
    const hasSameReference = Boolean(input.referenceNo && candidate.referenceNo === input.referenceNo);

    return input.paymentType === "MONTHLY_FEE" || hasSameProof || hasSameReference || candidate.amountSen === input.amountSen;
  }) ?? null;
}

export async function findExistingOfficialCoverage(
  residentId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  const months = expandMonthRange(startYear, startMonth, endYear, endMonth);

  if (months.length === 0) {
    return null;
  }

  const coverages = await prisma.paymentCoverage.findMany({
    where: {
      residentId,
      OR: months.map((coverage) => ({
        year: coverage.year,
        month: coverage.month,
      })),
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    select: {
      year: true,
      month: true,
      amountApplied: true,
    },
  });

  const totalsByMonth = new Map<number, number>();
  for (const coverage of coverages) {
    const key = coverage.year * 100 + coverage.month;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + coverage.amountApplied);
  }

  for (const month of months) {
    const key = month.year * 100 + month.month;
    if ((totalsByMonth.get(key) ?? 0) >= DEFAULT_MONTHLY_FEE_SEN) {
      return {
        year: month.year,
        month: month.month,
        status: "PAID" as const,
      };
    }
  }

  return null;
}

export async function findExistingOfficialCoverageByUnitNumber(
  unitNumber: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  const resident = await prisma.resident.findUnique({
    where: { unitNumber },
    select: { id: true },
  });

  if (!resident) {
    return null;
  }

  return findExistingOfficialCoverage(
    resident.id,
    startYear,
    startMonth,
    endYear,
    endMonth,
  );
}