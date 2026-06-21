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

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "streetBlock" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "status" "ResidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AJK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCoverage" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "payment" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "resident" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "feePlanId" TEXT,
    "feePlan" TEXT,
    "amountApplied" INTEGER NOT NULL,
    "status" "CoverageStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialCollection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountPerResident" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "eventStartDate" TIMESTAMP(3),
    "eventEndDate" TIMESTAMP(3),
    "status" "SpecialCollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialCollectionAssignment" (
    "id" TEXT NOT NULL,
    "specialCollectionId" TEXT NOT NULL,
    "specialCollection" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "resident" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialCollectionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPaymentSubmission" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "residentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "coverageStartYear" INTEGER NOT NULL,
    "coverageStartMonth" INTEGER NOT NULL,
    "coverageEndYear" INTEGER NOT NULL,
    "coverageEndMonth" INTEGER NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewReason" TEXT,
    "reviewedById" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicPaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "payment" TEXT,
    "submissionId" TEXT,
    "submission" TEXT,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "contentHash" TEXT,
    "storagePath" TEXT NOT NULL,
    "url" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdBy" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "resident" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentVehicle" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "resident" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT,
    "plateNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantVehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT,
    "plateNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resident_unitNumber_key" ON "Resident"("unitNumber");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");

-- CreateIndex
CREATE INDEX "Resident_streetBlock_idx" ON "Resident"("streetBlock");

-- CreateIndex
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");

-- CreateIndex
CREATE INDEX "PublicPaymentSubmission_status_createdAt_idx" ON "PublicPaymentSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PublicPaymentSubmission_unitNumber_idx" ON "PublicPaymentSubmission"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCoverage" ADD CONSTRAINT "PaymentCoverage_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCoverage" ADD CONSTRAINT "PaymentCoverage_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCoverage" ADD CONSTRAINT "PaymentCoverage_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialCollectionAssignment" ADD CONSTRAINT "SpecialCollectionAssignment_specialCollectionId_fkey" FOREIGN KEY ("specialCollectionId") REFERENCES "SpecialCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialCollectionAssignment" ADD CONSTRAINT "SpecialCollectionAssignment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicPaymentSubmission" ADD CONSTRAINT "PublicPaymentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PublicPaymentSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentVehicle" ADD CONSTRAINT "ResidentVehicle_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantVehicle" ADD CONSTRAINT "TenantVehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
