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
  referenceNo: optionalText,
  notes: optionalText,
  allowAdjustment: z.string().optional(),
});

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

function buildCoverageRows(residentId: string, coveredMonths: { year: number; month: number }[], amountSen: number) {
  let remainingAmountSen = amountSen;

  return coveredMonths.flatMap((coverage) => {
    if (remainingAmountSen <= 0) {
      return [];
    }

    const amountApplied = Math.min(DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
    remainingAmountSen -= amountApplied;

    return [
      {
        residentId,
        year: coverage.year,
        month: coverage.month,
        amountApplied,
        status: amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? "PAID" as const : "PARTIAL" as const,
      },
    ];
  });
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
    const payment = await prisma.payment.create({
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
        uploads: storedUpload
          ? {
              create: storedUpload,
            }
          : undefined,
      },
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