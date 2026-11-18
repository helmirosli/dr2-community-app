"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertDashboardUser } from "@/lib/auth";
import { expandMonthRange, isValidMonthRange } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN, ringgitToSen } from "@/lib/money";
import { buildMonthlyCoverageRows } from "@/lib/payments/coverage";
import { getMonthAmounts, owedForMonths } from "@/lib/payments/month-amounts";
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
  /** What each month already holds, keyed "2026-5" (this year and next). */
  monthAmounts: Record<string, number>;
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

  const monthAmounts = await getMonthAmounts(residentId, [currentYear, currentYear + 1]);
  const outstandingMonths: number[] = [];
  for (let m = 1; m <= currentMonth; m++) {
    if ((monthAmounts[`${currentYear}-${m}`] ?? 0) < DEFAULT_MONTHLY_FEE_SEN) outstandingMonths.push(m);
  }

  return {
    unitNumber: resident.unitNumber,
    name: resident.name,
    latestCoverage: latestCoverage ? { year: latestCoverage.year, month: latestCoverage.month } : null,
    outstandingMonths,
    monthAmounts,
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

  return {
    ok: true as const,
    data: parsed.data,
    amountSen: ringgitToSen(parsed.data.amount),
    coveredMonths,
  };
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

  // A month that is only partly paid (e.g. an overpayment spilled into it) can be topped up; a full month cannot be paid twice.
  const isMonthly = paymentInput.data.paymentType === "MONTHLY_FEE";
  const amounts = isMonthly ? await getMonthAmounts(resident.id, paymentInput.coveredMonths.map((m) => m.year)) : {};
  const fullMonth = paymentInput.coveredMonths.find((m) => (amounts[`${m.year}-${m.month}`] ?? 0) >= DEFAULT_MONTHLY_FEE_SEN);

  if (fullMonth) {
    return {
      ok: false,
      message: `This resident already has coverage for ${fullMonth.month}/${fullMonth.year}.`,
    };
  }

  const expectedAmountSen = owedForMonths(paymentInput.coveredMonths, amounts);

  if (isMonthly && expectedAmountSen > 0 && paymentInput.data.allowAdjustment !== "on" && paymentInput.amountSen !== expectedAmountSen) {
    return {
      ok: false,
      message: `Expected amount is RM${(expectedAmountSen / 100).toFixed(2)}. Tick adjusted payment if this amount is intentional.`,
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
          // Link special-collection payments to their collection (the collection page totals these).
          specialCollectionId:
            paymentInput.data.paymentType === "SPECIAL_COLLECTION" ? paymentInput.data.specialCollectionId || null : null,
          coverages: {
            // Official payments cover only the selected months; no carry-forward.
            create: buildMonthlyCoverageRows(resident.id, paymentInput.coveredMonths, paymentInput.amountSen).slice(
              0,
              paymentInput.coveredMonths.length,
            ),
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
          specialCollectionId: paymentInput.data.specialCollectionId || null,
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