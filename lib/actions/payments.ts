"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertDashboardUser } from "@/lib/auth";
import { expandMonthRange, isValidMonthRange } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN, ringgitToSen } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSingleUploadedFile, removeStoredUpload, storeProofUpload, type StoredUpload } from "@/lib/uploads";

export type PaymentFormState = {
  ok: boolean;
  message: string;
};

const optionalText = z.string().trim().optional().or(z.literal(""));

const paymentSchema = z.object({
  residentId: z.string().trim().min(1, "Please select a resident."),
  paymentType: z.enum(["MONTHLY_FEE", "SPECIAL_COLLECTION"]),
  amount: z.coerce.number().positive("Amount must be more than zero.").max(100000),
  paymentDate: z.string().trim().min(1, "Payment date is required."),
  method: z.enum(["CASH", "BANK_TRANSFER", "DUITNOW_QR", "EWALLET", "CHEQUE", "OTHER"]),
  coverageStartYear: z.coerce.number().int().min(2020).max(2100),
  coverageStartMonth: z.coerce.number().int().min(1).max(12),
  coverageEndYear: z.coerce.number().int().min(2020).max(2100),
  coverageEndMonth: z.coerce.number().int().min(1).max(12),
  specialCollectionId: optionalText,
  referenceNo: optionalText,
  notes: optionalText,
  allowAdjustment: z.string().optional(),
});

// ── Resident snapshot for admin form ──────────────────────────────────────────

export type ResidentSnapshot = {
  unitNumber: string;
  name: string;
  latestCoverage: { year: number; month: number } | null;
  outstandingMonths: number[];
  currentYear: number;
  currentMonth: number;
  assignedCollections: {
    id: string;
    title: string;
    amountDue: number;
    amountPaid: number;
    outstanding: number;
  }[];
};

export async function getResidentSnapshot(residentId: string): Promise<ResidentSnapshot | null> {
  await assertDashboardUser();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [resident, coverages, assignments] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      select: { unitNumber: true, name: true },
    }),
    prisma.paymentCoverage.findMany({
      where: { residentId },
      select: { year: true, month: true, amountApplied: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.specialCollectionAssignment.findMany({
      where: { residentId, specialCollection: { status: "ACTIVE" } },
      select: {
        amountDue: true,
        amountPaid: true,
        specialCollection: { select: { id: true, title: true } },
      },
    }),
  ]);

  if (!resident) return null;

  const latestCoverage = coverages[0] ?? null;

  const coveredThisYear = new Set(
    coverages.filter((c) => c.year === currentYear).map((c) => c.month),
  );
  const outstandingMonths: number[] = [];
  for (let m = 1; m <= currentMonth; m++) {
    if (!coveredThisYear.has(m)) outstandingMonths.push(m);
  }

  return {
    unitNumber: resident.unitNumber,
    name: resident.name,
    latestCoverage: latestCoverage ? { year: latestCoverage.year, month: latestCoverage.month } : null,
    outstandingMonths,
    currentYear,
    currentMonth,
    assignedCollections: assignments.map((a) => ({
      id: a.specialCollection.id,
      title: a.specialCollection.title,
      amountDue: a.amountDue,
      amountPaid: a.amountPaid,
      outstanding: a.amountDue - a.amountPaid,
    })),
  };
}

function getPaymentInput(formData: FormData) {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Please check the payment details.",
    };
  }

  const coveredMonths =
    parsed.data.paymentType === "MONTHLY_FEE"
      ? expandMonthRange(
          parsed.data.coverageStartYear,
          parsed.data.coverageStartMonth,
          parsed.data.coverageEndYear,
          parsed.data.coverageEndMonth,
        )
      : [];

  if (
    parsed.data.paymentType === "MONTHLY_FEE" &&
    !isValidMonthRange(
      parsed.data.coverageStartYear,
      parsed.data.coverageStartMonth,
      parsed.data.coverageEndYear,
      parsed.data.coverageEndMonth,
    )
  ) {
    return {
      ok: false as const,
      message: "End month must be the same as or later than start month.",
    };
  }

  if (coveredMonths.length > 24) {
    return {
      ok: false as const,
      message: "Official payments can cover up to 24 months at once.",
    };
  }

  const expectedAmountSen = coveredMonths.length * DEFAULT_MONTHLY_FEE_SEN;

  if (
    parsed.data.paymentType === "MONTHLY_FEE" &&
    expectedAmountSen > 0 &&
    parsed.data.allowAdjustment !== "on" &&
    ringgitToSen(parsed.data.amount) !== expectedAmountSen
  ) {
    return {
      ok: false as const,
      message: `Expected amount is RM${(expectedAmountSen / 100).toFixed(2)}. Tick adjusted payment if this amount is intentional.`,
    };
  }

  return {
    ok: true as const,
    data: parsed.data,
    amountSen: ringgitToSen(parsed.data.amount),
    coveredMonths,
  };
}

