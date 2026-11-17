-- Link each special-collection payment to the collection it was for.
ALTER TABLE "Payment" ADD COLUMN "specialCollectionId" TEXT;

CREATE INDEX "Payment_specialCollectionId_idx" ON "Payment"("specialCollectionId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_specialCollectionId_fkey" FOREIGN KEY ("specialCollectionId") REFERENCES "SpecialCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill 1 (exact): payments created by approving a public submission. The approval's audit
-- entry stores the paymentId, and the submission stores the collection.
UPDATE "Payment" p
SET "specialCollectionId" = s."specialCollectionId"
FROM "AuditLog" a
JOIN "PublicPaymentSubmission" s ON s.id = a."entityId"
WHERE a."entityType" = 'PublicPaymentSubmission'
  AND a.action = 'APPROVE'
  AND (a."afterJson"::json ->> 'paymentId') = p.id
  AND p."paymentType" = 'SPECIAL_COLLECTION'
  AND s."specialCollectionId" IS NOT NULL
  AND p."specialCollectionId" IS NULL;

-- Backfill 2 (unambiguous only): admin-recorded special payments for a house assigned to exactly
-- one collection. Anything else stays unlinked rather than guessed.
UPDATE "Payment" p
SET "specialCollectionId" = only_one."specialCollectionId"
FROM (
  SELECT "residentId", min("specialCollectionId") AS "specialCollectionId"
  FROM "SpecialCollectionAssignment"
  GROUP BY "residentId"
  HAVING count(*) = 1
) only_one
WHERE only_one."residentId" = p."residentId"
  AND p."paymentType" = 'SPECIAL_COLLECTION'
  AND p."specialCollectionId" IS NULL;
