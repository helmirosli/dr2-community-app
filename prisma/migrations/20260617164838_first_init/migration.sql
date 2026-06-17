/*
  Warnings:

  - The `status` column on the `PaymentCoverage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `PublicPaymentSubmission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Resident` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `SpecialCollection` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `SpecialCollectionAssignment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `paymentType` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `method` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentType` on the `PublicPaymentSubmission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `method` on the `PublicPaymentSubmission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('ACTIVE', 'EXEMPT', 'FOR_SALE', 'MOVED_OUT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AJK', 'VIEWER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('MONTHLY_FEE', 'SPECIAL_COLLECTION');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'DUITNOW_QR', 'EWALLET', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "CoverageStatus" AS ENUM ('PAID', 'PARTIAL', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "SpecialCollectionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FeePlan" ALTER COLUMN "effectiveFrom" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "effectiveTo" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paymentType",
ADD COLUMN     "paymentType" "PaymentType" NOT NULL,
ALTER COLUMN "paymentDate" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "method",
ADD COLUMN     "method" "PaymentMethod" NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentCoverage" DROP COLUMN "status",
ADD COLUMN     "status" "CoverageStatus" NOT NULL DEFAULT 'PAID',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PublicPaymentSubmission" DROP COLUMN "paymentType",
ADD COLUMN     "paymentType" "PaymentType" NOT NULL,
ALTER COLUMN "paymentDate" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "method",
ADD COLUMN     "method" "PaymentMethod" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ALTER COLUMN "reviewedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "status",
ADD COLUMN     "status" "ResidentStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SpecialCollection" ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "eventStartDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "eventEndDate" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "SpecialCollectionStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SpecialCollectionAssignment" DROP COLUMN "status",
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Upload" ALTER COLUMN "uploadedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'AJK',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");

-- CreateIndex
CREATE INDEX "PublicPaymentSubmission_status_createdAt_idx" ON "PublicPaymentSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");
