-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "streetBlock" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "FeePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "effectiveFrom" TIMESTAMP NOT NULL,
    "effectiveTo" TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AJK',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP NOT NULL,
    "method" TEXT NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "Payment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentCoverage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "feePlanId" TEXT,
    "amountApplied" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentCoverage_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentCoverage_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentCoverage_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecialCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountPerResident" INTEGER NOT NULL,
    "dueDate" TIMESTAMP,
    "eventStartDate" TIMESTAMP,
    "eventEndDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "SpecialCollectionAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialCollectionId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "SpecialCollectionAssignment_specialCollectionId_fkey" FOREIGN KEY ("specialCollectionId") REFERENCES "SpecialCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpecialCollectionAssignment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicPaymentSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitNumber" TEXT NOT NULL,
    "residentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP NOT NULL,
    "method" TEXT NOT NULL,
    "coverageStartYear" INTEGER NOT NULL,
    "coverageStartMonth" INTEGER NOT NULL,
    "coverageEndYear" INTEGER NOT NULL,
    "coverageEndMonth" INTEGER NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicPaymentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT,
    "submissionId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PublicPaymentSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);


-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdBy" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Resident_unitNumber_key" ON "Resident"("unitNumber");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");

-- CreateIndex
CREATE INDEX "Resident_streetBlock_idx" ON "Resident"("streetBlock");

-- CreateIndex
CREATE INDEX "Payment_residentId_paymentDate_idx" ON "Payment"("residentId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");

-- CreateIndex
CREATE INDEX "PaymentCoverage_residentId_year_month_idx" ON "PaymentCoverage"("residentId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCoverage_residentId_year_month_paymentId_key" ON "PaymentCoverage"("residentId", "year", "month", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialCollectionAssignment_specialCollectionId_residentId_key" ON "SpecialCollectionAssignment"("specialCollectionId", "residentId");

-- CreateIndex
CREATE INDEX "PublicPaymentSubmission_status_createdAt_idx" ON "PublicPaymentSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PublicPaymentSubmission_unitNumber_idx" ON "PublicPaymentSubmission"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
