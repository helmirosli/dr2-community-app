"use server";

import { revalidatePath } from "next/cache";

import { assertDashboardUser } from "@/lib/auth";
import { expandMonthRange } from "@/lib/months";
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

    const resident = await tx.resident.upsert({
      where: { unitNumber: submission.unitNumber },
      update: {
        name: submission.residentName,
        phone: submission.phone,
        status: "ACTIVE",
      },
      create: {
        unitNumber: submission.unitNumber,
        name: submission.residentName,
        phone: submission.phone,
        status: "ACTIVE",
      },
    });

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
      const duplicateCoverage = await tx.paymentCoverage.findFirst({
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
        },
      });

      if (duplicateCoverage) {
        await tx.publicPaymentSubmission.update({
          where: { id: submission.id },
          data: {
            status: "REJECTED",
            reviewReason: `Duplicate official coverage for ${duplicateCoverage.month}/${duplicateCoverage.year}.`,
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
            afterJson: JSON.stringify({ status: "REJECTED", duplicateCoverage }),
            createdBy: reviewer.id,
          },
        });

        return;
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
          create: buildMonthlyCoverageRows(resident.id, coveredMonths, submission.amountSen),
        },
      },
    });

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