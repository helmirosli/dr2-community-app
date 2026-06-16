"use server";

import { revalidatePath } from "next/cache";

import { findDuplicatePublicSubmission, findExistingOfficialCoverageByUnitNumber } from "@/lib/payments/duplicates";
import { prisma } from "@/lib/prisma";
import { getSingleUploadedFile, removeStoredUpload, storeProofUpload } from "@/lib/uploads";
import { publicSubmissionSchema } from "@/lib/validation";

export type PublicSubmissionState = {
  ok: boolean;
  message: string;
};

export async function createPublicSubmission(
  _previousState: PublicSubmissionState,
  formData: FormData,
): Promise<PublicSubmissionState> {
  const raw = Object.fromEntries(formData);
  const parsed = publicSubmissionSchema.safeParse(raw);
  let proofFile: File | null = null;

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check the form details.",
    };
  }

  try {
    proofFile = getSingleUploadedFile(formData, "proofFile");

    if (parsed.data.method !== "CASH" && !proofFile) {
      return {
        ok: false,
        message: "Please upload payment proof for non-cash payments.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Please upload a valid proof file.",
    };
  }

  let storedUpload = null;

  try {
    storedUpload = proofFile ? await storeProofUpload(proofFile) : null;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Proof upload failed. Please check the file and try again.",
    };
  }

  const duplicateSubmission = await findDuplicatePublicSubmission({
    unitNumber: parsed.data.unitNumber,
    paymentType: parsed.data.paymentType,
    amountSen: parsed.data.amountSen,
    coverageStartYear: parsed.data.coverageStartYear,
    coverageStartMonth: parsed.data.coverageStartMonth,
    coverageEndYear: parsed.data.coverageEndYear,
    coverageEndMonth: parsed.data.coverageEndMonth,
    referenceNo: parsed.data.referenceNo,
    uploadContentHash: storedUpload?.contentHash,
  });

  if (duplicateSubmission) {
    if (storedUpload) {
      await removeStoredUpload(storedUpload.storagePath);
    }

    return {
      ok: false,
      message: "A similar submission is already waiting for review. Please contact AJK if you need to update it.",
    };
  }

  if (parsed.data.paymentType === "MONTHLY_FEE") {
    const existingCoverage = await findExistingOfficialCoverageByUnitNumber(
      parsed.data.unitNumber,
      parsed.data.coverageStartYear,
      parsed.data.coverageStartMonth,
      parsed.data.coverageEndYear,
      parsed.data.coverageEndMonth,
    );

    if (existingCoverage) {
      if (storedUpload) {
        await removeStoredUpload(storedUpload.storagePath);
      }

      return {
        ok: false,
        message: `This unit already has payment coverage for ${existingCoverage.month}/${existingCoverage.year}. Please submit only unpaid months or contact AJK.`,
      };
    }
  }

  try {
    await prisma.publicPaymentSubmission.create({
      data: {
        unitNumber: parsed.data.unitNumber,
        residentName: parsed.data.residentName,
        phone: parsed.data.phone,
        paymentType: parsed.data.paymentType,
        amountSen: parsed.data.amountSen,
        paymentDate: new Date(parsed.data.paymentDate),
        method: parsed.data.method,
        coverageStartYear: parsed.data.coverageStartYear,
        coverageStartMonth: parsed.data.coverageStartMonth,
        coverageEndYear: parsed.data.coverageEndYear,
        coverageEndMonth: parsed.data.coverageEndMonth,
        referenceNo: parsed.data.referenceNo,
        notes: parsed.data.notes,
        uploads: storedUpload
          ? {
              create: storedUpload,
            }
          : undefined,
      },
    });
  } catch {
    if (storedUpload) {
      await removeStoredUpload(storedUpload.storagePath);
    }

    return {
      ok: false,
      message: "Submission failed. Please try again.",
    };
  }

  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "Submission received. Admin or AJK will review it before marking payment as paid.",
  };
}