async function findDuplicateCoverage(residentId: string, coveredMonths: { year: number; month: number }[]) {
  if (coveredMonths.length === 0) {
    return null;
  }

  return prisma.paymentCoverage.findFirst({
    where: {
      residentId,
      OR: coveredMonths.map((coverage) => ({
        year: coverage.year,
        month: coverage.month,
      })),
    },
    select: {
      year: true,
      month: true,
    },
  });
}

function buildCoverageRows(
  residentId: string,
  coveredMonths: { year: number; month: number }[],
  amountSen: number,
  existingCoverageMap?: Map<string, number>,
) {
  const rows = [];
  let remainingAmountSen = amountSen;

  // Process initially selected months - smart distribution for partial payments
  for (const coverage of coveredMonths) {
    if (remainingAmountSen <= 0) break;

    const key = `${coverage.year}:${coverage.month}`;
    const existingAmount = existingCoverageMap?.get(key) ?? 0;
    const amountNeeded = Math.max(0, DEFAULT_MONTHLY_FEE_SEN - existingAmount);
    const amountApplied = Math.min(amountNeeded || DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
    remainingAmountSen -= amountApplied;

    rows.push({
      residentId,
      year: coverage.year,
      month: coverage.month,
      amountApplied,
      status: existingAmount + amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? ("PAID" as const) : ("PARTIAL" as const),
    });
  }

  return rows;
}

export async function createPayment(_previousState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const user = await assertDashboardUser();
  const paymentInput = getPaymentInput(formData);

  if (!paymentInput.ok) {
    return paymentInput;
  }

  const resident = await prisma.resident.findUnique({
    where: { id: paymentInput.data.residentId },
    select: { id: true },
  });

  if (!resident) {
    return {
      ok: false,
      message: "Resident not found.",
    };
  }

  const duplicateCoverage = await findDuplicateCoverage(resident.id, paymentInput.coveredMonths);

  if (duplicateCoverage) {
    return {
      ok: false,
      message: `This resident already has coverage for ${duplicateCoverage.month}/${duplicateCoverage.year}.`,
    };
  }

  let storedUpload: StoredUpload | null = null;

  try {
    const proofFile = getSingleUploadedFile(formData, "proofFile");
    storedUpload = proofFile ? await storeProofUpload(proofFile, "payments") : null;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Please upload a valid proof file.",
    };
  }

  let paymentId = "";

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          residentId: resident.id,
          paymentType: paymentInput.data.paymentType,
          amountSen: paymentInput.amountSen,
          paymentDate: new Date(paymentInput.data.paymentDate),
          method: paymentInput.data.method,
          referenceNo: paymentInput.data.referenceNo || null,
          notes: paymentInput.data.notes || null,
          createdById: user.id,
          coverages: {
            create: buildCoverageRows(resident.id, paymentInput.coveredMonths, paymentInput.amountSen),
          },
          uploads: storedUpload ? { create: storedUpload } : undefined,
        },
      });

      if (
        paymentInput.data.paymentType === "SPECIAL_COLLECTION" &&
        paymentInput.data.specialCollectionId
      ) {
        await tx.specialCollectionAssignment.updateMany({
          where: { residentId: resident.id, specialCollectionId: paymentInput.data.specialCollectionId },
          data: { amountPaid: { increment: paymentInput.amountSen } },
        });
      }

      return p;
    });

    paymentId = payment.id;


    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: payment.id,
        action: "CREATE",
        afterJson: JSON.stringify({
          residentId: resident.id,
          paymentType: paymentInput.data.paymentType,
          amountSen: paymentInput.amountSen,
          coveredMonths: paymentInput.coveredMonths,
          adjusted: paymentInput.data.allowAdjustment === "on",
          uploadId: storedUpload?.storedFilename,
        }),
        createdBy: user.id,
      },
    });
  } catch {
    if (storedUpload) {
      await removeStoredUpload(storedUpload.storagePath);
    }

    return {
      ok: false,
      message: "Unable to save payment. Please check the details and try again.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath(`/residents/${resident.id}`);
  redirect(`/payments?created=${paymentId}`);
}