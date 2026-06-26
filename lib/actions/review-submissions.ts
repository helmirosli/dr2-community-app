"use server";

import { revalidatePath } from "next/cache";

import { assertDashboardUser } from "@/lib/auth";
import { expandMonthRange } from "@/lib/months";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { buildMonthlyCoverageRows } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";

export async function approveSubmission(submissionId: string) {
  const reviewer = await assertDashboardUser();

  await prisma.$transaction(async (tx) => {
    const submission = await tx.publicPaymentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.status !== "PENDING_REVIEW") {
      return;
    }

    const resident = await tx.resident.findUnique({
      where: { unitNumber: submission.unitNumber },
      select: { id: true },
    });

    if (!resident) {
      await tx.publicPaymentSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REJECTED",
          reviewReason: "Resident unit no longer exists. Re-register resident before approval.",
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PublicPaymentSubmission",
          entityId: submission.id,
          action: "REJECT_MISSING_RESIDENT",
          beforeJson: JSON.stringify({ status: submission.status, unitNumber: submission.unitNumber }),
          afterJson: JSON.stringify({ status: "REJECTED" }),
          createdBy: reviewer.id,
        },
      });

      return;
    }

    const coveredMonths =
      submission.paymentType === "MONTHLY_FEE"
        ? expandMonthRange(
            submission.coverageStartYear,
            submission.coverageStartMonth,
            submission.coverageEndYear,
            submission.coverageEndMonth,
          )
        : [];

    if (coveredMonths.length > 0) {
      const existingCoverages = await tx.paymentCoverage.findMany({
        where: {
          residentId: resident.id,
          OR: coveredMonths.map((coverage) => ({
            year: coverage.year,
            month: coverage.month,
          })),
        },
        select: {
          year: true,
          month: true,
          amountApplied: true,
        },
      });

      // Check if any month already has FULL payment (a single PAID record)
      // Allow supplementary payments to months with PARTIAL payment
      const fullyPaidMonth = coveredMonths.find((coverage) => {
        const key = coverage.year * 100 + coverage.month;
        const existingForMonth = existingCoverages.filter((e) => {
          const existingKey = e.year * 100 + e.month;
          return existingKey === key;
        });

        // Only reject if there's already a PAID record (single record >= RM50)
        // Allow if only PARTIAL records exist (supplementary payments)
        return existingForMonth.some((e) => e.amountApplied >= DEFAULT_MONTHLY_FEE_SEN);
      });

      if (fullyPaidMonth) {
        await tx.publicPaymentSubmission.update({
          where: { id: submission.id },
          data: {
            status: "REJECTED",
            reviewReason: `Month already has full payment for ${fullyPaidMonth.month}/${fullyPaidMonth.year}. Cannot apply additional payment to fully paid month.`,
            reviewedById: reviewer.id,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: "PublicPaymentSubmission",
            entityId: submission.id,
            action: "REJECT_DUPLICATE_COVERAGE",
            beforeJson: JSON.stringify({ status: submission.status }),
            afterJson: JSON.stringify({ status: "REJECTED", fullyPaidMonth: fullyPaidMonth.month }),
            createdBy: reviewer.id,
          },
        });

        return;
      }
    }

    // Build map of existing coverage for smart distribution
    const existingCoverageMap = new Map<string, number>();
    if (coveredMonths.length > 0) {
      const allExistingCoverages = await tx.paymentCoverage.findMany({
        where: {
          residentId: resident.id,
          OR: coveredMonths.map((coverage) => ({
            year: coverage.year,
            month: coverage.month,
          })),
        },
        select: {
          year: true,
          month: true,
          amountApplied: true,
        },
      });

      for (const coverage of allExistingCoverages) {
        const key = `${coverage.year}:${coverage.month}`;
        existingCoverageMap.set(
          key,
          (existingCoverageMap.get(key) ?? 0) + coverage.amountApplied,
        );
      }
    }

    const payment = await tx.payment.create({
      data: {
        residentId: resident.id,
        paymentType: submission.paymentType,
        amountSen: submission.amountSen,
        paymentDate: submission.paymentDate,
        method: submission.method,
        referenceNo: submission.referenceNo,
        notes: submission.notes,
        createdById: reviewer.id,
        coverages: {
          create: buildMonthlyCoverageRows(resident.id, coveredMonths, submission.amountSen, existingCoverageMap),
        },
      },
    });

    // For special collection payments, update the assignment record
    if (submission.paymentType === "SPECIAL_COLLECTION" && submission.specialCollectionId) {
      await tx.specialCollectionAssignment.updateMany({
        where: {
          residentId: resident.id,
          specialCollectionId: submission.specialCollectionId,
        },
        data: {
          amountPaid: {
            increment: submission.amountSen,
          },
        },
      });
    }

    await tx.upload.updateMany({
      where: { submissionId: submission.id },
      data: { paymentId: payment.id },
    });

    await tx.publicPaymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: "APPROVED",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "PublicPaymentSubmission",
        entityId: submission.id,
        action: "APPROVE",
        beforeJson: JSON.stringify({ status: submission.status }),
        afterJson: JSON.stringify({ status: "APPROVED", paymentId: payment.id }),
        createdBy: reviewer.id,
      },
    });
  });

  revalidatePath("/dashboard");
}

export async function rejectSubmission(submissionId: string) {
  const reviewer = await assertDashboardUser();

  await prisma.$transaction(async (tx) => {
    const submission = await tx.publicPaymentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.status !== "PENDING_REVIEW") {
      return;
    }

    await tx.publicPaymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: "REJECTED",
        reviewReason: "Rejected from dashboard review queue.",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "PublicPaymentSubmission",
        entityId: submission.id,
        action: "REJECT",
        beforeJson: JSON.stringify({ status: submission.status }),
        afterJson: JSON.stringify({ status: "REJECTED" }),
        createdBy: reviewer.id,
      },
    });
  });

  revalidatePath("/dashboard");
}