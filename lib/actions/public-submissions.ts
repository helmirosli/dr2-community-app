"use server";

import { revalidatePath } from "next/cache";

import { findDuplicatePublicSubmission, findExistingOfficialCoverageByUnitNumber } from "@/lib/payments/duplicates";
import { prisma } from "@/lib/prisma";
import { getSingleUploadedFile, removeStoredUpload, storeProofUpload } from "@/lib/uploads";
import { verifyTurnstile } from "@/lib/turnstile";
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

  // Verify CAPTCHA
  const turnstileToken = formData.get("cf-turnstile-response")?.toString() ?? "";
  const isHuman = await verifyTurnstile(turnstileToken);
  if (!isHuman) {
    return {
      ok: false,
      message: "Security verification failed. Please try again.",
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

  // Verify the unit number exists in our resident database
  const resident = await prisma.resident.findUnique({
    where: { unitNumber: parsed.data.unitNumber },
  });

  if (!resident) {
    return {
      ok: false,
      message: "Your unit could not be found in our system. This may be due to missing or incorrect data. Please contact the Admin / AJK for assistance.",
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

  if (parsed.data.paymentType === "SPECIAL_COLLECTION") {
    if (!parsed.data.specialCollectionId) {
      return {
        ok: false,
        message: "Please select a collection from the list.",
      };
    }

    const assignment = await prisma.specialCollectionAssignment.findFirst({
      where: {
        specialCollectionId: parsed.data.specialCollectionId,
        resident: { unitNumber: parsed.data.unitNumber },
      },
    });

    if (!assignment) {
      return {
        ok: false,
        message: "Your unit is not assigned to this collection. Please contact the Admin or AJK for assistance.",
      };
    }
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
        message: `This unit already has full payment coverage for ${existingCoverage.month}/${existingCoverage.year}. Please submit only unpaid months or contact AJK.`,
      };
    }
  }

  try {
    await prisma.publicPaymentSubmission.create({
      data: {
        unitNumber: parsed.data.unitNumber,
        residentName: parsed.data.residentName || "",
        phone: parsed.data.phone || "",
        paymentType: parsed.data.paymentType,
        amountSen: parsed.data.amountSen,
        paymentDate: new Date(parsed.data.paymentDate),
        method: parsed.data.method,
        coverageStartYear: parsed.data.coverageStartYear,
        coverageStartMonth: parsed.data.coverageStartMonth,
        coverageEndYear: parsed.data.coverageEndYear,
        coverageEndMonth: parsed.data.coverageEndMonth,
        specialCollectionId: parsed.data.paymentType === "SPECIAL_COLLECTION" ? (parsed.data.specialCollectionId || null) : null,
        referenceNo: parsed.data.referenceNo,
        notes: parsed.data.notes,
        uploads: storedUpload
          ? {
              create: storedUpload,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("createPublicSubmission failed:", error);
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