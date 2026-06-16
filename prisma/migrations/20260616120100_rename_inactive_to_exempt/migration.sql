-- Rename INACTIVE status to EXEMPT in existing resident records
UPDATE "Resident" SET "status" = 'EXEMPT' WHERE "status" = 'INACTIVE';
